<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue";

import SearchInput from "@/components/shared/SearchInput.vue";
import SearchNoteViewer from "@/components/shared/SearchNoteViewer.vue";
import SearchResults from "@/components/shared/SearchResults.vue";
import { useSearchModal } from "@/composables/useSearchModal";
import type { ModalPosition } from "@/types";

const props = defineProps({
  initialPosition: {
    type: Object as () => ModalPosition,
    default: () => ({ x: 100, y: 100 }),
  },
});

const emit = defineEmits<{
  close: [];
}>();

const {
  position,
  size,
  searchQuery,
  searchResults,
  selectedIndex,
  viewedNote,
  isViewingNote,
  startDrag,
  startResize,
  search,
  openNote,
  goBackToSearch,
  saveNoteContent,
  close,
  moveSelection,
  openSelectedNote,
  initialize,
} = useSearchModal({
  initialPosition: props.initialPosition,
  onClose: () => emit("close"),
});

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    if (isViewingNote.value) {
      goBackToSearch();
    } else {
      close();
    }
    return;
  }

  if (isViewingNote.value) return;

  if (event.key === "ArrowDown") {
    event.preventDefault();
    moveSelection(1);
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    moveSelection(-1);
  } else if (event.key === "Enter") {
    event.preventDefault();
    openSelectedNote();
  }
}

onMounted(async () => {
  await initialize();
  document.addEventListener("keydown", handleKeyDown);
});

onBeforeUnmount(() => {
  document.removeEventListener("keydown", handleKeyDown);
});
</script>

<template>
  <div
    class="fixed z-50 flex flex-col bg-surface-800 border border-surface-700 rounded-md shadow-md overflow-hidden"
    :style="{
      top: position.y + 'px',
      left: position.x + 'px',
      width: size.width + 'px',
      height: size.height + 'px',
    }"
  >
    <!-- Header -->
    <div
      class="flex items-center gap-2 px-2 py-1.5 bg-surface-900 cursor-move shrink-0"
      @mousedown="startDrag"
    >
      <button
        v-if="isViewingNote"
        class="flex items-center gap-1 text-xs text-surface-400 hover:text-surface-200 transition-colors bg-transparent border-none cursor-pointer px-1 py-0.5 rounded hover:bg-surface-700"
        @click="goBackToSearch"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="w-3 h-3"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back
      </button>
      <span class="text-xs text-surface-300 truncate flex-1">
        {{
          isViewingNote
            ? viewedNote?.name.replace(/\.json$/, "")
            : "Search Notes"
        }}
      </span>
      <button
        class="text-surface-500 hover:text-surface-200 transition-colors bg-transparent border-none cursor-pointer p-0.5 rounded hover:bg-surface-700"
        @click="close"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="w-3.5 h-3.5"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>

    <!-- Search State -->
    <template v-if="!isViewingNote">
      <SearchInput v-model="searchQuery" @search="search" />
      <SearchResults
        :results="searchResults"
        :selected-index="selectedIndex"
        @select="openNote"
      />
      <div
        class="flex items-center justify-end gap-2 px-2 py-1 text-xs text-surface-500 border-t border-surface-700 shrink-0"
      >
        <span>
          <strong class="bg-surface-700 px-1 py-0.5 rounded">↑↓</strong>
          navigate
        </span>
        <span>
          <strong class="bg-surface-700 px-1 py-0.5 rounded">↩</strong>
          open
        </span>
        <span>
          <strong class="bg-surface-700 px-1 py-0.5 rounded">esc</strong>
          close
        </span>
      </div>
    </template>

    <!-- View State -->
    <template v-if="viewedNote">
      <SearchNoteViewer :content="viewedNote.content" @save="saveNoteContent" />
      <div
        class="flex items-center justify-end gap-2 px-2 py-1 text-xs text-surface-500 border-t border-surface-700 shrink-0"
      >
        <span>
          <strong class="bg-surface-700 px-1 py-0.5 rounded">esc</strong>
          back
        </span>
      </div>
    </template>

    <!-- Resize Handle -->
    <div
      class="resize-handle absolute right-0 bottom-0 w-3 h-3 cursor-se-resize"
      @mousedown.stop="startResize"
    >
      <div
        class="absolute right-[3px] bottom-[3px] w-[5px] h-[5px] border-r-2 border-b-2 border-surface-500"
      />
    </div>
  </div>
</template>
