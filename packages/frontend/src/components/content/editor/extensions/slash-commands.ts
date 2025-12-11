import { Extension } from "@tiptap/core";
import { type Editor } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { DecorationSet } from "@tiptap/pm/view";

import { type FrontendSDK } from "@/types";

interface SlashCommand {
  name: string;
  description: string;
  icon: string;
  action: (editor: Editor, sdk?: FrontendSDK) => void;
  hasSubmenu?: boolean;
}

const styleId = "slash-command-style";
if (!document.getElementById(styleId)) {
  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    .slash-command-menu {
      position: absolute;
      z-index: 1000;
      background: #27272a;
      border: 1px solid #52525b;
      border-radius: 8px;
      padding: 8px 0;
      min-width: 200px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
    .slash-command-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 16px;
      cursor: pointer;
      color: #e5e5e5;
      transition: background 0.15s;
    }
    .slash-command-item:hover,
    .slash-command-item.selected {
      background: #3f3f46;
    }
    .slash-command-item i {
      width: 16px;
      text-align: center;
      color: #a1a1aa;
    }
    .slash-command-name {
      font-weight: 500;
    }
    .slash-command-desc {
      font-size: 12px;
      color: #a1a1aa;
      margin-left: auto;
    }
    .file-picker-menu {
      position: absolute;
      z-index: 1000;
      background: #27272a;
      border: 1px solid #3f3f46;
      border-radius: 4px;
      padding: 2px;
      width: 280px;
      max-height: 208px;
      overflow-y: auto;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }
    .file-picker-header {
      padding: 4px 8px;
      font-size: 12px;
      font-weight: 500;
      color: #a1a1aa;
    }
    .file-picker-divider {
      height: 1px;
      background: #3f3f46;
      margin-bottom: 4px;
    }
    .file-picker-item {
      display: flex;
      align-items: center;
      width: 100%;
      padding: 2px 8px;
      cursor: pointer;
      color: #e5e5e5;
      font-size: 13px;
      border-radius: 2px;
      transition: background 0.1s;
      text-align: left;
      background: none;
      border: none;
      gap: 8px;
    }
    .file-picker-item:hover,
    .file-picker-item.selected {
      background: #3f3f46;
    }
    .file-picker-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .file-picker-size {
      flex-shrink: 0;
      font-size: 12px;
      color: #71717a;
    }
    .file-picker-empty {
      padding: 4px 8px;
      text-align: center;
      color: #71717a;
      font-size: 13px;
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

const isAtLineStart = (state: {
  doc: {
    resolve: (pos: number) => {
      parentOffset: number;
      parent: { textContent: string };
    };
  };
  selection: { from: number };
}): boolean => {
  const { from } = state.selection;
  const $pos = state.doc.resolve(from);
  const textBefore = $pos.parent.textContent.slice(0, $pos.parentOffset);
  return textBefore.trim() === "";
};

export interface SlashCommandsOptions {
  sdk?: FrontendSDK;
}

export const SlashCommands = Extension.create<SlashCommandsOptions>({
  name: "slashCommands",

  addOptions() {
    return {
      sdk: undefined,
    };
  },

  addProseMirrorPlugins() {
    const editor = this.editor;
    const sdk = this.options.sdk;

    const commands: SlashCommand[] = [
      {
        name: "files",
        description: "Embed a hosted file",
        icon: "fa-file",
        hasSubmenu: true,
        action: () => {},
      },
      {
        name: "request",
        description: "Embed a replay session",
        icon: "fa-paper-plane",
        action: (ed) => {
          ed.chain().focus().insertContent("@").run();
        },
      },
      {
        name: "table",
        description: "Insert a table",
        icon: "fa-table",
        action: (ed) => {
          ed.chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run();
        },
      },
      {
        name: "h1",
        description: "Large heading",
        icon: "fa-heading",
        action: (ed) => {
          ed.chain().focus().toggleMarkdownHeading({ level: 1 }).run();
        },
      },
      {
        name: "h2",
        description: "Medium heading",
        icon: "fa-heading",
        action: (ed) => {
          ed.chain().focus().toggleMarkdownHeading({ level: 2 }).run();
        },
      },
      {
        name: "h3",
        description: "Small heading",
        icon: "fa-heading",
        action: (ed) => {
          ed.chain().focus().toggleMarkdownHeading({ level: 3 }).run();
        },
      },
      {
        name: "h4",
        description: "Heading 4",
        icon: "fa-heading",
        action: (ed) => {
          ed.chain().focus().toggleMarkdownHeading({ level: 4 }).run();
        },
      },
      {
        name: "h5",
        description: "Heading 5",
        icon: "fa-heading",
        action: (ed) => {
          ed.chain().focus().toggleMarkdownHeading({ level: 5 }).run();
        },
      },
      {
        name: "h6",
        description: "Heading 6",
        icon: "fa-heading",
        action: (ed) => {
          ed.chain().focus().toggleMarkdownHeading({ level: 6 }).run();
        },
      },
      {
        name: "bullet",
        description: "Bullet list",
        icon: "fa-list-ul",
        action: (ed) => {
          ed.chain().focus().toggleBulletList().run();
        },
      },
      {
        name: "numbered",
        description: "Numbered list",
        icon: "fa-list-ol",
        action: (ed) => {
          ed.chain().focus().toggleOrderedList().run();
        },
      },
      {
        name: "code",
        description: "Code block",
        icon: "fa-code",
        action: (ed) => {
          ed.chain().focus().toggleCodeBlock().run();
        },
      },
      {
        name: "quote",
        description: "Block quote",
        icon: "fa-quote-left",
        action: (ed) => {
          ed.chain().focus().toggleBlockquote().run();
        },
      },
      {
        name: "divider",
        description: "Horizontal rule",
        icon: "fa-minus",
        action: (ed) => {
          ed.chain().focus().setHorizontalRule().run();
        },
      },
    ];

    let menuElement: HTMLElement | undefined = undefined;
    let filePickerElement: HTMLElement | undefined = undefined;
    let selectedIndex = 0;
    let fileSelectedIndex = 0;
    let filteredCommands: SlashCommand[] = [];
    let slashPos: number | undefined = undefined;
    let showingFilePicker = false;

    const updateMenu = (query: string) => {
      filteredCommands = commands.filter((cmd) =>
        cmd.name.toLowerCase().startsWith(query.toLowerCase()),
      );

      if (!menuElement || filteredCommands.length === 0) {
        hideMenu();
        return;
      }

      selectedIndex = Math.min(selectedIndex, filteredCommands.length - 1);

      menuElement.innerHTML = filteredCommands
        .map(
          (cmd, i) => `
          <div class="slash-command-item ${i === selectedIndex ? "selected" : ""}" data-index="${i}">
            <i class="fas ${cmd.icon}"></i>
            <span class="slash-command-name">/${cmd.name}</span>
            <span class="slash-command-desc">${cmd.description}</span>
          </div>
        `,
        )
        .join("");

      menuElement.querySelectorAll(".slash-command-item").forEach((item) => {
        item.addEventListener("mouseenter", () => {
          selectedIndex = parseInt(item.getAttribute("data-index") || "0");
          updateMenu(query);
        });
        item.addEventListener("mousedown", (event) => {
          event.preventDefault();
          executeCommand();
        });
      });
    };

    const showMenu = (pos: number, query: string) => {
      if (!menuElement) {
        menuElement = document.createElement("div");
        menuElement.className = "slash-command-menu";
        document.body.appendChild(menuElement);
      }

      const coords = editor.view.coordsAtPos(pos);
      menuElement.style.left = `${coords.left}px`;
      menuElement.style.top = `${coords.bottom + 8}px`;

      slashPos = pos;
      selectedIndex = 0;
      updateMenu(query);
    };

    const hideMenu = () => {
      if (menuElement) {
        menuElement.remove();
        menuElement = undefined;
      }
      hideFilePicker();
      slashPos = undefined;
      filteredCommands = [];
      showingFilePicker = false;
    };

    const hideFilePicker = () => {
      if (filePickerElement) {
        filePickerElement.remove();
        filePickerElement = undefined;
      }
      showingFilePicker = false;
    };

    const showFilePicker = () => {
      if (!sdk) {
        return;
      }

      if (!menuElement || slashPos === undefined) return;

      const files = sdk.files.getAll();

      const coords = editor.view.coordsAtPos(slashPos);

      menuElement.remove();
      menuElement = undefined;

      filePickerElement = document.createElement("div");
      filePickerElement.className = "file-picker-menu";
      filePickerElement.style.left = `${coords.left}px`;
      filePickerElement.style.top = `${coords.bottom + 8}px`;

      if (files.length === 0) {
        filePickerElement.innerHTML = `
          <div class="file-picker-header">Select a hosted file</div>
          <div class="file-picker-divider"></div>
          <div class="file-picker-empty">No files found</div>
        `;
      } else {
        fileSelectedIndex = 0;
        filePickerElement.innerHTML = `
          <div class="file-picker-header">Select a hosted file</div>
          <div class="file-picker-divider"></div>
          ${files
            .map(
              (file, i) => `
            <button class="file-picker-item ${i === fileSelectedIndex ? "selected" : ""}" data-index="${i}">
              <span class="file-picker-name">${file.name}</span>
              <span class="file-picker-size">${formatFileSize(file.size)}</span>
            </button>
          `,
            )
            .join("")}
        `;

        filePickerElement
          .querySelectorAll(".file-picker-item")
          .forEach((item) => {
            item.addEventListener("mousedown", (event) => {
              event.preventDefault();
              const index = parseInt(item.getAttribute("data-index") || "0");
              const file = files[index];
              if (file) {
                insertFile(file);
              }
            });
            item.addEventListener("mouseenter", () => {
              fileSelectedIndex = parseInt(
                item.getAttribute("data-index") || "0",
              );
              updateFilePickerSelection(files);
            });
          });
      }

      document.body.appendChild(filePickerElement);
      showingFilePicker = true;
    };

    const updateFilePickerSelection = (
      files: { id: string; name: string; size: number; path: string }[],
    ) => {
      if (!filePickerElement) return;
      filePickerElement
        .querySelectorAll(".file-picker-item")
        .forEach((item, i) => {
          if (i === fileSelectedIndex) {
            item.classList.add("selected");
          } else {
            item.classList.remove("selected");
          }
        });
    };

    const insertFile = (file: {
      id: string;
      name: string;
      size: number;
      path: string;
    }) => {
      if (slashPos === undefined) return;

      const { state } = editor.view;
      const from = slashPos;
      const to = state.selection.from;

      editor.view.dispatch(state.tr.delete(from, to));

      editor
        .chain()
        .focus()
        .insertContent({
          type: "fileMention",
          attrs: {
            id: file.id,
            name: file.name,
            size: file.size,
            path: file.path,
          },
        })
        .run();

      hideMenu();
    };

    const executeCommand = () => {
      if (filteredCommands.length === 0 || slashPos === undefined) return;

      const command = filteredCommands[selectedIndex];
      if (!command) return;

      if (command.name === "files") {
        showFilePicker();
        return;
      }

      const { state } = editor.view;
      const from = slashPos;
      const to = state.selection.from;

      editor.view.dispatch(state.tr.delete(from, to));

      command.action(editor, sdk);
      hideMenu();
    };

    return [
      new Plugin({
        key: new PluginKey("slashCommands"),
        props: {
          handleDOMEvents: {
            blur: () => {
              hideMenu();
              return false;
            },
          },
          handleKeyDown(view, event) {
            if (showingFilePicker && sdk) {
              const files = sdk.files.getAll();

              if (event.key === "ArrowDown") {
                event.preventDefault();
                fileSelectedIndex = (fileSelectedIndex + 1) % files.length;
                updateFilePickerSelection(files);
                return true;
              }

              if (event.key === "ArrowUp") {
                event.preventDefault();
                fileSelectedIndex =
                  (fileSelectedIndex - 1 + files.length) % files.length;
                updateFilePickerSelection(files);
                return true;
              }

              if (event.key === "Enter") {
                event.preventDefault();
                const file = files[fileSelectedIndex];
                if (file) {
                  insertFile(file);
                }
                return true;
              }

              if (event.key === "Escape") {
                hideFilePicker();
                return true;
              }

              if (event.key === "ArrowLeft" || event.key === "Backspace") {
                hideFilePicker();
                return false;
              }

              return false;
            }

            if (!menuElement) {
              if (event.key === "/" && isAtLineStart(view.state)) {
                setTimeout(() => {
                  const { from } = view.state.selection;
                  showMenu(from - 1, "");
                }, 0);
              }
              return false;
            }

            if (event.key === "ArrowDown") {
              event.preventDefault();
              selectedIndex = (selectedIndex + 1) % filteredCommands.length;
              const query = getQuery(view.state);
              updateMenu(query);
              return true;
            }

            if (event.key === "ArrowUp") {
              event.preventDefault();
              selectedIndex =
                (selectedIndex - 1 + filteredCommands.length) %
                filteredCommands.length;
              const query = getQuery(view.state);
              updateMenu(query);
              return true;
            }

            if (event.key === "Enter" || event.key === "Tab") {
              event.preventDefault();
              executeCommand();
              return true;
            }

            if (event.key === "Escape") {
              hideMenu();
              return true;
            }

            if (event.key === "ArrowRight") {
              const command = filteredCommands[selectedIndex];
              if (command?.hasSubmenu && command.name === "files") {
                event.preventDefault();
                showFilePicker();
                return true;
              }
            }

            return false;
          },
          decorations(state) {
            if (slashPos === undefined) return DecorationSet.empty;

            const { from } = state.selection;
            if (from <= slashPos) {
              hideMenu();
              return DecorationSet.empty;
            }

            const text = state.doc.textBetween(slashPos, from, " ");

            if (!text.startsWith("/")) {
              hideMenu();
              return DecorationSet.empty;
            }

            const query = text.slice(1);
            updateMenu(query);

            return DecorationSet.empty;
          },
        },
      }),
    ];

    function getQuery(state: typeof editor.view.state): string {
      if (slashPos === undefined) return "";
      const { from } = state.selection;
      const text = state.doc.textBetween(slashPos, from, " ");
      return text.startsWith("/") ? text.slice(1) : "";
    }
  },
});
