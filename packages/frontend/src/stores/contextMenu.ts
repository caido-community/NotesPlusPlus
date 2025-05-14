import { defineStore } from "pinia";
import type { MenuItem } from "primevue/menuitem";
import { ref } from "vue";

/**
 * Store for managing the global context menu
 */
export const useContextMenuStore = defineStore("contextMenu", () => {
  const contextMenuItems = ref<MenuItem[]>([]);
  const contextMenuVisible = ref(false);
  const contextMenuPosition = ref({ x: 0, y: 0 });
  const forceHide = ref(false);

  /**
   * Show the context menu at the specified position with the given menu items
   */
  function showContextMenu(event: MouseEvent, items: MenuItem[]) {
    event.preventDefault();

    forceHide.value = true;
    setTimeout(() => {
      forceHide.value = false;
      contextMenuItems.value = items;
      contextMenuPosition.value = { x: event.clientX, y: event.clientY };
      contextMenuVisible.value = true;
    }, 15);
  }

  /**
   * Hide the context menu
   */
  function hideContextMenu() {
    contextMenuVisible.value = false;
  }

  return {
    contextMenuItems,
    contextMenuVisible,
    contextMenuPosition,
    forceHide,

    showContextMenu,
    hideContextMenu,
  };
});
