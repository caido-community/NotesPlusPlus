import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { EditorView, lineNumbers } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import { mergeAttributes, Node } from "@tiptap/core";

import { type FrontendSDK } from "@/types";

const MAX_FILE_SIZE_BYTES = 150 * 1024 * 1024;
const shownLargeFileWarnings = new Set<string>();

const githubDarkHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: "#ff7b72" },
  { tag: tags.operator, color: "#79c0ff" },
  { tag: tags.special(tags.variableName), color: "#ffa657" },
  { tag: tags.typeName, color: "#ffa657" },
  { tag: tags.atom, color: "#79c0ff" },
  { tag: tags.number, color: "#79c0ff" },
  { tag: tags.bool, color: "#79c0ff" },
  { tag: tags.string, color: "#a5d6ff" },
  { tag: tags.special(tags.string), color: "#a5d6ff" },
  { tag: tags.comment, color: "#8b949e", fontStyle: "italic" },
  { tag: tags.variableName, color: "#c9d1d9" },
  { tag: tags.function(tags.variableName), color: "#d2a8ff" },
  { tag: tags.definition(tags.variableName), color: "#ffa657" },
  { tag: tags.propertyName, color: "#79c0ff" },
  { tag: tags.tagName, color: "#7ee787" },
  { tag: tags.attributeName, color: "#79c0ff" },
  { tag: tags.attributeValue, color: "#a5d6ff" },
  { tag: tags.className, color: "#ffa657" },
  { tag: tags.labelName, color: "#ffa657" },
  { tag: tags.namespace, color: "#ff7b72" },
  { tag: tags.macroName, color: "#ffa657" },
  { tag: tags.literal, color: "#79c0ff" },
  { tag: tags.null, color: "#79c0ff" },
  { tag: tags.punctuation, color: "#c9d1d9" },
  { tag: tags.bracket, color: "#c9d1d9" },
  { tag: tags.heading, color: "#79c0ff", fontWeight: "bold" },
  { tag: tags.link, color: "#58a6ff" },
  { tag: tags.url, color: "#58a6ff" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strong, fontWeight: "bold" },
]);

const githubDarkTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "#0d1117",
      color: "#c9d1d9",
    },
    ".cm-content": {
      caretColor: "#c9d1d9",
      fontFamily: "'Consolas', 'Monaco', 'Menlo', monospace",
      fontSize: "13px",
      padding: "0",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "#c9d1d9",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
      {
        backgroundColor: "#264f78",
      },
    ".cm-activeLine": {
      backgroundColor: "transparent",
    },
    ".cm-gutters": {
      backgroundColor: "#0d1117",
      color: "#6e7681",
      border: "none",
      borderRight: "1px solid #30363d",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "transparent",
    },
    ".cm-lineNumbers .cm-gutterElement": {
      padding: "0 12px 0 8px",
      minWidth: "40px",
    },
  },
  { dark: true },
);

