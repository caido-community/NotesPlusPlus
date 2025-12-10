import { Extension } from "@tiptap/core";
import { type Editor } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { DecorationSet } from "@tiptap/pm/view";

interface SlashCommand {
  name: string;
  description: string;
  icon: string;
  action: (editor: Editor) => void;
}

const commands: SlashCommand[] = [
  {
    name: "table",
    description: "Insert a table",
    icon: "fa-table",
    action: (editor) => {
      editor
        .chain()
        .focus()
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run();
    },
  },
  {
    name: "h1",
    description: "Large heading",
    icon: "fa-heading",
    action: (editor) => {
      editor.chain().focus().toggleMarkdownHeading({ level: 1 }).run();
    },
  },
  {
    name: "h2",
    description: "Medium heading",
    icon: "fa-heading",
    action: (editor) => {
      editor.chain().focus().toggleMarkdownHeading({ level: 2 }).run();
    },
  },
  {
    name: "h3",
    description: "Small heading",
    icon: "fa-heading",
    action: (editor) => {
      editor.chain().focus().toggleMarkdownHeading({ level: 3 }).run();
    },
  },
  {
    name: "h4",
    description: "Heading 4",
    icon: "fa-heading",
    action: (editor) => {
      editor.chain().focus().toggleMarkdownHeading({ level: 4 }).run();
    },
  },
  {
    name: "h5",
    description: "Heading 5",
    icon: "fa-heading",
    action: (editor) => {
      editor.chain().focus().toggleMarkdownHeading({ level: 5 }).run();
    },
  },
  {
    name: "h6",
    description: "Heading 6",
    icon: "fa-heading",
    action: (editor) => {
      editor.chain().focus().toggleMarkdownHeading({ level: 6 }).run();
    },
  },
  {
    name: "bullet",
    description: "Bullet list",
    icon: "fa-list-ul",
    action: (editor) => {
      editor.chain().focus().toggleBulletList().run();
    },
  },
  {
    name: "numbered",
    description: "Numbered list",
    icon: "fa-list-ol",
    action: (editor) => {
      editor.chain().focus().toggleOrderedList().run();
    },
  },
  {
    name: "code",
    description: "Code block",
    icon: "fa-code",
    action: (editor) => {
      editor.chain().focus().toggleCodeBlock().run();
    },
  },
  {
    name: "quote",
    description: "Block quote",
    icon: "fa-quote-left",
    action: (editor) => {
      editor.chain().focus().toggleBlockquote().run();
    },
  },
  {
    name: "divider",
    description: "Horizontal rule",
    icon: "fa-minus",
    action: (editor) => {
      editor.chain().focus().setHorizontalRule().run();
    },
  },
];

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
  `;
  document.head.appendChild(style);
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

export const SlashCommands = Extension.create({
  name: "slashCommands",

  addProseMirrorPlugins() {
    const editor = this.editor;
    let menuElement: HTMLElement | undefined = undefined;
    let selectedIndex = 0;
    let filteredCommands: SlashCommand[] = [];
    let slashPos: number | undefined = undefined;

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
        item.addEventListener("click", () => {
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
      slashPos = undefined;
      filteredCommands = [];
    };

    const executeCommand = () => {
      if (filteredCommands.length === 0 || slashPos === undefined) return;

      const command = filteredCommands[selectedIndex];
      if (!command) return;

      const { state } = editor.view;
      const from = slashPos;
      const to = state.selection.from;

      editor.view.dispatch(state.tr.delete(from, to));

      command.action(editor);
      hideMenu();
    };

    return [
      new Plugin({
        key: new PluginKey("slashCommands"),
        props: {
          handleKeyDown(view, event) {
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
