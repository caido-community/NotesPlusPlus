<script setup lang="ts">
import Card from "primevue/card";

import NoteEditor from "./editor/NoteEditor.vue";
import Footer from "./Footer.vue";
import Header from "./Header.vue";
import None from "./None.vue";

import { useNotesStore } from "@/stores/notes";

const notesStore = useNotesStore();
</script>

<template>
  <Card
    class="h-full"
    :pt="{
      body: { class: 'h-full' },
      content: { class: 'p-0 m-0 h-full' },
    }"
  >
    <template #content>
      <div v-if="notesStore.currentNote" class="h-full w-full flex flex-col">
        <Header />
        <div class="flex-1 p-4 w-full overflow-y-auto">
          <NoteEditor />
        </div>
        <Footer />
      </div>
      <None v-else />
    </template>
  </Card>
</template>
