import { mergeAttributes } from "@tiptap/core";
import { Image } from "@tiptap/extension-image";

export const CustomImage = Image.extend({
  name: "customImage",

  addOptions() {
    return {
      ...this.parent?.(),
      sdk: null,
    };
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "img[src]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "img",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
    ];
  },
});
