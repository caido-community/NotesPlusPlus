import { Mention } from "@tiptap/extension-mention";
import { PluginKey } from "@tiptap/pm/state";
import type { SavedItem } from "shared";

import { type FrontendSDK } from "@/types";
import { emitter } from "@/utils/eventBus";
import { decodeRawBlob } from "@/utils/httpEncoding";

const styleId = "embedded-replay-editor-style";
if (!document.getElementById(styleId)) {
  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    .embedded-replay-editor {
      display: inline-block;
      overflow: auto;
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
    .embedded-replay-editor:hover {
      border-color: var(--color-primary-500, #6366f1);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }
    .embedded-replay-label,
    .embedded-replay-migrate {
      position: absolute;
      top: 4px;
      font-size: 12px;
      padding: 3px 8px;
      border-radius: 4px;
      z-index: 10;
      font-weight: 500;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
    .embedded-replay-label {
      right: 4px;
      background: var(--color-surface-800, #262626);
      color: var(--color-surface-200, #e5e5e5);
      cursor: pointer;
      transition: background 0.2s ease, color 0.2s ease;
    }
    .embedded-replay-editor:hover .embedded-replay-label {
      background: var(--color-primary-500, #6366f1);
      color: var(--color-surface-100, #fff);
    }
    .embedded-replay-migrate {
      left: 4px;
      background: var(--color-warning-600, #d97706);
      color: var(--color-surface-100, #fff);
      border: none;
      cursor: pointer;
      transition: background 0.2s ease;
    }
    .embedded-replay-migrate:hover {
      background: var(--color-warning-500, #f59e0b);
    }
    .embedded-replay-migrate:disabled {
      opacity: 0.6;
      cursor: default;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Resolves a legacy `mention` node's Replay session ID into the
 * `SavedItem` shape `savedItemMention` expects. Returns `undefined` if
 * the session no longer exists.
 */
async function resolveToSavedItem(
  sdk: FrontendSDK,
  sessionId: string,
  label: string | undefined,
): Promise<SavedItem | undefined> {
  const sessionResponse = await sdk.graphql.replaySessionEntries({
    id: sessionId,
  });
  const activeEntryId = sessionResponse?.replaySession?.activeEntry?.id;

  if (!activeEntryId) {
    return undefined;
  }

  // Used as the best-effort sessionLabel for later match-or-reopen.
  const liveSession = sdk.replay.getSessions().find((s) => s.id === sessionId);

  const entry = sdk.replay.getEntry(activeEntryId);

  if (!entry.requestId) {
    // Unsent draft — capture the raw text and connection info directly.
    const connection = sessionResponse?.replaySession?.activeEntry?.connection;
    if (typeof connection?.host !== "string") {
      return undefined;
    }

    return {
      kind: "request",
      refId: "",
      sourceKind: "draft",
      draftRaw: decodeRawBlob(sessionResponse?.replaySession?.activeEntry?.raw ?? ""),
      draftHost: connection.host,
      draftPort: connection.port,
      draftIsTls: connection.isTLS,
      label,
      replaySessionId: sessionId,
    };
  }

  return {
    kind: "request",
    refId: entry.requestId,
    sourceKind: "replay",
    replaySessionId: sessionId,
    sessionLabel: liveSession?.name,
    label,
  };
}

export const createSessionMention = (sdk: FrontendSDK) => {
  return Mention.extend({
    // Mention.extend() defaults to a shared suggestion plugin key
    // (literally "mention"), which collides if another Mention.extend()
    // instance is also registered (see sessionTrigger). Give this one
    // its own key.
    addOptions() {
      const parent = this.parent?.();
      return {
        ...parent,
        suggestion: {
          ...parent?.suggestion,
          pluginKey: new PluginKey("sessionMentionSuggestion"),
        },
      };
    },

    addNodeView() {
      return ({ node, editor, getPos }) => {
        const container = document.createElement("div");
        container.className = "embedded-replay-editor";

        const label = document.createElement("div");
        label.className = "embedded-replay-label";
        label.textContent = `Replay: ${node.attrs.label}`;
        container.appendChild(label);

        // mention is deprecated in favor of savedItemMention (see
        // mention-saved-item.ts), so every node rendered here offers an
        // upgrade.
        sdk.window.showToast(
          "This note has a legacy request reference. Click the Upgrade button to switch it to the newer format.",
          { variant: "warning" },
        );

        const migrateButton = document.createElement("button");
        migrateButton.className = "embedded-replay-migrate";
        migrateButton.type = "button";
        migrateButton.textContent = "Upgrade";
        container.appendChild(migrateButton);

        migrateButton.addEventListener("click", async (event) => {
          // Avoid triggering the dblclick-to-replay handler below.
          event.stopPropagation();
          migrateButton.disabled = true;
          migrateButton.textContent = "Upgrading...";

          try {
            const upgraded = await resolveToSavedItem(
              sdk,
              node.attrs.id,
              node.attrs.label,
            );

            if (!upgraded) {
              sdk.window.showToast(
                "Couldn't upgrade this item — the Replay session it points to no longer exists.",
                { variant: "error" },
              );
              migrateButton.disabled = false;
              migrateButton.textContent = "Upgrade";
              return;
            }

            const pos = getPos();
            if (typeof pos !== "number") {
              migrateButton.disabled = false;
              migrateButton.textContent = "Upgrade";
              return;
            }

            const savedItemMentionType =
              editor.state.schema.nodes.savedItemMention;

            if (!savedItemMentionType) {
              console.error("savedItemMention node type is not registered");
              migrateButton.disabled = false;
              migrateButton.textContent = "Upgrade";
              return;
            }

            // mention is inline, savedItemMention is block-level, so the
            // node can't be swapped in place — delete it and insert the
            // new block right after its paragraph instead.
            const $pos = editor.state.doc.resolve(pos);
            const insertPos = $pos.end($pos.depth) + 1;

            const tr = editor.state.tr;
            tr.delete(pos, pos + node.nodeSize);
            tr.insert(
              tr.mapping.map(insertPos),
              savedItemMentionType.create({ ...upgraded }),
            );
            editor.view.dispatch(tr);

            sdk.window.showToast("Upgraded to the newer format.", {
              variant: "success",
            });
          } catch (err) {
            console.error("Error upgrading legacy mention:", err);
            sdk.window.showToast("Couldn't upgrade this item.", {
              variant: "error",
            });
            migrateButton.disabled = false;
            migrateButton.textContent = "Upgrade";
          }
        });

        const editorWrapper = document.createElement("div");
        editorWrapper.style.width = "100%";
        editorWrapper.style.height = "100%";
        container.appendChild(editorWrapper);

        const loadSessionData = async (sessionId: string): Promise<void> => {
          try {
            const sessionResponse = await sdk.graphql.replaySessionEntries({
              id: sessionId,
            });
            const activeEntryId =
              sessionResponse?.replaySession?.activeEntry?.id;

            if (!activeEntryId) {
              editorWrapper.innerHTML = `<div style="color: #ff4d4f; display: flex; align-items: center; gap: 8px; padding: 8px; background-color: rgba(255, 77, 79, 0.1); border-radius: 4px; margin: 8px 0;">
                <i class="fas fa-exclamation-circle" style="font-size: 16px;"></i>
                <span>Replay Session is not available</span>
              </div>`;
              return;
            }

            const entryResponse = await sdk.graphql.replayEntry({
              id: activeEntryId,
            });
            const sessionContent = entryResponse?.replayEntry?.raw || "";

            if (!sessionContent) {
              editorWrapper.textContent = "No session data available";
              return;
            }

            const requestEditor = sdk.ui.httpRequestEditor();
            const editorElement = requestEditor.getElement();
            editorElement.style.width = "100%";
            editorElement.style.height = "100%";

            editorWrapper.innerHTML = "";
            editorWrapper.appendChild(editorElement);

            requestAnimationFrame(() => {
              try {
                const view = requestEditor.getEditorView();
                if (view?.state?.doc) {
                  view.dispatch({
                    changes: {
                      from: 0,
                      to: view.state.doc.length,
                      insert: sessionContent,
                    },
                  });
                }
              } catch (err) {
                console.error("Couldn't set editor content:", err);
              }
            });
          } catch (error) {
            console.error("Error fetching session data:", error);
            editorWrapper.textContent = "Error loading session data";
          }
        };

        loadSessionData(node.attrs.id);

        const handleRefresh = () => {
          loadSessionData(node.attrs.id);
        };
        emitter.on("refreshEditors", handleRefresh);

        container.addEventListener("dblclick", () => {
          sdk.replay.closeTab(node.attrs.id);
          sdk.replay.openTab(node.attrs.id);
          sdk.navigation.goTo("/replay");
        });

        return {
          dom: container,
          destroy: () => {
            emitter.off("refreshEditors", handleRefresh);
          },
        };
      };
    },
  });
};
