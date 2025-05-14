import { defineStore } from "pinia";
import { type Note } from "shared";
import { computed, ref } from "vue";

import { useNotesRepository } from "@/repositories/notes";
import { useSDK } from "@/plugins/sdk";

export interface SearchResult {
  note: Note;
  path: string;
}

export const useSearchStore = defineStore("search", () => {
  const sdk = useSDK();
  const repository = useNotesRepository();

  const searchQuery = ref("");
  const isSearching = ref(false);
  const searchResults = ref<SearchResult[]>([]);

  const hasResults = computed(() => searchResults.value.length > 0);
  const isEmpty = computed(() => searchQuery.value.trim() === "");

  async function performSearch() {
    const query = searchQuery.value.trim();
    if (!query) {
      searchResults.value = [];
      return;
    }

    isSearching.value = true;
    try {
      const results = await repository.searchNotes(query);
      searchResults.value = results.map((note) => ({
        note,
        path: formatPathForDisplay(note.path),
      }));
    } catch (error) {
      searchResults.value = [];
      console.error("Search error:", error);
      sdk.window.showToast("Search error! Please look into the console logs.", {
        variant: "error",
      });
    } finally {
      isSearching.value = false;
    }
  }

  function formatPathForDisplay(path: string): string {
    const parts = path.split("/").filter(Boolean);

    if (parts.length <= 1) {
      return "";
    }

    return parts.slice(0, -1).join("/");
  }

  function setSearchQuery(query: string) {
    searchQuery.value = query;
    performSearch();
  }

  function clearSearch() {
    searchQuery.value = "";
    searchResults.value = [];
  }

  return {
    searchQuery,
    searchResults,
    isSearching,
    hasResults,
    isEmpty,
    setSearchQuery,
    clearSearch,
    performSearch,
  };
});
