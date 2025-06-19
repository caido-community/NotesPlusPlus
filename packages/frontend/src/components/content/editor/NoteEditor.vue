<template>
  <div class="editor-container">
    <editor-content
      :editor="editor"
      spellcheck="false"
      autocorrect="off"
      autocapitalize="off"
      class="editor-wrapper"
    />
    <SearchUI v-if="editor" :editor="editor" />
  </div>
</template>
<script setup lang="ts">
import { Image as ImageExtension } from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extension-placeholder";
import { type Slice } from "@tiptap/pm/model";
import { type EditorView } from "@tiptap/pm/view";
import { StarterKit } from "@tiptap/starter-kit";
import { type Editor, EditorContent, useEditor } from "@tiptap/vue-3";
import { useDebounceFn } from "@vueuse/core";
import { type NoteContent } from "shared";
import { onMounted, watch } from "vue";

import "./editor.css";
import { ArrowKeysFix } from "./extensions/arrows-fix";
import { MarkdownHeading } from "./extensions/markdown-heading";
import MarkdownStyling from "./extensions/markdown-styling";
import { createSessionMention } from "./extensions/mentions/mention-request";
import createSuggestion from "./extensions/mentions/suggestion";
import { Search } from "./extensions/search";
import SearchUI from "./extensions/search/SearchUI.vue";

import { useSDK } from "@/plugins/sdk";
import { useNotesStore } from "@/stores/notes";
import { compressImage } from "@/utils/images";

const sdk = useSDK();
const notesStore = useNotesStore();
const suggestion = createSuggestion(sdk);
const SessionMention = createSessionMention(sdk);

const MAX_IMAGE_SIZE_MB = 30;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif"];

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
    // @ts-expect-error - TipTap expects null for clientRect but we can't do it due to eslint rules
    SessionMention.configure({ suggestion }),
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
  ],
  editorProps: {
    attributes: {
      class:
        "mx-auto focus:outline-none font-mono dark:text-surface-100",
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
});

watch(
  () => notesStore.currentNote,
  (newNote) => {
    if (editor.value && newNote) {
      const content = newNote.content;
      editor.value.commands.setContent(content);
      editor.value.commands.focus("end");
    }
  },
  { immediate: true },
);

onMounted(() => {
  if (editor.value && notesStore.currentNote) {
    const content = notesStore.currentNote.content;
    editor.value.commands.setContent(content);
    editor.value.commands.focus("end");
  }
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
