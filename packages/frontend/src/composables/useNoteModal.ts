import type {
  Folder,
  Note,
  NoteContent,
  NoteContentItem,
  NoteModalSaveData,
  SavedItem,
} from "shared";
import { computed, ref, watch } from "vue";

import { useDraggable } from "@/composables/useDraggable";
import { useSDK } from "@/plugins/sdk";
import { useNotesStore } from "@/stores/notes";
import type { ActiveEntryWithRaw, ModalPosition } from "@/types";
import { decodeRawBlob } from "@/utils/httpEncoding";
import {
  addBlockToContent,
  createSavedItemMention,
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

  /**
   * If a Replay session is currently open, builds a static snapshot of
   * its active entry's request (same mechanism as "Save Request to
   * Note"), capturing the session ID/name for later match-or-reopen.
   *
   * Returns undefined if there's no active session/entry/request to
   * save — callers fall back to plain text in that case.
   */
  async function trySaveCurrentReplayRequest(): Promise<SavedItem | undefined> {
    const currentSession = sdk.replay.getCurrentSession();
    if (!currentSession) return undefined;

    const sessionResponse = await sdk.graphql.replaySessionEntries({
      id: currentSession.id,
    });
    const activeEntryId = sessionResponse?.replaySession?.activeEntry?.id;
    if (!activeEntryId) return undefined;

    const activeEntry = sessionResponse?.replaySession?.activeEntry;
    const entry = sdk.replay.getEntry(activeEntryId);

    if (!entry.requestId) {
      // Unsent draft — capture the raw text and connection info directly,
      // the same way the `@`-trigger and "Save Request to Note" do.
      const connection = activeEntry?.connection;
      if (typeof connection?.host !== "string") return undefined;

      return {
        kind: "request",
        refId: "",
        sourceKind: "draft",
        draftRaw: decodeRawBlob(
          (activeEntry as unknown as ActiveEntryWithRaw)?.raw ?? "",
        ),
        draftHost: connection.host,
        draftPort: connection.port,
        draftIsTls: connection.isTLS,
        replaySessionId: currentSession.id,
        sessionLabel: currentSession.name,
      };
    }

    return {
      kind: "request",
      refId: entry.requestId,
      sourceKind: "replay",
      replaySessionId: currentSession.id,
      sessionLabel: currentSession.name,
    };
  }

  async function save() {
    if (!noteContent.value.trim()) {
      close();
      return;
    }

    // The text is always its own paragraph. The saved item, if any, is a
    // separate sibling block — `savedItemMention` is `group: "block"`, so
    // nesting it inside the paragraph's content (alongside the text
    // nodes) produces an invalid document that ProseMirror silently
    // drops or "repairs" rather than erroring on.
    const blocks: NoteContentItem[] = [createTextParagraph(noteContent.value)];

    if (attachContext.value && isReplayPage.value) {
      try {
        const saved = await trySaveCurrentReplayRequest();
        if (saved) {
          blocks.push(createSavedItemMention(saved));
        } else {
          sdk.window.showToast("No active replay session found", {
            variant: "warning",
          });
        }
      } catch (err) {
        console.error("Error saving replay request to note:", err);
      }
    }

    let updatedNotePath = null;

    if (selectedNotePath.value) {
      await notesStore.loadNote(selectedNotePath.value);

      if (notesStore.currentNote) {
        let updatedContent = notesStore.currentNote.content;
        for (const block of blocks) {
          updatedContent = addBlockToContent(updatedContent, block);
        }

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
      const noteData: NoteContent = { type: "doc", content: blocks };

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
