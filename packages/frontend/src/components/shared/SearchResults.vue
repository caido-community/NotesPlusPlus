<script setup lang="ts">
import type { Note } from "shared";
import { nextTick, ref, watch } from "vue";

const props = defineProps<{
  results: Note[];
  selectedIndex: number;
}>();

const emit = defineEmits<{
  select: [path: string];
}>();

const listRef = ref<HTMLDivElement>();

function formatPath(path: string): string {
  return path.replace(/\.json$/, "");
}

watch(
  () => props.selectedIndex,
  async () => {
    await nextTick();
    const activeItem = listRef.value?.querySelector("[data-active='true']");
    activeItem?.scrollIntoView({ block: "nearest" });
  },
);
</script>

<template>
  <div ref="listRef" class="flex-1 overflow-y-auto min-h-0">
    <div
      v-if="results.length === 0"
      class="flex items-center justify-center h-full text-sm text-surface-500"
    >
      No notes found
    </div>
    <button
      v-for="(note, index) in results"
      :key="note.path"
      :data-active="index === selectedIndex"
      class="w-full text-left px-3 py-2 text-sm transition-colors duration-100 border-none outline-none cursor-pointer"
      :class="
        index === selectedIndex
          ? 'bg-surface-700 text-surface-100'
          : 'text-surface-300 hover:bg-surface-800'
      "
      @click="emit('select', note.path)"
    >
      <div class="font-medium truncate">
        {{ formatPath(note.name) }}
      </div>
      <div class="text-xs text-surface-500 truncate mt-0.5">
        {{ formatPath(note.path) }}
      </div>
    </button>
  </div>
</template>
