<script setup lang="ts">
import { type NoteContentItem } from "shared";
import { computed, ref, watch } from "vue";

import { useNotesStore } from "@/stores/notes";
const notesStore = useNotesStore();

const contentLength = computed(() => {
  const content = notesStore.currentNote?.content;
  if (!content) return 0;

  let charCount = 0;
  const countChars = (node: NoteContentItem) => {
    if (node.text) {
      charCount += node.text.length;
    }
    if (node.content) {
      node.content.forEach(countChars);
    }
  };

  countChars(content);
  return charCount;
});

const wordCount = computed(() => {
  const content = notesStore.currentNote?.content;
  if (!content) return 0;

  let words = 0;
  const countWords = (node: NoteContentItem) => {
    if (node.text) {
      const matches = node.text.match(/\S+/g);
      words += matches ? matches.length : 0;
    }
    if (node.content) {
      node.content.forEach(countWords);
    }
  };

  countWords(content);
  return words;
});

const lineCount = computed(() => {
  const content = notesStore.currentNote?.content;
  if (!content) return 0;

  let lines = 0;
  const countLines = (node: NoteContentItem) => {
    if (
      node.type &&
      [
        "paragraph",
        "heading",
        "codeBlock",
        "blockquote",
        "horizontalRule",
      ].includes(node.type)
    ) {
      lines++;
    }
    if (node.content) {
      node.content.forEach(countLines);
    }
  };

  countLines(content);
  return lines;
});

const showSaved = ref(false);

watch(
  () => notesStore.isSaving,
  (newValue) => {
    if (!newValue) {
      showSaved.value = true;
      setTimeout(() => {
        showSaved.value = false;
      }, 500);
    }
  }
);
</script>

<template>
  <div
    class="w-full h-[25px] border-t border-zinc-800 flex items-center justify-between px-2 text-base text-gray-400"
  >
    <div class="flex items-center gap-2">
      <span class="text-gray-400/50">{{ notesStore.currentNotePath }}</span>
      <span v-if="showSaved" class="text-gray-500/50">Saved...</span>
    </div>
    <div class="flex items-center gap-2">
      <span class="text-gray-400/50">{{ lineCount }} lines</span>
      <span class="text-gray-400/50">{{ wordCount }} words</span>
      <span class="text-gray-400/50">{{ contentLength }} characters</span>
    </div>
  </div>
</template>
