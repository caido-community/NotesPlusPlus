import { mergeAttributes, Node, textblockTypeInputRule } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export type Level = 1 | 2 | 3 | 4 | 5 | 6;

export interface MarkdownHeadingOptions {
  levels: Level[];
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    markdownHeading: {
      setMarkdownHeading: (attributes: { level: Level }) => ReturnType;
      toggleMarkdownHeading: (attributes: { level: Level }) => ReturnType;
    };
  }
}

export const MarkdownHeading = Node.create<MarkdownHeadingOptions>({
  name: "heading",

  addOptions() {
    return {
      levels: [1, 2, 3, 4, 5, 6],
      HTMLAttributes: {},
    };
  },

  content: "inline*",

  group: "block",

  defining: true,

  addAttributes() {
    return {
      level: {
        default: 1,
        rendered: true,
        parseHTML: (element) => {
          const level = Number(element.getAttribute("data-level") || 1);
          return level;
        },
        renderHTML: (attributes) => {
          return {
            "data-level": attributes.level,
          };
        },
      },
    };
  },

  parseHTML() {
    return this.options.levels.map((level: Level) => ({
      tag: `h${level}`,
      attrs: { level },
    }));
  },

  renderHTML({ node, HTMLAttributes }) {
    const hasLevel = this.options.levels.includes(node.attrs.level);
    const level = hasLevel ? node.attrs.level : this.options.levels[0];

    return [
      `div`,
      mergeAttributes(
        { class: `heading heading-${level}` },
        this.options.HTMLAttributes,
        HTMLAttributes,
      ),
      0,
    ];
  },

  addCommands() {
    return {
      setMarkdownHeading:
        (attributes) =>
        ({ commands }) => {
          if (!this.options.levels.includes(attributes.level)) {
            return false;
          }

          return commands.setNode(this.name, attributes);
        },
      toggleMarkdownHeading:
        (attributes) =>
        ({ commands }) => {
          if (!this.options.levels.includes(attributes.level)) {
            return false;
          }

          return commands.toggleNode(this.name, "paragraph", attributes);
        },
    };
  },

  addKeyboardShortcuts() {
    return this.options.levels.reduce(
      (items, level) => ({
        ...items,
        ...{
          [`Mod-Alt-${level}`]: () =>
            this.editor.commands.toggleMarkdownHeading({ level }),
        },
      }),
      {},
    );
  },

  addInputRules() {
    return this.options.levels.map((level) => {
      return textblockTypeInputRule({
        find: new RegExp(`^(#{${level}})\\s$`),
        type: this.type,
        getAttributes: {
          level,
        },
      });
    });
  },

  addProseMirrorPlugins() {
    const headingPluginKey = new PluginKey("markdownHeadingDecorations");

    return [
      new Plugin({
        key: headingPluginKey,
        props: {
          decorations: ({ doc, selection }) => {
            const { $head } = selection;
            const decorations: Decoration[] = [];

            if (!$head) return DecorationSet.empty;

            doc.descendants((node, pos) => {
              if (node.type.name !== this.name) return;

              const level = node.attrs.level as Level;
              const nodeEndPos = pos + node.nodeSize;

              const isNodeSelected =
                $head.pos >= pos && $head.pos <= nodeEndPos;

              if (isNodeSelected) {
                const prefix = "#".repeat(level);

                decorations.push(
                  Decoration.widget(
                    pos + 1,
                    () => {
                      const span = document.createElement("span");
                      span.className = "heading-hashtags";
                      span.textContent = prefix + " ";
                      span.contentEditable = "false";
                      return span;
                    },
                    { side: -1 },
                  ),
                );
              }
            });

            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
});
