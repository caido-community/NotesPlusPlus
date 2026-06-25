import { mergeAttributes, Node } from "@tiptap/core";

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
    /* This is Caido's real native editor, not a read-only widget — the
       overlay below blocks typing/pasting while still letting clicks
       through so double-click-to-replay and text selection both work. */
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
 * Replay sessions are named with a plain incrementing number by default
 * (e.g. "1", "2", "3"), and `typeof "1" === "string"` — so checking the
 * type alone isn't enough to tell a real, user-given label apart from an
 * unrenamed default. This requires at least one non-numeric character,
 * after trimming, before treating a label as meaningful enough to match
 * against.
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
 * `httpResponseEditor()` — the same native, syntax-highlighted component
 * Caido itself uses in Replay — rather than a generic CodeMirror instance.
 * That editor has no built-in read-only flag, so a transparent overlay
 * absorbs clicks instead of letting them reach the editor: this blocks
 * typing while still allowing double-click, since nothing in this note is
 * ever read back out of the editor or saved.
 *
 * What's *displayed* is always the static, immutable request snapshot
 * (the underlying `Request.id`, captured at save time) — it never changes
 * even if the request is later edited in Replay. Double-click is where
 * the two paths diverge: if this was saved from a Replay pane and that
 * same live session still exists with the same name, double-click reopens
 * it directly (picking up any edits since); otherwise it creates a fresh
 * Replay session seeded from the static snapshot instead.
 */
export const createSavedItemMention = (sdk: FrontendSDK) => {
  return Node.create({
    name: "savedItemMention",
    group: "block",
    atom: true,

    addAttributes() {
      return {
        id: { default: "" },
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
        const { id, label } = node.node.attrs;

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

        // Absorbs clicks so the underlying native editor never receives
        // focus/keystrokes, while a "dblclick" still bubbles up from it
        // to trigger the replay handler below.
        const overlay = document.createElement("div");
        overlay.className = "embedded-saved-item-overlay";
        container.appendChild(overlay);

        // Tracks what double-click should do: replay an existing,
        // already-sent request by ID, or recreate an unsent draft from
        // its raw text + connection info. Exactly one of these is set
        // once the saved item resolves successfully (or neither, if the
        // underlying request/response is missing) — that's what
        // distinguishes "no longer available" from "nothing to do yet".
        let replayRequestId: string | undefined;
        let draftConnection:
          | { host: string; port: number; isTls: boolean }
          | undefined;
        // The decoded raw text currently shown, reused for the "Raw"
        // session-creation fallback so double-click never needs to
        // re-fetch — this is exactly what's already on screen.
        let currentRawText: string | undefined;

        // Only set for requests saved from a Replay pane. If the live
        // session still exists AND its current name still matches what it
        // was at save time, double-click reopens that session directly
        // instead of starting a fresh one from the static snapshot.
        let savedReplaySessionId: string | undefined;
        let savedSessionLabel: string | undefined;

        const showMissing = (kind: string) => {
          contentWrapper.innerHTML = `<div class="embedded-saved-item-missing">
            <i class="fas fa-exclamation-circle" style="font-size: 16px;"></i>
            <span>This ${kindLabel(kind).toLowerCase()} is no longer available</span>
          </div>`;
        };

        const loadSavedItem = async (savedItemId: string): Promise<void> => {
          try {
            const result = await sdk.backend.getSavedItem(savedItemId);

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

            // Drafts are stored as plain text (straight from the SDK's
            // RequestDraft.raw, never passed through GraphQL) — only
            // "history"/"replay" items go through GraphQL's `Blob`
            // scalar and actually need Base64 decoding.
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

        loadSavedItem(id);

        emitter.on("refreshEditors", () => {
          loadSavedItem(id);
        });

        overlay.addEventListener("dblclick", async () => {
          if (!replayRequestId && !draftConnection) {
            sdk.window.showToast("This item is no longer available", {
              variant: "warning",
            });
            return;
          }

          // For a draft, the session IS the draft — there's no separate
          // static snapshot it could have diverged from, so reopening it
          // by ID alone (no name match needed) is always correct as long
          // as the session still exists.
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

          // Prefer reopening the original live session, but only if it
          // still exists AND its current name is a real, meaningful label
          // (not just an unrenamed default like "1" or "2") that still
          // matches what was captured at save time — that's our signal
          // the session still represents "the same" request, even if its
          // content has since been edited in Replay. If the session was
          // deleted, renamed, or never had a real name to begin with, we
          // fall back to a fresh session seeded from the static snapshot
          // instead, since the live one may no longer be trustworthy.
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

          // Fallback: create a fresh Replay session from the static,
          // immutable snapshot — either a sent request (by ID) or an
          // unsent draft (by raw text + connection info, since it never
          // had an ID to begin with). createSession() only returns
          // Promise<void> — the created session is delivered via the
          // onSessionCreate event instead, so we listen for it before
          // triggering creation.
          try {
            const handler = sdk.replay.onSessionCreate((event) => {
              handler.stop();
              sdk.replay.openTab(event.session.id);
              sdk.navigation.goTo("/replay");
            });

            if (draftConnection) {
              if (!currentRawText) {
                handler.stop();
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
              handler.stop();
            }
          } catch (err) {
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
