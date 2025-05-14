import type { Folder, Note, NoteContentItem, NoteModalSaveData } from "shared";
import { computed, reactive, ref, watch } from "vue";

import { useSDK } from "@/plugins/sdk";
import { useNotesStore } from "@/stores/notes";
import { currentReplayTabData } from "@/utils/caido";
import {
  addParagraphToContent,
  createMention,
  createNoteContentWithText,
  createTextParagraph,
} from "@/utils/noteUtils";

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

interface NoteModalOptions {
  initialPosition?: Position;
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

  const position = reactive<Position>({
    x: options.initialPosition?.x || 100,
    y: options.initialPosition?.y || 100,
  });

  const size = reactive<Size>({
    width: 400,
    height: 150,
  });

  let isDragging = false;
  let isResizing = false;
  let dragOffset = { x: 0, y: 0 };

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

  function startDrag(event: MouseEvent) {
    if (
      (event.target as Element).closest(".resize-handle") ||
      (event.target as Element).closest("select")
    )
      return;

    isDragging = true;
    dragOffset = {
      x: event.clientX - position.x,
      y: event.clientY - position.y,
    };

    document.addEventListener("mousemove", handleDrag);
    document.addEventListener("mouseup", stopDrag);
  }

  function handleDrag(event: MouseEvent) {
    if (isDragging) {
      position.x = event.clientX - dragOffset.x;
      position.y = event.clientY - dragOffset.y;
    }
  }

  function stopDrag() {
    isDragging = false;
    document.removeEventListener("mousemove", handleDrag);
    document.removeEventListener("mouseup", stopDrag);
  }

  function startResize(event: MouseEvent) {
    isResizing = true;
    event.preventDefault();
    document.addEventListener("mousemove", handleResize);
    document.addEventListener("mouseup", stopResize);
  }

  function handleResize(event: MouseEvent) {
    if (isResizing) {
      const newWidth = event.clientX - position.x;
      const newHeight = event.clientY - position.y;
      size.width = Math.max(200, newWidth);
      size.height = Math.max(150, newHeight);
    }
  }

  function stopResize() {
    isResizing = false;
    document.removeEventListener("mousemove", handleResize);
    document.removeEventListener("mouseup", stopResize);
  }

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
