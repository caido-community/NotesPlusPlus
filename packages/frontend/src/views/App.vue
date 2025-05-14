<script setup lang="ts">
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { onMounted } from "vue";

import { ContentContainer } from "@/components/content";
import GlobalContextMenu from "@/components/shared/GlobalContextMenu.vue";
import MigrationDialog from "@/components/shared/MigrationDialog.vue";
import { SidebarContainer } from "@/components/sidebar";
import { useNotesStore } from "@/stores/notes";

const notesStore = useNotesStore();
onMounted(() => {
  notesStore.initialize();
});
</script>

<template>
  <Splitter class="flex-1 w-full h-full">
    <SplitterPanel :size="20" :min-size="10" :max-size="30">
      <SidebarContainer />
    </SplitterPanel>
    <SplitterPanel :size="80" :min-size="50" :max-size="90">
      <ContentContainer />
    </SplitterPanel>
  </Splitter>
  <GlobalContextMenu />
  <MigrationDialog />
</template>
