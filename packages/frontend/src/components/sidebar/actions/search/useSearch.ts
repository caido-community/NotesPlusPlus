import { computed, nextTick, ref } from "vue";

import { useNotesStore } from "@/stores/notes";
import { type SearchResult, useSearchStore } from "@/stores/search";
import { useTreeViewStore } from "@/stores/treeView";

export function useSearch() {
  const selectedIndex = ref(0);
  const searchResultsContainer = ref<HTMLElement | undefined>(undefined);
  const searchStore = useSearchStore();
  const notesStore = useNotesStore();
  const treeViewStore = useTreeViewStore();

  const modifierKey = computed(() =>
    navigator.userAgent.toUpperCase().indexOf("MAC") >= 0 ? "⌘" : "Ctrl",
  );

  const handleSearch = (query: string) => {
    searchStore.setSearchQuery(query);
    selectedIndex.value = 0;
  };

  const selectResult = (result: SearchResult) => {
    searchStore.setSearchQuery("");

    const pathParts = result.note.path.split("/").filter(Boolean);

    if (pathParts.length > 1) {
      let currentPath = "";
      for (let i = 0; i < pathParts.length - 1; i++) {
        currentPath += "/" + pathParts[i];
        treeViewStore.openNode(currentPath);
      }
    }

    notesStore.selectNote("/" + result.note.path);
  };

  const handleKeyNavigation = (key: string) => {
    if (searchStore.searchResults.length === 0 || !searchStore.searchQuery)
      return false;

    switch (key) {
      case "ArrowDown":
        selectedIndex.value = Math.min(
          selectedIndex.value + 1,
          searchStore.searchResults.length - 1,
        );
        scrollToSelected();
        return true;
      case "ArrowUp":
        selectedIndex.value = Math.max(selectedIndex.value - 1, 0);
        scrollToSelected();
        return true;
      case "Enter":
        if (selectedIndex.value >= 0) {
          selectResult(
            searchStore.searchResults[selectedIndex.value] as SearchResult,
          );
        } else if (searchStore.searchResults.length > 0) {
          selectResult(searchStore.searchResults[0] as SearchResult);
        }
        return true;
      case "Escape":
        searchStore.setSearchQuery("");
        return true;
    }
    return false;
  };

  const scrollToSelected = async () => {
    await nextTick();
    const container = searchResultsContainer.value;
    if (container) {
      const selectedElement = container.children[
        selectedIndex.value
      ] as HTMLElement;
      selectedElement?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  return {
    selectedIndex,
    searchResultsContainer,
    searchStore,
    modifierKey,
    handleSearch,
    selectResult,
    handleKeyNavigation,
    scrollToSelected,
  };
}
