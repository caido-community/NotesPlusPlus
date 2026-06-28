import { mergeAttributes, Node } from "@tiptap/core";
import type { SavedItem } from "shared";

import { type FrontendSDK } from "@/types";
import { emitter } from "@/utils/eventBus";
import { decodeRawBlob } from "@/utils/httpEncoding";
import { setEditorContentWhenReady } from "@/utils/nativeEditor";

const styleId = "embedded-saved-item-style";
if (!document.getElementById(styleId)) {
  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    .embedded-saved-item {
      display: block;
      overflow: hidden;
      margin: 12px 0;
      border: 2px solid var(--color-surface-600, #444);
      border-radius: 6px;
      cursor: pointer;
      width: 100%;
      min-height: 50px;
      max-height: 300px;
      position: relative;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transition: box-shadow 0.2s ease, border-color 0.2s ease;
    }
    .embedded-saved-item:hover {
      border-color: var(--color-primary-500, #6366f1);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }
    .embedded-saved-item-label {
      position: absolute;
      top: 4px;
      right: 4px;
      background: var(--color-surface-800, #262626);
      color: var(--color-surface-200, #e5e5e5);
      font-size: 12px;
      padding: 3px 8px;
      border-radius: 4px;
      z-index: 10;
      font-weight: 500;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      cursor: pointer;
      transition: background 0.2s ease, color 0.2s ease;
      pointer-events: none;
    }
    .embedded-saved-item:hover .embedded-saved-item-label {
      background: var(--color-primary-500, #6366f1);
      color: var(--color-surface-100, #fff);
    }
    .embedded-saved-item-content {
      width: 100%;
      height: 300px;
      overflow: hidden;
    }
    .embedded-saved-item-content .cm-editor {
      height: 100%;
    }
    .embedded-saved-item-content .cm-scroller {
      overflow: auto;
    }
    /* Real native editor, not read-only — overlay below blocks typing
       while still letting dblclick and selection through. */
    .embedded-saved-item-overlay {
      position: absolute;
      inset: 0;
      z-index: 5;
      cursor: pointer;
    }
    .embedded-saved-item-missing {
      color: #ff4d4f;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      background-color: rgba(255, 77, 79, 0.1);
      border-radius: 4px;
      margin: 8px 0;
    }
  `;
  document.head.appendChild(style);
}

function sourceKindLabel(sourceKind: string): string {
  if (sourceKind === "replay") return "Replay";
  if (sourceKind === "draft") return "Unsent Draft";
  return "History";
}

function kindLabel(kind: string): string {
  return kind === "response" ? "Response" : "Request";
}

/**
 * Replay sessions default to a plain incrementing number as their name
 * (e.g. "1", "2") — this treats a label as meaningful only if it has at
 * least one non-numeric character, to tell a real label apart from an
 * unrenamed default.
 */
function isMeaningfulSessionLabel(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  return Number.isNaN(Number(trimmed));
}

/**
 * Node for a saved reference to a request or response, captured from
 * Search, HTTP History, Sitemap, or a Replay pane.
 *
 * Renders using Caido's own `sdk.ui.httpRequestEditor()` /
 * `httpResponseEditor()`, with a transparent overlay absorbing clicks
 * since that editor has no read-only flag.
 *
 * The displayed content is always the static snapshot captured at save
 * time. Double-click reopens the original live Replay session if it
 * still exists with the same name, otherwise it creates a fresh session
 * seeded from the snapshot.
 */
export const createSavedItemMention = (sdk: FrontendSDK) => {
  return Node.create({
    name: "savedItemMention",
    group: "block",
    atom: true,

    addAttributes() {
      return {
        kind: { default: "request" },
        refId: { default: "" },
        parentRequestId: { default: undefined },
        sourceKind: { default: "history" },
        replaySessionId: { default: undefined },
        sessionLabel: { default: undefined },
        draftRaw: { default: undefined },
        draftHost: { default: undefined },
        draftPort: { default: undefined },
        draftIsTls: { default: undefined },
        label: { default: "" },
      };
    },

    parseHTML() {
      return [{ tag: "div[data-saved-item-mention]" }];
    },

    renderHTML({ HTMLAttributes }) {
      return [
        "div",
        mergeAttributes({ "data-saved-item-mention": "" }, HTMLAttributes),
      ];
    },

    addNodeView() {
      return (node) => {
        const item = node.node.attrs as SavedItem;
        const { label } = item;

        const container = document.createElement("div");
        container.className = "embedded-saved-item";
        container.contentEditable = "false";

        const labelEl = document.createElement("div");
        labelEl.className = "embedded-saved-item-label";
        labelEl.textContent = "Loading...";
        container.appendChild(labelEl);

        const contentWrapper = document.createElement("div");
        contentWrapper.className = "embedded-saved-item-content";
        container.appendChild(contentWrapper);

        // Absorbs clicks so the native editor never receives focus, while
        // dblclick still bubbles up to the replay handler below.
        const overlay = document.createElement("div");
        overlay.className = "embedded-saved-item-overlay";
        container.appendChild(overlay);

        // Tracks what double-click should do: replay an existing,
        // already-sent request by ID, or recreate an unsent draft from
        // its raw text + connection info.
        let replayRequestId: string | undefined;
        let draftConnection:
          | { host: string; port: number; isTls: boolean }
          | undefined;
        // Reused for the "Raw" session-creation fallback so double-click
        // never needs to re-fetch.
        let currentRawText: string | undefined;

        // Only set for requests saved from a Replay pane, used to prefer
        // reopening the live session if it still matches.
        let savedReplaySessionId: string | undefined;
        let savedSessionLabel: string | undefined;

        const showMissing = (kind: string) => {
          contentWrapper.innerHTML = `<div class="embedded-saved-item-missing">
            <i class="fas fa-exclamation-circle" style="font-size: 16px;"></i>
            <span>This ${kindLabel(kind).toLowerCase()} is no longer available</span>
          </div>`;
        };

        const loadSavedItem = async (savedItem: SavedItem): Promise<void> => {
          try {
            const result = await sdk.backend.getSavedItem(savedItem);

            if (result.kind === "Error") {
              labelEl.textContent = "Unavailable";
              showMissing("item");
              return;
            }

            const resolved = result.value;

            if (!resolved.found) {
              labelEl.textContent = "Unavailable";
              showMissing("item");
              return;
            }

            replayRequestId = resolved.requestId || undefined;
            draftConnection = resolved.draftConnection;
            savedReplaySessionId = resolved.replaySessionId;
            savedSessionLabel = resolved.sessionLabel;

            // Drafts are plain text (never passed through GraphQL); only
            // "history"/"replay" items need Base64 decoding.
            currentRawText =
              resolved.sourceKind === "draft"
                ? resolved.raw
                : decodeRawBlob(resolved.raw);

            labelEl.textContent = `${kindLabel(resolved.kind)} (${sourceKindLabel(resolved.sourceKind)})${label ? `: ${label}` : ""}`;

            contentWrapper.innerHTML = "";

            const editor =
              resolved.kind === "response"
                ? sdk.ui.httpResponseEditor()
                : sdk.ui.httpRequestEditor();
            const element = editor.getElement();
            element.style.width = "100%";
            element.style.height = "100%";
            contentWrapper.appendChild(element);

            setEditorContentWhenReady(editor, currentRawText);
          } catch (err) {
            console.error("Error fetching saved item:", err);
            labelEl.textContent = "Unavailable";
            showMissing("item");
          }
        };

        loadSavedItem(item);

        emitter.on("refreshEditors", () => {
          loadSavedItem(item);
        });

        overlay.addEventListener("dblclick", async () => {
          if (!replayRequestId && !draftConnection) {
            sdk.window.showToast("This item is no longer available", {
              variant: "warning",
            });
            return;
          }

          // For a draft, the session IS the draft — reopen by ID alone.
          if (draftConnection && savedReplaySessionId && isMeaningfulSessionLabel(savedSessionLabel)) {
            const existingDraftSession = sdk.replay
              .getSessions()
              .find((s) => s.id === savedReplaySessionId);

            if (existingDraftSession) {
              sdk.replay.openTab(existingDraftSession.id);
              sdk.navigation.goTo("/replay");
              return;
            }
          }

          // Reopen the original live session if it still exists and its
          // current name still matches what was captured at save time.
          // Otherwise fall back to a fresh session below.
          if (
            savedReplaySessionId &&
            isMeaningfulSessionLabel(savedSessionLabel)
          ) {
            const existingSession = sdk.replay
              .getSessions()
              .find((s) => s.id === savedReplaySessionId);

            if (
              existingSession &&
              isMeaningfulSessionLabel(existingSession.name) &&
              existingSession.name === savedSessionLabel
            ) {
              sdk.replay.openTab(existingSession.id);
              sdk.navigation.goTo("/replay");
              return;
            }
          }

          // Create a fresh Replay session from the static snapshot.
          // createSession() returns void; the created session arrives
          // via onSessionCreate instead.
          let sessionCreateSub: ReturnType<typeof sdk.replay.onSessionCreate> | undefined;
          try {
            sessionCreateSub = sdk.replay.onSessionCreate((event) => {
              sessionCreateSub?.stop();
              sdk.replay.openTab(event.session.id);
              sdk.navigation.goTo("/replay");
            });

            if (draftConnection) {
              if (!currentRawText) {
                sessionCreateSub.stop();
                sdk.window.showToast("This item is no longer available", {
                  variant: "warning",
                });
                return;
              }

              await sdk.replay.createSession({
                type: "Raw",
                raw: currentRawText,
                connectionInfo: {
                  host: draftConnection.host,
                  port: draftConnection.port,
                  isTLS: draftConnection.isTls,
                },
              });
            } else if (replayRequestId) {
              await sdk.replay.createSession({
                type: "ID",
                id: replayRequestId,
              });
            } else {
              sessionCreateSub.stop();
            }
          } catch (err) {
            sessionCreateSub?.stop();
            console.error("Error creating replay session:", err);
            sdk.window.showToast("Couldn't open this in Replay", {
              variant: "error",
            });
          }
        });

        return {
          dom: container,
          destroy: () => {
            emitter.off("refreshEditors");
          },
        };
      };
    },
  });
};