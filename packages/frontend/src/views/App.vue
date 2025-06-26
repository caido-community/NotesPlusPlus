<script setup lang="ts">
import { useMagicKeys } from "@vueuse/core";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { onMounted, watchEffect } from "vue";

import { ContentContainer } from "@/components/content";
import GlobalContextMenu from "@/components/shared/GlobalContextMenu.vue";
import MigrationDialog from "@/components/shared/MigrationDialog.vue";
import { SidebarContainer } from "@/components/sidebar";
import { useNotesStore } from "@/stores/notes";
import { useSidebarStore } from "@/stores/sidebar";

const notesStore = useNotesStore();
const sidebarStore = useSidebarStore();

const { cmd_b, ctrl_b } = useMagicKeys();

onMounted(() => {
  notesStore.initialize();
});

watchEffect(() => {
  if (cmd_b?.value || ctrl_b?.value) {
    sidebarStore.toggleSidebar();
  }
});
</script>

<template>
  <Splitter
    :key="sidebarStore.isCollapsed ? 'collapsed' : 'expanded'"
    class="flex-1 w-full h-full"
  >
    <SplitterPanel
      v-if="!sidebarStore.isCollapsed"
      :size="20"
      :min-size="10"
      :max-size="30"
      class="min-w-[150px]"
    >
      <SidebarContainer />
    </SplitterPanel>
    <SplitterPanel
      :size="sidebarStore.isCollapsed ? 100 : 80"
      :min-size="50"
      :max-size="100"
    >
      <ContentContainer />
    </SplitterPanel>
  </Splitter>
  <GlobalContextMenu />
  <MigrationDialog />
</template>
