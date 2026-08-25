<template>
  <div class="editor-container">
    <editor-content
      :editor="editor"
      spellcheck="false"
      autocorrect="off"
      autocapitalize="off"
      class="editor-wrapper"
    />
    <TableMenu v-if="editor" :editor="editor" />
    <SearchUI v-if="editor" :editor="editor" />
  </div>
</template>
<script setup lang="ts">
import { Image as ImageExtension } from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import { type Slice } from "@tiptap/pm/model";
import { type EditorView } from "@tiptap/pm/view";
import { StarterKit } from "@tiptap/starter-kit";
import { type Editor, EditorContent, useEditor } from "@tiptap/vue-3";
import { useDebounceFn } from "@vueuse/core";
import { type NoteContent } from "shared";
import { onMounted, onUnmounted, watch } from "vue";

import "./editor.css";
import { ArrowKeysFix } from "./extensions/arrows-fix";
import { MarkdownHeading } from "./extensions/markdown-heading";
import MarkdownStyling from "./extensions/markdown-styling";
import { createFileMention } from "./extensions/mentions/mention-file";
import { createSessionMention } from "./extensions/mentions/mention-request";
import { createSavedItemMention } from "./extensions/mentions/mention-saved-item";
import { ReminderNode } from "./extensions/reminder-node";
import { Search } from "./extensions/search";
import SearchUI from "./extensions/search/SearchUI.vue";
import { SlashCommands } from "./extensions/slash-commands";
import { showReminderPicker } from "./reminders/showReminderPicker";
import TableMenu from "./TableMenu.vue";

import { useSDK } from "@/plugins/sdk";
import { useContextMenuStore } from "@/stores/contextMenu";
import { useNotesStore } from "@/stores/notes";
import { useRemindersStore } from "@/stores/reminders";
import { emitter } from "@/utils/eventBus";
import { compressImage } from "@/utils/images";

const sdk = useSDK();
const notesStore = useNotesStore();
const contextMenuStore = useContextMenuStore();
const remindersStore = useRemindersStore();
const FileMention = createFileMention(sdk);
const SavedItemMention = createSavedItemMention(sdk);
const SessionMention = createSessionMention(sdk);

const MAX_IMAGE_SIZE_MB = 30;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif"];

const cursorPositions = new Map<string, { from: number; to: number }>();

const saveCursorPosition = () => {
  if (!editor.value || !notesStore.currentNotePath) return;

  const { from, to } = editor.value.state.selection;
  cursorPositions.set(notesStore.currentNotePath, { from, to });
};

const restoreCursorPosition = (notePath: string) => {
  if (!editor.value) return;

  const savedPosition = cursorPositions.get(notePath);
  if (savedPosition) {
    const docLength = editor.value.state.doc.content.size;
    const from = Math.min(savedPosition.from, docLength);
    const to = Math.min(savedPosition.to, docLength);

    editor.value.commands.setTextSelection({ from, to });
  }

  editor.value.view.focus();
};

const restoreFocus = () => {
  if (!editor.value || !notesStore.currentNotePath) return;

  editor.value.view.focus();

  const savedPosition = cursorPositions.get(notesStore.currentNotePath);
  if (savedPosition) {
    const docLength = editor.value.state.doc.content.size;
    const from = Math.min(savedPosition.from, docLength);
    const to = Math.min(savedPosition.to, docLength);
    editor.value.commands.setTextSelection({ from, to });
  }
};

const saveNote = async (editor: Editor) => {
  if (!notesStore.currentNote) return;

  notesStore.isSaving = true;

  try {
    const content = editor.getJSON();
    await sdk.backend.updateNote(notesStore.currentNote.path, {
      content: content as NoteContent,
    });

    notesStore.currentNote.content = content as NoteContent;
  } catch (error) {
    console.error("Failed to save note:", error);
    sdk.window.showToast(`Failed to save note: ${String(error)}`, {
      variant: "error",
    });
  } finally {
    notesStore.isSaving = false;
  }
};

const debouncedSave = useDebounceFn(saveNote, 250);

const processAndInsertImage = async (
  file: File,
  view: EditorView,
  pos: number,
): Promise<boolean> => {
  if (!file) return false;

  const filesize = (file.size / 1024 / 1024).toFixed(4);
  if (
    !ALLOWED_IMAGE_TYPES.includes(file.type) ||
    parseFloat(filesize) >= MAX_IMAGE_SIZE_MB
  ) {
    sdk.window.showToast(
      `Images need to be in jpg, png or gif format and less than ${MAX_IMAGE_SIZE_MB}mb in size.`,
      {
        variant: "error",
      },
    );
    return false;
  }

  try {
    const compressedDataURI = await compressImage(file);
    const { schema } = view.state;

    const node = schema?.nodes?.image?.create({
      src: compressedDataURI,
    });
    if (!node) return false;

    const transaction = view.state.tr.insert(pos, node);
    view.dispatch(transaction);
    return true;
  } catch (error) {
    sdk.window.showToast("Failed to insert image", {
      variant: "error",
    });
    return false;
  }
};

