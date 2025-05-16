import { Extension, type Range } from "@tiptap/core";
import { type Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    search: {
      /**
       * @description Set search term in extension.
       */
      setSearchTerm: (searchTerm: string) => ReturnType;
      /**
       * @description Set case sensitivity in extension.
       */
      setCaseSensitive: (caseSensitive: boolean) => ReturnType;
      /**
       * @description Reset current search result to first instance.
       */
      resetIndex: () => ReturnType;
      /**
       * @description Find next instance of search result.
       */
      nextSearchResult: () => ReturnType;
      /**
       * @description Find previous instance of search result.
       */
      previousSearchResult: () => ReturnType;
      /**
       * @description Toggle search UI visibility.
       */
      toggleSearch: () => ReturnType;
    };
  }
}

interface TextNodesWithPosition {
  text: string;
  pos: number;
}

const getRegex = (
  s: string,
  disableRegex: boolean,
  caseSensitive: boolean,
): RegExp => {
  return RegExp(
    disableRegex ? s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : s,
    caseSensitive ? "gu" : "gui",
  );
};

interface ProcessedSearches {
  decorationsToReturn: DecorationSet;
  results: Range[];
}

const MAX_DECORATIONS = 1000;

function processSearches(
  doc: PMNode,
  searchTerm: RegExp,
  searchResultClass: string,
  resultIndex: number,
): ProcessedSearches {
  const decorations: Decoration[] = [];
  const results: Range[] = [];

  let textNodesWithPosition: TextNodesWithPosition[] = [];
  let index = 0;

  if (!searchTerm) {
    return {
      decorationsToReturn: DecorationSet.empty,
      results: [],
    };
  }

  if (
    searchTerm.toString() === "/(?:)/gui" ||
    searchTerm.toString() === "/(?:)/gu"
  ) {
    return {
      decorationsToReturn: DecorationSet.empty,
      results: [],
    };
  }

  doc?.descendants((node, pos) => {
    if (node.isText) {
      if (textNodesWithPosition[index]) {
        const currentNode = textNodesWithPosition[index];
        if (currentNode && node.text) {
          textNodesWithPosition[index] = {
            text: currentNode.text + node.text,
            pos: currentNode.pos,
          };
        }
      } else {
        if (node.text) {
          textNodesWithPosition[index] = {
            text: node.text,
            pos,
          };
        }
      }
    } else {
      index += 1;
    }
  });

  textNodesWithPosition = textNodesWithPosition.filter(Boolean);

  let totalMatches = 0;
  for (const element of textNodesWithPosition) {
    const { text, pos } = element;

    try {
      const matches = Array.from(text.matchAll(searchTerm)).filter(
        ([matchText]) => matchText?.trim(),
      );

      for (const m of matches) {
        if (m[0] === "") break;
        if (totalMatches >= MAX_DECORATIONS * 2) break;

        if (m.index !== undefined) {
          results.push({
            from: pos + m.index,
            to: pos + m.index + m[0].length,
          });
          totalMatches++;
        }
      }
    } catch (e) {
      console.error("Error in regex search:", e);
    }

    if (totalMatches >= MAX_DECORATIONS * 2) break;
  }

  const startIdx = Math.max(0, resultIndex - Math.floor(MAX_DECORATIONS / 2));
  const endIdx = Math.min(results.length, startIdx + MAX_DECORATIONS);
  const visibleResults = results.slice(startIdx, endIdx);

  const currentResult = results[resultIndex];
  const hasCurrentResultInView =
    currentResult &&
    visibleResults.some(
      (r) => r.from === currentResult.from && r.to === currentResult.to,
    );

  for (let i = 0; i < visibleResults.length; i += 1) {
    const r = visibleResults[i];
    if (r) {
      const absoluteIndex = startIdx + i;
      const className =
        absoluteIndex === resultIndex
          ? `${searchResultClass} ${searchResultClass}-current`
          : searchResultClass;
      const decoration: Decoration = Decoration.inline(r.from, r.to, {
        class: className,
      });

      decorations.push(decoration);
    }
  }

  if (currentResult && !hasCurrentResultInView) {
    const decoration: Decoration = Decoration.inline(
      currentResult.from,
      currentResult.to,
      {
        class: `${searchResultClass} ${searchResultClass}-current`,
      },
    );
    decorations.push(decoration);
  }

  return {
    decorationsToReturn: DecorationSet.create(doc, decorations),
    results,
  };
}

export const searchPluginKey = new PluginKey("searchPlugin");

export interface SearchOptions {
  searchResultClass: string;
  disableRegex: boolean;
}

