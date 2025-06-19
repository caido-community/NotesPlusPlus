import { Mention } from "@tiptap/extension-mention";

import { type FrontendSDK } from "@/types";
import { emitter } from "@/utils/eventBus";

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
    .embedded-replay-label {
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
    }
    .embedded-replay-editor:hover .embedded-replay-label {
      background: var(--color-primary-500, #6366f1);
      color: var(--color-surface-100, #fff);
    }
  `;
  document.head.appendChild(style);
}

export const createSessionMention = (sdk: FrontendSDK) => {
  return Mention.extend({
    addNodeView() {
      return (node) => {
        const container = document.createElement("div");
        container.className = "embedded-replay-editor";

        const label = document.createElement("div");
        label.className = "embedded-replay-label";
        label.textContent = `Replay: ${node.node.attrs.label}`;
        container.appendChild(label);

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

        loadSessionData(node.node.attrs.id);

        emitter.on("refreshEditors", () => {
          loadSessionData(node.node.attrs.id);
        });

        container.addEventListener("dblclick", () => {
          sdk.replay.closeTab(node.node.attrs.id);
          sdk.replay.openTab(node.node.attrs.id);
          sdk.navigation.goTo("/replay");
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
