<script setup lang="ts">
/**
 * Global Context Menu Component
 *
 * This component provides a single, app-wide context menu that can be
 * triggered from any component by using the contextMenuStore.
 */
import ContextMenu from "primevue/contextmenu";
import { onMounted, ref, watch } from "vue";

import { useContextMenuStore } from "@/stores/contextMenu";

const contextMenuStore = useContextMenuStore();
const cm = ref<InstanceType<typeof ContextMenu>>();

onMounted(() => {
  watch(
    () => contextMenuStore.contextMenuVisible,
    (visible) => {
      if (visible && cm.value) {
        const event = new MouseEvent("contextmenu", {
          clientX: contextMenuStore.contextMenuPosition.x,
          clientY: contextMenuStore.contextMenuPosition.y,
        });

        cm.value.show(event);
      }
    },
  );

  watch(
    () => contextMenuStore.forceHide,
    (shouldHide) => {
      if (shouldHide && cm.value) {
        cm.value.hide();
      }
    },
  );
});

/**
 * Update the store when the menu is hidden
 */
function onHide() {
  contextMenuStore.hideContextMenu();
}
</script>

<template>
  <ContextMenu
    ref="cm"
    :model="contextMenuStore.contextMenuItems"
    @hide="onHide"
  />
</template>
