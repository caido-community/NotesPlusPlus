<template>
  <div v-if="isSearchOpen" class="search-ui-container">
    <div class="search-ui">
      <div class="search-input-container">
        <input
          ref="searchInput"
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="Search..."
          @input="onSearchInput"
          @keydown.enter.exact.prevent="findNext"
          @keydown.esc.prevent="closeSearch"
          @keydown.shift.enter.prevent="findPrev"
        />
        <div v-if="resultsCount > 0" class="search-count">
          {{ currentIndex + 1 }} of {{ resultsCount }}
          <span
            v-if="resultsCount > 1000"
            class="search-count-note"
            title="For performance reasons, only a portion of matches are highlighted"
            >*</span
          >
        </div>
        <div v-else class="search-count">No results</div>
      </div>
      <div class="search-controls">
        <button
          class="search-button"
          title="Previous Match (Shift+Enter)"
          :disabled="resultsCount === 0"
          @click="findPrev"
        >
          <span class="icon">↑</span>
        </button>
        <button
          class="search-button"
          title="Next Match (Enter)"
          :disabled="resultsCount === 0"
          @click="findNext"
        >
          <span class="icon">↓</span>
        </button>
        <button
          class="search-button close-button"
          title="Close (Esc)"
          @click="closeSearch"
        >
          <span class="icon">×</span>
        </button>
      </div>
    </div>
    <div v-if="resultsCount > 1000" class="search-info-message">
      For performance reasons, only some matches are highlighted.
      <br />All results are still navigable.
    </div>
  </div>
</template>

<script setup lang="ts">
import { type Editor } from "@tiptap/core";
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";

const props = defineProps<{
  editor: Editor;
}>();

const searchQuery = ref("");
const debounceTimeout = ref<number | undefined>(undefined);

const isSearchOpen = computed(() => {
  return props.editor.storage.search?.isSearchOpen || false;
});

const resultsCount = computed(() => {
  return props.editor.storage.search?.results?.length || 0;
});

const currentIndex = computed(() => {
  return props.editor.storage.search?.resultIndex || 0;
});

const searchInput = ref<HTMLInputElement | undefined>(undefined);

const onSearchInput = () => {
  if (debounceTimeout.value) {
    clearTimeout(debounceTimeout.value);
  }

  debounceTimeout.value = window.setTimeout(() => {
    updateSearch();
  }, 150);
};

const updateSearch = () => {
  props.editor.commands.setSearchTerm(searchQuery.value);
};

const findNext = () => {
  props.editor.commands.nextSearchResult();
};

const findPrev = () => {
  props.editor.commands.previousSearchResult();
};

const closeSearch = () => {
  props.editor.commands.toggleSearch();
};

watch(isSearchOpen, (isOpen) => {
  if (isOpen) {
    nextTick(() => {
      searchInput.value?.focus();
    });
  } else {
    searchQuery.value = "";
    if (debounceTimeout.value) {
      clearTimeout(debounceTimeout.value);
    }
    props.editor.commands.setSearchTerm("");
  }
});

onUnmounted(() => {
  if (debounceTimeout.value) {
    clearTimeout(debounceTimeout.value);
  }
});

const handleKeyDown = (event: KeyboardEvent) => {
  if (isSearchOpen.value && event.key === "Escape") {
    closeSearch();
    event.preventDefault();
  }
};

onMounted(() => {
  document.addEventListener("keydown", handleKeyDown);
});

onUnmounted(() => {
  document.removeEventListener("keydown", handleKeyDown);
});
</script>

<style>
.search-ui-container {
  position: fixed;
  top: 0.75rem;
  right: 0.75rem;
  z-index: 100;
}

.search-ui {
  display: flex;
  align-items: center;
  background-color: var(--color-surface-800, #1e1e1e);
  border: 1px solid var(--color-surface-600, #444);
  border-radius: 0.375rem;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  padding: 0.5rem;
}

.search-input-container {
  display: flex;
  align-items: center;
  width: 240px;
}

.search-input {
  flex-grow: 1;
  background-color: var(--color-surface-900, #121212);
  border: 1px solid var(--color-surface-700, #333);
  border-radius: 0.25rem;
  padding: 0.375rem 0.5rem;
  color: var(--color-surface-200, #e5e5e5);
  font-size: 0.875rem;
}

.search-count {
  margin-left: 0.75rem;
  font-size: 0.75rem;
  color: var(--color-surface-400, #a0a0a0);
  min-width: 60px;
  text-align: right;
}

.search-count-note {
  color: var(--color-primary-400, #818cf8);
  cursor: help;
}

.search-info-message {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: var(--color-surface-300, #d1d5db);
  background-color: var(--color-surface-800, #1e1e1e);
  border: 1px solid var(--color-surface-600, #444);
  border-radius: 0.25rem;
  padding: 0.375rem 0.5rem;
  text-align: right;
  max-width: 25rem;
  animation: fade-in 0.2s ease-in-out;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

@keyframes fade-in {
  0% {
    opacity: 0;
    transform: translateY(-0.25rem);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.search-controls {
  display: flex;
  align-items: center;
  margin-left: 0.5rem;
}

.search-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  background-color: var(--color-surface-700, #333);
  border: none;
  border-radius: 0.25rem;
  margin-left: 0.25rem;
  color: var(--color-surface-200, #e5e5e5);
  cursor: pointer;
}

.search-button:hover:not(:disabled) {
  background-color: var(--color-surface-600, #444);
}

.search-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.search-button .icon {
  font-size: 0.875rem;
  line-height: 1;
}

.close-button {
  margin-left: 0.5rem;
}

.close-button .icon {
  font-size: 1.25rem;
}

.search-options {
  display: flex;
  align-items: center;
  margin-left: 0.5rem;
  padding-left: 0.5rem;
  border-left: 1px solid var(--color-surface-600, #444);
}
</style>
