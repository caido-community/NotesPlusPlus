import type { Folder, Note, NoteContentItem, NoteModalSaveData } from "shared";
import { computed, ref, watch } from "vue";

import { useDraggable } from "@/composables/useDraggable";
import { useSDK } from "@/plugins/sdk";
import { useNotesStore } from "@/stores/notes";
import type { ModalPosition } from "@/types";
import { currentReplayTabData } from "@/utils/caido";
import {
  addParagraphToContent,
  createMention,
  createNoteContentWithText,
  createTextParagraph,
} from "@/utils/noteUtils";

interface NoteModalOptions {
  initialPosition?: ModalPosition;
  onClose?: () => void;
  onSave?: (data: NoteModalSaveData) => void;
}

export function useNoteModal(options: NoteModalOptions = {}) {
  const notesStore = useNotesStore();
  const sdk = useSDK();
  const noteContent = ref("");
  const attachContext = ref(true);
  const selectedNotePath = ref("");
  const textarea = ref<HTMLTextAreaElement | undefined>(undefined);
  const isReplayPage = computed(() => window.location.hash === "#/replay");

  const { position, size, startDrag, startResize } = useDraggable({
    initialPosition: options.initialPosition,
    initialSize: { width: 400, height: 150 },
  });

  const availableNotes = computed(() => {
    if (!notesStore.tree) return [];

    const notes: Note[] = [];

    const collectNotes = (folder: Folder) => {
      if (!folder || !folder.children) return;

      for (const child of folder.children) {
        if (child.type === "note") {
          notes.push(child as Note);
        } else if (child.type === "folder") {
          collectNotes(child as Folder);
        }
      }
    };

    collectNotes(notesStore.tree);
    return notes;
  });

  function close() {
    options.onClose?.();
  }

  async function save() {
    if (!noteContent.value.trim()) {
      close();
      return;
    }

    let paragraph = createTextParagraph(noteContent.value);

    if (attachContext.value && isReplayPage.value) {
      const tabData = currentReplayTabData();
      if (tabData.id) {
        const contentItems: NoteContentItem[] = [
          { type: "text", text: noteContent.value },
          { type: "text", text: "\n" },
          createMention(tabData.id, tabData.label || tabData.id),
        ];

        paragraph = {
          type: "paragraph",
          content: contentItems,
        };
      }
    }

    let updatedNotePath = null;

    if (selectedNotePath.value) {
      await notesStore.loadNote(selectedNotePath.value);

      if (notesStore.currentNote) {
        const updatedContent = addParagraphToContent(
          notesStore.currentNote.content,
          paragraph,
        );

        notesStore.selectNote(selectedNotePath.value);
        await notesStore.updateNoteContent(
          selectedNotePath.value,
          updatedContent,
        );
        updatedNotePath = selectedNotePath.value;
        sdk.window.showToast("Note updated successfully");
      }
    } else {
      const rootPath = "/";
      const noteData = createNoteContentWithText(noteContent.value);

      const newNote = await notesStore.createNote(
        rootPath,
        undefined,
        noteData,
      );
      if (newNote) {
        updatedNotePath = newNote.path;
        sdk.window.showToast("New note created successfully");
        notesStore.selectNote(updatedNotePath);
      }
    }

    await notesStore.refreshTree();

    if (updatedNotePath && notesStore.currentNotePath === updatedNotePath) {
      await notesStore.loadNote(updatedNotePath);
    }

    options.onSave?.({
      content: noteContent.value,
      attachContext: attachContext.value,
      notePath: selectedNotePath.value,
    });

    close();
  }

  async function initialize() {
    if (!notesStore.tree) {
      await notesStore.initialize();
    }

    if (notesStore.currentNotePath) {
      selectedNotePath.value = notesStore.currentNotePath;
    }
  }

  watch(selectedNotePath, (newPath) => {
    if (!newPath) {
      noteContent.value = "";
    }
  });

  return {
    position,
    size,
    noteContent,
    attachContext,
    selectedNotePath,
    availableNotes,
    textarea,
    isReplayPage,
    startDrag,
    startResize,
    close,
    save,
    initialize,
  };
}
