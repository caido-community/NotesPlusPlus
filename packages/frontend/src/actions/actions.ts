import { type NoteContentItem } from "shared";
import { createApp, h } from "vue";

import NoteFloatModal from "@/components/shared/NoteFloatModal.vue";
import { SDKPlugin } from "@/plugins/sdk";
import { useNotesStore } from "@/stores/notes";
import type { FrontendSDK } from "@/types";
import { currentReplayTabData } from "@/utils/caido";
import {
  addParagraphToContent,
  createMention,
  createTextParagraph,
} from "@/utils/noteUtils";

/**
 * Shows the note modal for writing a new note
 */
export const showNoteModal = (sdk: FrontendSDK) => {
  const modalContainer = document.createElement("div");
  modalContainer.id = "note-modal-container";
  document.body.appendChild(modalContainer);

  const position = {
    x: Math.max(0, window.innerWidth / 2 - 200),
    y: Math.max(0, window.innerHeight / 2 - 150),
  };

  const modalApp = createApp({
    render: () =>
      h(NoteFloatModal, {
        initialPosition: position,
        onClose: () => {
          modalApp.unmount();
          modalContainer.remove();
        },
        onSave: (data: { content: string; attachContext: boolean }) => {
          modalApp.unmount();
          modalContainer.remove();
        },
      }),
  });

  modalApp.use(SDKPlugin, sdk);
  modalApp.mount(modalContainer);
};

/**
 * Sends selected text to the currently open note
 */
export const sendSelectedTextToNote = async (sdk: FrontendSDK) => {
  const notesStore = useNotesStore();
  const selectedText = sdk.window.getActiveEditor()?.getSelectedText() || "";

  if (!selectedText) {
    sdk.window.showToast("No text selected", { variant: "warning" });
    return;
  }

  if (!notesStore.currentNotePath) {
    sdk.window.showToast(
      "No note is currently open. Please open a note first.",
      { variant: "warning" },
    );
    return;
  }

  try {
    await notesStore.loadNote(notesStore.currentNotePath);

    if (notesStore.currentNote) {
      const paragraph = createTextParagraph(selectedText);
      const updatedContent = addParagraphToContent(
        notesStore.currentNote.content,
        paragraph,
      );

      await notesStore.updateNoteContent(
        notesStore.currentNotePath,
        updatedContent,
      );

      sdk.window.showToast(
        `Selected text added to note ${notesStore.currentNotePath}`,
        {
          variant: "success",
        },
      );

      await notesStore.refreshTree();
    }
  } catch (error) {
    sdk.window.showToast(`Error adding text to note: ${error}`, {
      variant: "error",
    });
  }
};

/**
 * Sends the replay session to the currently open note
 */
export const sendReplaySessionToNote = async (sdk: FrontendSDK) => {
  const notesStore = useNotesStore();

  if (!notesStore.currentNotePath) {
    sdk.window.showToast(
      "No note is currently open. Please open a note first.",
      { variant: "warning" },
    );
    return;
  }

  const isReplayPage = window.location.hash === "#/replay";
  if (!isReplayPage) {
    sdk.window.showToast("This action can only be used on a replay page", {
      variant: "warning",
    });
    return;
  }

  try {
    await notesStore.loadNote(notesStore.currentNotePath);

    if (notesStore.currentNote) {
      const tabData = currentReplayTabData();

      if (!tabData.id) {
        sdk.window.showToast("No active replay session found", {
          variant: "warning",
        });
        return;
      }

      const contentItems: NoteContentItem[] = [
        createMention(tabData.id, tabData.label || tabData.id),
      ];

      const paragraph = {
        type: "paragraph",
        content: contentItems,
      };

      const updatedContent = addParagraphToContent(
        notesStore.currentNote.content,
        paragraph,
      );

      await notesStore.updateNoteContent(
        notesStore.currentNotePath,
        updatedContent,
      );

      sdk.window.showToast(
        `Replay session added to note ${notesStore.currentNotePath}`,
        { variant: "success" },
      );

      await notesStore.refreshTree();
    }
  } catch (error) {
    sdk.window.showToast(`Error adding replay session to note: ${error}`, {
      variant: "error",
    });
  }
};
