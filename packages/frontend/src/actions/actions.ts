import type { CommandContext } from "@caido/sdk-frontend";
import type { SavedItem } from "shared";
import { createApp, h } from "vue";

import NoteFloatModal from "@/components/shared/NoteFloatModal.vue";
import NoteSearchModal from "@/components/shared/NoteSearchModal.vue";
import { SDKPlugin } from "@/plugins/sdk";
import { useNotesStore } from "@/stores/notes";
import type { ActiveEntryWithRaw, FrontendSDK } from "@/types";
import { decodeRawBlob } from "@/utils/httpEncoding";
import {
  addParagraphToContent,
  createDraftSavedItem,
  createSavedItem,
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
 * Builds a SavedItem from the currently active Replay session.
 * Works for both sent requests and unsent drafts, and optionally their
 * associated response via activeEntry.request.response.id.
 * Returns undefined if there's no active session or entry.
 */
export async function currentSelectedRequestData(
  sdk: FrontendSDK,
  kind: "request" | "response" = "request",
): Promise<SavedItem | undefined> {
  const currentSession = sdk.replay.getCurrentSession();
  if (!currentSession) return undefined;

  const sessionResponse = await sdk.graphql.replaySessionEntries({
    id: currentSession.id,
  });
  const activeEntryId = sessionResponse?.replaySession?.activeEntry?.id;
  if (!activeEntryId) return undefined;

  const activeEntry = sessionResponse?.replaySession?.activeEntry;
  const entry = sdk.replay.getEntry(activeEntryId);

  if (kind === "response") {
    const responseId = activeEntry?.request?.response?.id;
    const requestId = activeEntry?.request?.id ?? entry.requestId;
    if (!responseId || !requestId) return undefined;

    return createSavedItem({
      kind: "response",
      refId: responseId,
      parentRequestId: requestId,
      sourceKind: "replay",
      session: currentSession,
      label: activeEntry?.request?.path,
    });
  }

  if (!entry.requestId) {
    const connection = activeEntry?.connection;
    if (typeof connection?.host !== "string") return undefined;

    return createDraftSavedItem({
      request: {
        raw: decodeRawBlob(
          (activeEntry as unknown as ActiveEntryWithRaw)?.raw ?? "",
        ),
        host: connection.host,
        port: connection.port,
        isTLS: connection.isTLS,
      },
      session: currentSession,
    });
  }

  return createSavedItem({
    kind: "request",
    refId: entry.requestId,
    sourceKind: "replay",
    session: currentSession,
  });
}

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
        { variant: "success" },
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
 * Saves a request to the currently open note.
 *
 * Works from any context:
 * - "RequestRowContext": Search, HTTP History, and Sitemap rows.
 * - "RequestContext": a Replay pane with a sent or draft request.
 * - "BaseContext": falls back to the currently active Replay session.
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
          createSavedItemMention(
            createSavedItem({
              kind: "request",
              refId: req.id,
              sourceKind: "history",
              label: req.path,
            }),
          ),
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
      const currentSession = sdk.replay.getCurrentSession();

      if (ctx.request.type !== "RequestFull") {
        await addSavedItemToNote(
          sdk,
          createDraftSavedItem({
            request: ctx.request,
            session: currentSession ?? undefined,
          }),
        );
        return;
      }

      await addSavedItemToNote(
        sdk,
        createSavedItem({
          kind: "request",
          refId: ctx.request.id,
          sourceKind: "replay",
          session: currentSession ?? undefined,
          label: ctx.request.path,
        }),
      );
      return;
    }

    // BaseContext — only attempt Replay fallback when on the Replay page.
    if (window.location.hash === "#/replay") {
      const saved = await currentSelectedRequestData(sdk, "request");
      if (saved) {
        await addSavedItemToNote(sdk, saved);
        return;
      }
    } else {
      sdk.window.showToast("This action can only be used on a replay page", {
        variant: "warning",
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
 * Saves a response to the currently open note.
 *
 * Works from any context:
 * - "ResponseContext": right-click on a response pane.
 * - "BaseContext": falls back to the active Replay session's response
 *   via activeEntry.request.response.id, only when on the Replay page.
 */
export const saveResponseToNote = async (
  sdk: FrontendSDK,
  ctx: CommandContext,
) => {
  try {
    if (ctx.type === "ResponseContext") {
      await addSavedItemToNote(
        sdk,
        createSavedItem({
          kind: "response",
          refId: ctx.response.id,
          parentRequestId: ctx.request.id,
          sourceKind: window.location.hash === "#/replay" ? "replay" : "history",
          label: ctx.request.path,
        }),
      );
      return;
    }

    // BaseContext — only attempt Replay fallback when on the Replay page.
    if (window.location.hash === "#/replay") {
      const saved = await currentSelectedRequestData(sdk, "response");
      if (saved) {
        await addSavedItemToNote(sdk, saved);
        return;
      }
    } else {
      sdk.window.showToast("This action can only be used on a replay page", {
        variant: "warning",
      });
      return;
    }


    sdk.window.showToast("No response available to save", {
      variant: "warning",
    });
  } catch (error) {
    sdk.window.showToast(`Error saving response to note: ${error}`, {
      variant: "error",
    });
  }
};