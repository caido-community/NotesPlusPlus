<script setup lang="ts">
import SearchFooter from "./SearchFooter.vue";
import SearchInput from "./SearchInput.vue";
import { useSearch } from "./useSearch";

const {
  selectedIndex,
  searchResultsContainer,
  searchStore,
  modifierKey,
  handleSearch,
  selectResult,
  handleKeyNavigation,
} = useSearch();

const handleKeyDown = (event: KeyboardEvent) => {
  if (
    document.activeElement?.tagName === "INPUT" &&
    handleKeyNavigation(event.key)
  ) {
    event.preventDefault();
  }
};
</script>

<template>
  <div class="relative">
    <SearchInput
      :modifier-key="modifierKey"
      @search="handleSearch"
      @keydown="handleKeyDown"
    />

    <div
      v-if="searchStore.searchResults.length > 0"
      class="absolute top-full left-0 right-0 mt-1 bg-zinc-800 rounded-md border border-zinc-600 z-50 flex flex-col min-w-[250px]"
    >
      <div ref="searchResultsContainer" class="max-h-[260px] overflow-y-auto">
        <div
          v-for="(result, index) in searchStore.searchResults"
          :key="result.note.path"
          :class="[
            'px-3 py-2 cursor-pointer transition-colors duration-150',
            index === selectedIndex ? 'bg-zinc-700' : 'hover:bg-zinc-700',
          ]"
          @click="selectResult(result)"
        >
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 flex-1 min-w-0">
              <i class="fas fa-file-alt text-gray-400"></i>
              <div class="text-gray-200 text-sm truncate">
                {{ result.note.name }}
              </div>
            </div>
            <div v-if="result.path" class="text-xs text-gray-500 truncate ml-2">
              {{ result.path }}
            </div>
          </div>
        </div>
      </div>
      <SearchFooter />
    </div>
  </div>
</template>
