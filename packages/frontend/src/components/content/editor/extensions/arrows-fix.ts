import { Extension } from "@tiptap/core";

// This is a hack to fix arrow up/down, for some reason it doesn't work without it
export const ArrowKeysFix = Extension.create({
  name: "arrowKeysFix",

  addKeyboardShortcuts() {
    return {
      ArrowUp: ({ editor }) => {
        const { state, view } = editor;
        const { selection } = state;

        const transaction = state.tr.setSelection(selection);
        view.dispatch(transaction);

        setTimeout(() => {
          const domSelection = window.getSelection();
          if (domSelection?.modify) {
            domSelection.modify("move", "backward", "line");
          }
        }, 0);

        return true;
      },

      ArrowDown: ({ editor }) => {
        const { state, view } = editor;
        const { selection } = state;

        const transaction = state.tr.setSelection(selection);
        view.dispatch(transaction);

        setTimeout(() => {
          const domSelection = window.getSelection();
          if (domSelection?.modify) {
            domSelection.modify("move", "forward", "line");
          }
        }, 0);

        return true;
      },
    };
  },
});