export interface SearchStorage {
  searchTerm: string;
  results: Range[];
  lastSearchTerm: string;
  caseSensitive: boolean;
  lastCaseSensitive: boolean;
  resultIndex: number;
  lastResultIndex: number;
  isSearchOpen: boolean;
}

export const Search = Extension.create<SearchOptions, SearchStorage>({
  name: "search",

  addOptions() {
    return {
      searchResultClass: "search-result",
      disableRegex: true,
    };
  },

  addStorage() {
    return {
      searchTerm: "",
      results: [],
      lastSearchTerm: "",
      caseSensitive: false,
      lastCaseSensitive: false,
      resultIndex: 0,
      lastResultIndex: 0,
      isSearchOpen: false,
    };
  },

  addCommands() {
    return {
      setSearchTerm:
        (searchTerm: string) =>
        ({ editor }) => {
          editor.storage.search.searchTerm = searchTerm;
          return true;
        },
      setCaseSensitive:
        (caseSensitive: boolean) =>
        ({ editor }) => {
          editor.storage.search.caseSensitive = caseSensitive;
          return true;
        },
      resetIndex:
        () =>
        ({ editor }) => {
          editor.storage.search.resultIndex = 0;
          return true;
        },
      nextSearchResult:
        () =>
        ({ editor, commands }) => {
          const { results, resultIndex } = editor.storage.search;

          if (!results.length) return false;

          const nextIndex = resultIndex + 1;

          if (results[nextIndex]) {
            editor.storage.search.resultIndex = nextIndex;
          } else {
            editor.storage.search.resultIndex = 0;
          }

          const currentResult = results[editor.storage.search.resultIndex];
          if (currentResult) {
            commands.setTextSelection({
              from: currentResult.from,
              to: currentResult.to,
            });

            setTimeout(() => {
              const domElement = document.querySelector(
                ".search-result.search-result-current",
              );
              if (domElement) {
                domElement.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                });
              }
            }, 10);
          }

          return true;
        },
      previousSearchResult:
        () =>
        ({ editor, commands }) => {
          const { results, resultIndex } = editor.storage.search;

          if (!results.length) return false;

          const prevIndex = resultIndex - 1;

          if (results[prevIndex]) {
            editor.storage.search.resultIndex = prevIndex;
          } else {
            editor.storage.search.resultIndex = results.length - 1;
          }

          const currentResult = results[editor.storage.search.resultIndex];
          if (currentResult) {
            commands.setTextSelection({
              from: currentResult.from,
              to: currentResult.to,
            });

            setTimeout(() => {
              const domElement = document.querySelector(
                ".search-result.search-result-current",
              );
              if (domElement) {
                domElement.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                });
              }
            }, 10);
          }

          return true;
        },
      toggleSearch:
        () =>
        ({ editor }) => {
          editor.storage.search.isSearchOpen =
            !editor.storage.search.isSearchOpen;
          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-f": () => {
        return this.editor.commands.toggleSearch();
      },
    };
  },

  addProseMirrorPlugins() {
    const editor = this.editor;
    const { searchResultClass, disableRegex } = this.options;

    const setLastSearchTerm = (t: string) =>
      (editor.storage.search.lastSearchTerm = t);
    const setLastCaseSensitive = (t: boolean) =>
      (editor.storage.search.lastCaseSensitive = t);
    const setLastResultIndex = (t: number) =>
      (editor.storage.search.lastResultIndex = t);

    return [
      new Plugin({
        key: searchPluginKey,
        state: {
          init: () => DecorationSet.empty,
          apply({ doc, docChanged }, oldState) {
            const {
              searchTerm,
              lastSearchTerm,
              caseSensitive,
              lastCaseSensitive,
              resultIndex,
              lastResultIndex,
            } = editor.storage.search;

            if (
              !docChanged &&
              lastSearchTerm === searchTerm &&
              lastCaseSensitive === caseSensitive &&
              lastResultIndex === resultIndex
            )
              return oldState;

            setLastSearchTerm(searchTerm);
            setLastCaseSensitive(caseSensitive);
            setLastResultIndex(resultIndex);

            if (!searchTerm) {
              editor.storage.search.results = [];
              return DecorationSet.empty;
            }

            try {
              const { decorationsToReturn, results } = processSearches(
                doc,
                getRegex(searchTerm, disableRegex, caseSensitive),
                searchResultClass,
                resultIndex,
              );

              editor.storage.search.results = results;
              return decorationsToReturn;
            } catch (e) {
              console.error("Search error:", e);
              editor.storage.search.results = [];
              return DecorationSet.empty;
            }
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});

export default Search;