const styleId = "embedded-file-style";
if (!document.getElementById(styleId)) {
  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    .embedded-file {
      display: inline-block;
      margin: 12px 0;
      border: 2px solid #30363d;
      border-radius: 6px;
      overflow: hidden;
      width: 100%;
      min-height: 50px;
      max-height: 300px;
      position: relative;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      transition: box-shadow 0.2s ease, border-color 0.2s ease;
      cursor: pointer;
      background: #0d1117;
    }
    .embedded-file:hover {
      border-color: #58a6ff;
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
    }
    .embedded-file-label {
      position: absolute;
      top: 4px;
      right: 4px;
      background: rgba(13, 17, 23, 0.9);
      color: #c9d1d9;
      font-size: 12px;
      padding: 3px 8px;
      border-radius: 4px;
      z-index: 10;
      font-weight: 500;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      border: 1px solid #30363d;
      transition: background 0.2s ease, border-color 0.2s ease;
    }
    .embedded-file:hover .embedded-file-label {
      background: #238636;
      border-color: #238636;
      color: #fff;
    }
    .embedded-file-content {
      width: 100%;
      height: 100%;
      max-height: 300px;
      overflow: auto;
    }
    .embedded-file-content .cm-editor {
      height: 100%;
    }
    .embedded-file-content .cm-scroller {
      overflow: auto;
    }
    .embedded-file-error {
      padding: 12px;
      color: #f85149;
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(248, 81, 73, 0.1);
    }
    .embedded-file-large {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      color: #8b949e;
      font-size: 13px;
      background: #0d1117;
    }
    .embedded-file-large-icon {
      font-size: 20px;
      color: #58a6ff;
      flex-shrink: 0;
    }
    .embedded-file-large-text {
      flex: 1;
    }
  `;
  document.head.appendChild(style);
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

function getLanguageExtension(ext: string) {
  switch (ext) {
    case "json":
      return json();
    case "js":
    case "mjs":
      return javascript();
    case "ts":
    case "tsx":
      return javascript({ typescript: true });
    case "jsx":
      return javascript({ jsx: true });
    case "html":
    case "htm":
    case "xml":
    case "svg":
      return html();
    case "css":
      return css();
    case "md":
    case "markdown":
      return markdown();
    default:
      return null;
  }
}

export const createFileMention = (sdk: FrontendSDK) => {
  return Node.create({
    name: "fileMention",
    group: "block",
    atom: true,

    addAttributes() {
      return {
        id: { default: "" },
        name: { default: "" },
        size: { default: 0 },
        path: { default: "" },
      };
    },

    parseHTML() {
      return [{ tag: "div[data-file-mention]" }];
    },

    renderHTML({ HTMLAttributes }) {
      return [
        "div",
        mergeAttributes({ "data-file-mention": "" }, HTMLAttributes),
      ];
    },

    addNodeView() {
      return (nodeViewProps) => {
        const { id, name, size, path } = nodeViewProps.node.attrs;
        const isLargeFile = size > MAX_FILE_SIZE_BYTES;

        const container = document.createElement("div");
        container.className = "embedded-file";
        container.contentEditable = "false";

        const label = document.createElement("div");
        label.className = "embedded-file-label";
        label.textContent = `${name} ${formatFileSize(size)}`;
        container.appendChild(label);

        if (isLargeFile) {
          if (!shownLargeFileWarnings.has(id)) {
            shownLargeFileWarnings.add(id);
            sdk.window.showToast(
              `File "${name}" is too large (${formatFileSize(size)}). Double-click to view in Files.`,
              { variant: "warning", duration: 5000 },
            );
          }

          const largeDiv = document.createElement("div");
          largeDiv.className = "embedded-file-large";
          largeDiv.innerHTML = `
            <i class="fas fa-file-alt embedded-file-large-icon"></i>
            <div class="embedded-file-large-text">File too large to display. Double-click to open in Files.</div>
          `;
          container.appendChild(largeDiv);
        } else {
          const contentWrapper = document.createElement("div");
          contentWrapper.className = "embedded-file-content";
          container.appendChild(contentWrapper);

          const loadFileContent = async () => {
            try {
              const content = await sdk.backend.getFileContent(path);
              const ext = getFileExtension(name);
              const langExt = getLanguageExtension(ext);

              const extensions = [
                githubDarkTheme,
                syntaxHighlighting(githubDarkHighlight),
                EditorView.editable.of(false),
                EditorState.readOnly.of(true),
                lineNumbers(),
              ];

              if (langExt) {
                extensions.push(langExt);
              }

              new EditorView({
                state: EditorState.create({
                  doc: content,
                  extensions,
                }),
                parent: contentWrapper,
              });
            } catch {
              contentWrapper.innerHTML = `
                <div class="embedded-file-error">
                  <i class="fas fa-exclamation-circle"></i>
                  <span>Error loading file content</span>
                </div>
              `;
            }
          };

          loadFileContent();
        }

        container.addEventListener("dblclick", () => {
          sdk.navigation.goTo("/files");
        });

        return {
          dom: container,
        };
      };
    },
  });
};
