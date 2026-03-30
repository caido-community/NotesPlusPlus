import type { Folder, Note, NoteContent } from "shared";
import { computed, ref } from "vue";

import { useDraggable } from "@/composables/useDraggable";
import { useSDK } from "@/plugins/sdk";
import { useNotesRepository } from "@/repositories/notes";
import { useNotesStore } from "@/stores/notes";
import type { ModalPosition } from "@/types";

interface SearchModalOptions {
  initialPosition?: ModalPosition;
  onClose?: () => void;
}

export function useSearchModal(options: SearchModalOptions = {}) {
  const notesStore = useNotesStore();
  const repository = useNotesRepository();
  const sdk = useSDK();

  const { position, size, startDrag, startResize } = useDraggable({
    initialPosition: options.initialPosition,
    initialSize: { width: 500, height: 400 },
    minWidth: 300,
    minHeight: 250,
  });

  const searchQuery = ref("");
  const searchResults = ref<Note[]>([]);
  const selectedIndex = ref(0);
  const viewedNote = ref<Note | undefined>(undefined);
  const isLoading = ref(false);

  const isViewingNote = computed(() => viewedNote.value !== undefined);

  async function search(query: string) {
    searchQuery.value = query;
    selectedIndex.value = 0;

    if (!query.trim()) {
      await loadAllNotes();
      return;
    }

    try {
      const results = await notesStore.searchNotes(query);
      searchResults.value = results;
    } catch {
      searchResults.value = [];
    }
  }

  async function loadAllNotes() {
    if (!notesStore.tree) {
      await notesStore.initialize();
    }

    const notes: Note[] = [];
    const collectNotes = (folder: Folder) => {
      if (!folder?.children) return;
      for (const child of folder.children) {
        if (child.type === "note") {
          notes.push(child as Note);
        } else if (child.type === "folder") {
          collectNotes(child as Folder);
        }
      }
    };

    if (notesStore.tree) {
      collectNotes(notesStore.tree);
    }
    searchResults.value = notes;
  }

  let savedSearchSize = { width: 500, height: 400 };

  async function openNote(notePath: string) {
    isLoading.value = true;
    try {
      const note = await repository.getNote(notePath);
      if (note) {
        savedSearchSize = { width: size.width, height: size.height };
        viewedNote.value = note;

        const viewWidth = Math.max(700, size.width);
        const viewHeight = Math.max(500, size.height);
        const dx = viewWidth - size.width;
        const dy = viewHeight - size.height;
        size.width = viewWidth;
        size.height = viewHeight;
        position.x = Math.max(0, position.x - dx / 2);
        position.y = Math.max(0, position.y - dy / 2);
      }
    } catch (error) {
      sdk.window.showToast(`Error loading note: ${error}`, {
        variant: "error",
      });
    } finally {
      isLoading.value = false;
    }
  }

  async function goBackToSearch() {
    viewedNote.value = undefined;
    searchQuery.value = "";

    const dx = size.width - savedSearchSize.width;
    const dy = size.height - savedSearchSize.height;
    size.width = savedSearchSize.width;
    size.height = savedSearchSize.height;
    position.x = position.x + dx / 2;
    position.y = position.y + dy / 2;

    await notesStore.refreshTree();
    await loadAllNotes();
  }

  async function saveNoteContent(content: NoteContent) {
    if (!viewedNote.value) return;

    try {
      await repository.updateNote(viewedNote.value.path, { content });
      viewedNote.value.content = content;

      if (notesStore.currentNotePath === viewedNote.value.path) {
        await notesStore.refreshTree();
        await notesStore.loadNote(viewedNote.value.path);
      }
    } catch (error) {
      sdk.window.showToast(`Error saving note: ${error}`, {
        variant: "error",
      });
    }
  }

  function close() {
    options.onClose?.();
  }

  function moveSelection(direction: 1 | -1) {
    const newIndex = selectedIndex.value + direction;
    if (newIndex >= 0 && newIndex < searchResults.value.length) {
      selectedIndex.value = newIndex;
    }
  }

  async function openSelectedNote() {
    const note = searchResults.value[selectedIndex.value];
    if (note) {
      await openNote(note.path);
    }
  }

  async function initialize() {
    if (!notesStore.tree) {
      await notesStore.initialize();
    }
    await loadAllNotes();
  }

  return {
    position,
    size,
    searchQuery,
    searchResults,
    selectedIndex,
    viewedNote,
    isViewingNote,
    isLoading,
    startDrag,
    startResize,
    search,
    openNote,
    goBackToSearch,
    saveNoteContent,
    close,
    moveSelection,
    openSelectedNote,
    initialize,
  };
}
