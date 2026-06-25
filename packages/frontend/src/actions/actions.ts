import type { CommandContext } from "@caido/sdk-frontend";
import { createApp, h } from "vue";

import NoteFloatModal from "@/components/shared/NoteFloatModal.vue";
import NoteSearchModal from "@/components/shared/NoteSearchModal.vue";
import { SDKPlugin } from "@/plugins/sdk";
import { useNotesStore } from "@/stores/notes";
import type { FrontendSDK } from "@/types";
import {
  addBlockToContent,
  addParagraphToContent,
  createSavedItemMention,
  createTextParagraph,
} from "@/utils/noteUtils";

/**
 * Adds a single saved-item mention (request or response) to the
 * currently open note, sharing the "no note open" guard and
 * success/error toasts across all the save-to-note actions below.
 */
const addSavedItemToNote = async (
  sdk: FrontendSDK,
  savedItemId: string,
  label: string | undefined,
  successNoun: string,
) => {
  const notesStore = useNotesStore();

  if (!notesStore.currentNotePath) {
    sdk.window.showToast(
      "No note is currently open. Please open a note first.",
      { variant: "warning" },
    );
    return;
  }

  await notesStore.loadNote(notesStore.currentNotePath);

  if (!notesStore.currentNote) {
    return;
  }

  const updatedContent = addBlockToContent(
    notesStore.currentNote.content,
    createSavedItemMention(savedItemId, label),
  );

  await notesStore.updateNoteContent(
    notesStore.currentNotePath,
    updatedContent,
  );

  sdk.window.showToast(
    `${successNoun} added to note ${notesStore.currentNotePath}`,
    { variant: "success" },
  );

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

      for (const req of ctx.requests) {
        const result = await sdk.backend.saveRequest(req.id, "history");
        if (result.kind === "Error") {
          sdk.window.showToast(`Error saving request: ${result.error}`, {
            variant: "error",
          });
          continue;
        }

        await addSavedItemToNote(sdk, result.value.id, req.path, "Request");
      }
      return;
    }

    if (ctx.type === "RequestContext") {
      // Capture the session this request currently lives in. Used below
      // either way: for a sent request, also captures the session's name
      // *right now* so double-click can later check whether it still
      // represents the same request before reopening it; for a draft,
      // there's no separate static/live distinction to reconcile by name
      // — the session IS the draft, so only the ID is needed.
      const currentSession = sdk.replay.getCurrentSession();

      if (ctx.request.type !== "RequestFull") {
        // An unsent draft has no Request.id yet — Caido has never
        // created a row for it — but it does have raw text and
        // connection info right here, which is enough to save a static
        // snapshot directly instead of a reference to re-fetch later.
        const result = await sdk.backend.saveDraftRequest(
          ctx.request.raw,
          ctx.request.host,
          ctx.request.port,
          ctx.request.isTls,
          undefined,
          currentSession?.id,
        );
        if (result.kind === "Error") {
          sdk.window.showToast(`Error saving request: ${result.error}`, {
            variant: "error",
          });
          return;
        }

        await addSavedItemToNote(
          sdk,
          result.value.id,
          ctx.request.path,
          "Request",
        );
        return;
      }

      const result = await sdk.backend.saveRequest(
        ctx.request.id,
        "replay",
        undefined,
        currentSession?.id,
        currentSession?.name,
      );
      if (result.kind === "Error") {
        sdk.window.showToast(`Error saving request: ${result.error}`, {
          variant: "error",
        });
        return;
      }

      await addSavedItemToNote(
        sdk,
        result.value.id,
        ctx.request.path,
        "Request",
      );
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

    const result = await sdk.backend.saveResponse(
      ctx.response.id,
      ctx.request.id,
      "history",
    );

    if (result.kind === "Error") {
      sdk.window.showToast(`Error saving response: ${result.error}`, {
        variant: "error",
      });
      return;
    }

    await addSavedItemToNote(
      sdk,
      result.value.id,
      ctx.request.path,
      "Response",
    );
  } catch (error) {
    sdk.window.showToast(`Error saving response to note: ${error}`, {
      variant: "error",
    });
  }
};
