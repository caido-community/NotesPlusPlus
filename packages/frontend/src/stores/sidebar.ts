import { defineStore } from "pinia";
import { ref } from "vue";

export const useSidebarStore = defineStore("sidebar", () => {
  const isCollapsed = ref(false);

  const toggleSidebar = () => {
    isCollapsed.value = !isCollapsed.value;
  };

  const collapseSidebar = () => {
    isCollapsed.value = true;
  };

  const expandSidebar = () => {
    isCollapsed.value = false;
  };

  return {
    isCollapsed,
    toggleSidebar,
    collapseSidebar,
    expandSidebar,
  };
});