const editor = useEditor({
  content: "",
  extensions: [
    ArrowKeysFix,
    StarterKit.configure({
      heading: false,
    }),
    MarkdownHeading,
    SessionMention,
    MarkdownStyling,
    Search.configure({
      searchResultClass: "search-result",
      disableRegex: true,
    }),
    Placeholder.configure({
      placeholder: "Write something...",
    }),
    ImageExtension.configure({
      HTMLAttributes: {
        class: "caido-image",
      },
    }),
    Table.configure({
      resizable: true,
      HTMLAttributes: {
        class: "notes-table",
      },
    }),
    TableRow,
    TableHeader,
    TableCell,
    FileMention,
    SavedItemMention,
    ReminderNode,
    SlashCommands.configure({ sdk }),
  ],
  editorProps: {
    attributes: {
      class: "mx-auto focus:outline-none font-mono dark:text-surface-100",
    },
    handleDOMEvents: {
      contextmenu: (view: EditorView, event: MouseEvent) => {
        const { from, to } = view.state.selection;
        if (from === to) return false;

        event.preventDefault();
        const selectedText = view.state.doc.textBetween(from, to, " ");

        contextMenuStore.showContextMenu(event, [
          {
            label: "Set Reminder",
            icon: "fas fa-bell",
            command: () => {
              emitter.emit("openReminderPicker", {
                selectedText,
                position: { x: event.clientX, y: event.clientY },
                selectionRange: { from, to },
              });
            },
          },
        ]);

        return true;
      },
    },
    handleDrop: (
      view: EditorView,
      event: DragEvent,
      slice: Slice,
      moved: boolean,
    ): boolean => {
      if (!moved && event.dataTransfer?.files?.length) {
        const file = event.dataTransfer.files[0];
        const coordinates = view.posAtCoords({
          left: event.clientX,
          top: event.clientY,
        });

        if (file && coordinates?.pos) {
          processAndInsertImage(file, view, coordinates.pos);
          return true;
        }
      }
      return false;
    },
    handlePaste: (
      view: EditorView,
      event: ClipboardEvent,
      slice: Slice,
    ): boolean => {
      if (event.clipboardData?.files?.length) {
        const file = event.clipboardData.files[0];
        if (file) {
          processAndInsertImage(file, view, view.state.selection.anchor);
          return true;
        }
      }

      const items = event.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i]?.type?.indexOf("image") !== -1) {
            const file = items[i]?.getAsFile();
            if (file) {
              processAndInsertImage(file, view, view.state.selection.anchor);
              return true;
            }
          }
        }
      }

      return false;
    },
  },
  onUpdate: ({ editor }) => {
    if (notesStore.currentNote) {
      debouncedSave(editor as Editor);
    }
  },
  onBlur: () => {
    saveCursorPosition();
  },
});

let previousNotePath: string | undefined;

watch(
  () => notesStore.currentNote,
  (newNote, oldNote) => {
    if (previousNotePath && editor.value) {
      const { from, to } = editor.value.state.selection;
      cursorPositions.set(previousNotePath, { from, to });
    }

    if (editor.value && newNote) {
      editor.value.storage.reminderNode.isContentReplacement = true;
      editor.value.commands.setContent(newNote.content);
      editor.value.storage.reminderNode.isContentReplacement = false;
      restoreCursorPosition(newNote.path);
    }

    previousNotePath = newNote?.path;
  },
  { immediate: true },
);

const handleCancelReminder = (data: { id: string }) => {
  remindersStore.deleteReminder(data.id);
};

const handleOpenReminderPicker = (data: {
  selectedText: string;
  position: { x: number; y: number };
  selectionRange: { from: number; to: number };
}) => {
  showReminderPicker(data.position, async (reminderAt: Date) => {
    if (!notesStore.currentNotePath || !editor.value) return;

    const reminder = await remindersStore.createReminder(
      notesStore.currentNotePath,
      data.selectedText,
      reminderAt.toISOString(),
    );

    if (reminder) {
      editor.value
        .chain()
        .focus()
        .setTextSelection(data.selectionRange.to)
        .insertContent({
          type: "reminderNode",
          attrs: {
            id: reminder.id,
            reminderAt: reminder.reminderAt,
            context: data.selectedText,
          },
        })
        .run();
    }
  });
};

onMounted(() => {
  if (editor.value && notesStore.currentNote) {
    editor.value.storage.reminderNode.isContentReplacement = true;
    editor.value.commands.setContent(notesStore.currentNote.content);
    editor.value.storage.reminderNode.isContentReplacement = false;
    restoreCursorPosition(notesStore.currentNote.path);
  }

  emitter.on("restoreFocus", restoreFocus);
  emitter.on("openReminderPicker", handleOpenReminderPicker);
  emitter.on("cancelReminder", handleCancelReminder);
});

onUnmounted(() => {
  saveCursorPosition();
  emitter.off("restoreFocus", restoreFocus);
  emitter.off("openReminderPicker", handleOpenReminderPicker);
  emitter.off("cancelReminder", handleCancelReminder);
});
</script>

<style>
.editor-container {
  position: relative;
  height: 100%;
}

.editor-wrapper {
  height: 100%;
}
</style>