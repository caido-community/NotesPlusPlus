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
  buildSavedItemBlock,
  createDraftSavedItem,
  createSavedItem,
  createTextParagraph,
} from "@/utils/noteUtils";
import { captureCurrentReplay } from "@/utils/savedItem";

// ---------------------------------------------------------------------------
// Pinia host-app row extraction
// ---------------------------------------------------------------------------

/**
 * Vue attaches `__vue_app__` to the host DOM element at runtime.
 */
declare global {
  interface Element {
    __vue_app__?: {
      config?: { globalProperties?: Record<string, unknown> };
      _context?: { provides?: Record<string, unknown> };
    };
  }
}

interface PiniaHistoryEdge {
  node?: {
    id?: string | number;
    path?: string;
    response?: { id?: string | number };
    request?: {
      id?: string | number;
      path?: string;
      response?: { id?: string | number };
    };
  };
}

interface PiniaSitemapRequest {
  id?: string | number;
  path?: string;
  response?: { id?: string | number };
}

/**
 * Normalized shape we extract from whichever tab's pinia store is active.
 * Everything downstream only needs these four fields.
 */
interface SelectedRow {
  requestId: string;
  responseId: string | undefined;
  path: string | undefined;
  /** Maps directly to SavedItem sourceKind */
  sourceKind: "history" | "replay";
}

function getHostPinia(): unknown {
  const el = document.querySelector("#app");
  return (
    el?.__vue_app__?.config?.globalProperties?.["$pinia"] ??
    el?.__vue_app__?._context?.provides?.["pinia"] ??
    undefined
  );
}

/**
 * Reads selected rows from the correct Pinia store for the current page and
 * normalizes them into SelectedRow objects.
 */
function getPiniaSelectedRows(): SelectedRow[] {
  const pinia = getHostPinia();
  if (!pinia || typeof pinia !== "object") return [];

  const pinaObj = pinia as Record<string, unknown>;
  const stateValue = (
    pinaObj["state"] as Record<string, unknown> | undefined
  )?.["value"];
  const state: Record<string, unknown> =
    stateValue != null && typeof stateValue === "object"
      ? (stateValue as Record<string, unknown>)
      : {};
  const hash = window.location.hash;

  if (hash === "#/http-history") {
    const historyState = state["stores.http-history.state"];
    const selectedRows =
      historyState != null && typeof historyState === "object"
        ? ((historyState as Record<string, unknown>)["selectedRows"] ?? [])
        : [];
    const raw: unknown[] = [
      ...(Array.isArray(selectedRows) ? selectedRows : []),
    ];
    return raw.flatMap((item) => {
      const edge = item as PiniaHistoryEdge;
      const req = edge?.node?.request;
      if (!req?.id) return [];
      return [
        {
          requestId: String(req.id),
          responseId:
            req.response?.id != null ? String(req.response.id) : undefined,
          path: req.path ?? undefined,
          sourceKind: "history" as const,
        },
      ];
    });
  }

  if (hash === "#/search") {
    const searchState = state["stores.search.state"];
    const searchRows =
      searchState != null && typeof searchState === "object"
        ? ((searchState as Record<string, unknown>)["selectedRows"] ?? [])
        : [];
    const raw: unknown[] = [...(Array.isArray(searchRows) ? searchRows : [])];
    return raw.flatMap((item) => {
      const edge = item as PiniaHistoryEdge;
      const node = edge?.node;
      if (!node?.id) return [];
      return [
        {
          requestId: String(node.id),
          responseId:
            node.response?.id != null ? String(node.response.id) : undefined,
          path: node.path ?? undefined,
          sourceKind: "history" as const,
        },
      ];
    });
  }

  if (hash === "#/sitemap") {
    const sitemapState = state["stores.sitemap.state"];
    const selectedRequests =
      sitemapState != null && typeof sitemapState === "object"
        ? ((sitemapState as Record<string, unknown>)["selectedRequests"] ?? [])
        : [];
    const raw: unknown[] = [
      ...(Array.isArray(selectedRequests) ? selectedRequests : []),
    ];
    return raw.flatMap((item) => {
      const req = item as PiniaSitemapRequest;
      if (!req?.id) return [];
      return [
        {
          requestId: String(req.id),
          responseId:
            req.response?.id != null ? String(req.response.id) : undefined,
          path: req.path ?? undefined,
          sourceKind: "history" as const,
        },
      ];
    });
  }

  return [];
}

/**
 * Appends saved items to the open note as one batch, so a multi-row
 * selection produces a single toast and a single tree refresh.
 */
