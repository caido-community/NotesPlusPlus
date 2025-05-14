import { Extension } from "@tiptap/core";

const MarkdownStyling = Extension.create({
  name: "markdownStyling",

  addGlobalAttributes() {
    return [
      {
        types: ["codeBlock"],
        attributes: {
          class: {
            default:
              "bg-surface-900 p-4 rounded-md my-4 text-surface-200 font-mono text-sm overflow-x-auto",
          },
        },
      },
      {
        types: ["code"],
        attributes: {
          class: {
            default:
              "bg-surface-900 px-1.5 py-0.5 rounded text-surface-200 font-mono text-sm",
          },
        },
      },
      {
        types: ["blockquote"],
        attributes: {
          class: {
            default:
              "border-l-4 border-surface-600 pl-4 my-4 italic text-surface-300",
          },
        },
      },
      {
        types: ["heading"],
        attributes: {
          class: {
            default: "text-surface-100 font-semibold",
          },
        },
      },
      {
        types: ["bulletList", "orderedList"],
        attributes: {
          class: {
            default: "pl-6 my-4",
          },
        },
      },
      {
        types: ["listItem"],
        attributes: {
          class: {
            default: "my-1",
          },
        },
      },
      {
        types: ["horizontalRule"],
        attributes: {
          class: {
            default: "border-t border-surface-600 my-6",
          },
        },
      },
    ];
  },
});

export default MarkdownStyling;
