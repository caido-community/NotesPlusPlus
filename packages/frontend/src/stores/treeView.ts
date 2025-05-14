import { defineStore } from "pinia";

export type TreeViewState = Map<string, boolean>;

export const useTreeViewStore = defineStore("treeView", {
  state: () => ({
    open: new Map<string, boolean>(),
  }),

  actions: {
    openNode(path: string) {
      this.open.set(path, true);
    },

    closeNode(path: string) {
      this.open.set(path, false);
    },

    toggleNode(path: string) {
      const isOpen = this.open.get(path);
      this.open.set(path, !isOpen);
    },

    isNodeOpen(path: string): boolean {
      return !!this.open.get(path);
    },
  },
});