const addSavedItemsToNote = async (sdk: FrontendSDK, items: SavedItem[]) => {
  if (items.length === 0) return;

  const notesStore = useNotesStore();
  const notePath = notesStore.currentNotePath;

  if (!notePath) {
    sdk.window.showToast(
      "No note is currently open. Please open a note first.",
      { variant: "warning" },
    );
    return;
  }

  for (const item of items) {
    const result = await notesStore.appendBlockToNote(
      notePath,
      buildSavedItemBlock(item),
    );
    if (!result) return;
  }

  const noun = items[0]?.kind === "response" ? "response" : "request";
  const label = items.length > 1 ? `${items.length} ${noun}s` : `1 ${noun}`;
  sdk.window.showToast(`${label} added to note ${notePath}`, {
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
        onSave: (_data: { content: string; attachContext: boolean }) => {
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
 * Context priority:
 *   1. "RequestRowContext"  — right-click row menu on any tab (SDK provides IDs directly)
 *   2. "RequestContext"     — Replay pane request/draft
 *   3. "BaseContext"        — Command Palette:
 *        • #/replay         → active Replay session (existing behaviour)
 *        • #/http-history,
 *          #/search,
 *          #/sitemap        → Pinia selectedRows workaround
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

      await addSavedItemsToNote(
        sdk,
        ctx.requests.map((req) =>
          createSavedItem({
            kind: "request",
            refId: req.id,
            sourceKind: "history",
            label: req.path,
          }),
        ),
      );
      return;
    }

    if (ctx.type === "RequestContext") {
      const currentSession = sdk.replay.getCurrentSession() ?? undefined;

      const item =
        ctx.request.type === "RequestFull"
          ? createSavedItem({
              kind: "request",
              refId: ctx.request.id,
              sourceKind: "replay",
              session: currentSession,
              label: ctx.request.path,
            })
          : createDraftSavedItem({
              request: ctx.request,
              session: currentSession,
            });

      await addSavedItemsToNote(sdk, [item]);
      return;
    }

    const hash = window.location.hash;

    if (hash === "#/replay") {
      const saved = await captureCurrentReplay(sdk, "request");
      if (!saved) {
        sdk.window.showToast("No request available to save", {
          variant: "warning",
        });
        return;
      }

      await addSavedItemsToNote(sdk, [saved]);
      return;
    }

    if (
      hash === "#/http-history" ||
      hash === "#/search" ||
      hash === "#/sitemap"
    ) {
      const rows = getPiniaSelectedRows();

      if (rows.length === 0) {
        sdk.window.showToast(
          "No request selected. Select one or more rows in the table first.",
          { variant: "warning" },
        );
        return;
      }

      await addSavedItemsToNote(
        sdk,
        rows.map((row) =>
          createSavedItem({
            kind: "request",
            refId: row.requestId,
            sourceKind: row.sourceKind,
            label: row.path,
          }),
        ),
      );
      return;
    }

    sdk.window.showToast("This action is not available on the current page.", {
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
 * Context priority:
 *   1. "ResponseContext"    — right-click response pane (SDK provides IDs directly)
 *   2. "BaseContext"        — Command Palette:
 *        • #/replay         → active Replay session response (existing behaviour)
 *        • #/http-history,
 *          #/search,
 *          #/sitemap        → Pinia selectedRows workaround
 */
export const saveResponseToNote = async (
  sdk: FrontendSDK,
  ctx: CommandContext,
) => {
  try {
    const hash = window.location.hash;

    if (ctx.type === "ResponseContext") {
      await addSavedItemsToNote(sdk, [
        createSavedItem({
          kind: "response",
          refId: ctx.response.id,
          parentRequestId: ctx.request.id,
          sourceKind: hash === "#/replay" ? "replay" : "history",
          label: ctx.request.path,
        }),
      ]);
      return;
    }

    if (hash === "#/replay") {
      const saved = await captureCurrentReplay(sdk, "response");
      if (!saved) {
        sdk.window.showToast("No response available to save", {
          variant: "warning",
        });
        return;
      }

      await addSavedItemsToNote(sdk, [saved]);
      return;
    }

    if (
      hash === "#/http-history" ||
      hash === "#/search" ||
      hash === "#/sitemap"
    ) {
      const rows = getPiniaSelectedRows();

      if (rows.length === 0) {
        sdk.window.showToast(
          "No request selected. Select one or more rows in the table first.",
          { variant: "warning" },
        );
        return;
      }

      const saved = rows.flatMap((row) =>
        row.responseId === undefined
          ? []
          : [
              createSavedItem({
                kind: "response",
                refId: row.responseId,
                parentRequestId: row.requestId,
                sourceKind: row.sourceKind,
                label: row.path,
              }),
            ],
      );

      if (saved.length === 0) {
        sdk.window.showToast(
          "The selected request(s) have no recorded response.",
          { variant: "warning" },
        );
        return;
      }

      await addSavedItemsToNote(sdk, saved);
      return;
    }

    sdk.window.showToast("This action is not available on the current page.", {
      variant: "warning",
    });
  } catch (error) {
    sdk.window.showToast(`Error saving response to note: ${error}`, {
      variant: "error",
    });
  }
};
