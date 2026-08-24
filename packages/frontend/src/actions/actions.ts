import type { CommandContext } from "@caido/sdk-frontend";
import type { SavedItem } from "shared";
import { createApp, h } from "vue";

import NoteFloatModal from "@/components/shared/NoteFloatModal.vue";
import NoteSearchModal from "@/components/shared/NoteSearchModal.vue";
import { SDKPlugin } from "@/plugins/sdk";
import { useNotesStore } from "@/stores/notes";
import type { FrontendSDK } from "@/types";
import {
  addParagraphToContent,
  createSavedItemMention,
  createTextParagraph,
} from "@/utils/noteUtils";

/**
 * Adds a saved-item mention (request or response) to the currently open
 * note, sharing the "no note open" guard and success toast across the
 * save-to-note actions below. `item` is a complete `SavedItem`, appended
 * directly into the note's JSON content on the backend.
 */
const addSavedItemToNote = async (sdk: FrontendSDK, item: SavedItem) => {
  const notesStore = useNotesStore();
  const notePath = notesStore.currentNotePath;

  if (!notePath) {
    sdk.window.showToast(
      "No note is currently open. Please open a note first.",
      { variant: "warning" },
    );
    return;
  }

  const result = await notesStore.appendBlockToNote(
    notePath,
    createSavedItemMention(item),
  );

  if (!result) {
    return;
  }

  const successNoun = item.kind === "response" ? "Response" : "Request";
  sdk.window.showToast(`${successNoun} added to note ${notePath}`, {
    variant: "success",
  });

  await notesStore.refreshTree();
};

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
 * Shows the search modal for finding and viewing existing notes
 */
export const showSearchModal = (sdk: FrontendSDK) => {
  const modalContainer = document.createElement("div");
  modalContainer.id = "note-search-modal-container";
  document.body.appendChild(modalContainer);

  const position = {
    x: Math.max(0, window.innerWidth / 2 - 250),
    y: Math.max(0, window.innerHeight / 2 - 200),
  };

  const modalApp = createApp({
    render: () =>
      h(NoteSearchModal, {
        initialPosition: position,
        onClose: () => {
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
 * Saves a request (from a request-table row, or a Replay pane after the
 * request has actually been sent) to the currently open note.
 *
 * Works from any context where a request row or request pane provides a
 * real, persisted request ID:
 * - "RequestRowContext": Search, HTTP History, and Sitemap rows all share
 *   the same underlying Request IDs, so this is the canonical "history" case.
 * - "RequestContext": a Replay pane. If the request hasn't been sent yet
 *   (still a "RequestDraft", with no ID at all), there is nothing to save
 *   and we say so.
 */
export const saveRequestToNote = async (
  sdk: FrontendSDK,
  ctx: CommandContext,
) => {
  try {
    if (ctx.type === "RequestRowContext") {
      if (ctx.requests.length === 0) {
        sdk.window.showToast("No request selected", { variant: "warning" });
        return;
      }

      const notesStore = useNotesStore();
      const notePath = notesStore.currentNotePath;

      if (!notePath) {
        sdk.window.showToast(
          "No note is currently open. Please open a note first.",
          { variant: "warning" },
        );
        return;
      }

      for (const req of ctx.requests) {
        await notesStore.appendBlockToNote(
          notePath,
          createSavedItemMention({
            kind: "request",
            refId: req.id,
            sourceKind: "history",
            label: req.path,
          }),
        );
      }

      const count = ctx.requests.length;
      sdk.window.showToast(
        `${count} request${count > 1 ? "s" : ""} added to note`,
        { variant: "success" },
      );

      await notesStore.refreshTree();
      return;
    }

    if (ctx.type === "RequestContext") {
      // Captured so double-click can later check whether the live
      // session still represents this request before reopening it.
      const currentSession = sdk.replay.getCurrentSession();

      if (ctx.request.type !== "RequestFull") {
        // An unsent draft has no Request.id yet, but has raw text and
        // connection info, which is enough to save a static snapshot.
        await addSavedItemToNote(sdk, {
          kind: "request",
          refId: "",
          sourceKind: "draft",
          draftRaw: ctx.request.raw,
          draftHost: ctx.request.host,
          draftPort: ctx.request.port,
          draftIsTls: ctx.request.isTls,
          replaySessionId: currentSession?.id,
          label: ctx.request.path,
        });
        return;
      }

      await addSavedItemToNote(sdk, {
        kind: "request",
        refId: ctx.request.id,
        sourceKind: "replay",
        replaySessionId: currentSession?.id,
        sessionLabel: currentSession?.name,
        label: ctx.request.path,
      });
      return;
    }

    sdk.window.showToast("No request available to save", {
      variant: "warning",
    });
  } catch (error) {
    sdk.window.showToast(`Error saving request to note: ${error}`, {
      variant: "error",
    });
  }
};

/**
 * Saves a response (from a response pane) to the currently open note.
 *
 * A response pane always corresponds to an already-sent request, so both
 * IDs are real and persisted by the time this runs — there's no "draft"
 * case to guard against here, unlike saving a request from Replay.
 */
export const saveResponseToNote = async (
  sdk: FrontendSDK,
  ctx: CommandContext,
) => {
  try {
    if (ctx.type !== "ResponseContext") {
      sdk.window.showToast("No response available to save", {
        variant: "warning",
      });
      return;
    }

    await addSavedItemToNote(sdk, {
      kind: "response",
      refId: ctx.response.id,
      parentRequestId: ctx.request.id,
      sourceKind: window.location.hash === "#/replay" ? "replay" : "history",
      label: ctx.request.path,
    });
  } catch (error) {
    sdk.window.showToast(`Error saving response to note: ${error}`, {
      variant: "error",
    });
  }
};