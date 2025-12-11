import { defineStore } from "pinia";
import {
  type Folder,
  type Note,
  type NoteContent,
  type TreeNode,
} from "shared";
import { computed, ref } from "vue";

import { useSDK } from "@/plugins/sdk";
import { useNotesRepository } from "@/repositories/notes";
import { useTreeViewStore } from "@/stores/treeView";
import { emitter } from "@/utils/eventBus";

export const useNotesStore = defineStore("notes", () => {
  const sdk = useSDK();
  const repository = useNotesRepository();

  const tree = ref<Folder | undefined>(undefined);

  const currentNotePath = ref<string | undefined>(undefined);
  const currentNote = computed(() => {
    if (!currentNotePath.value || !tree.value) return undefined;

    const node = findNode(currentNotePath.value);
    if (node && node.type === "note") {
      return node as Note;
    }
  });

  const notesHistory = ref<string[]>([]);
  const historyIndex = ref<number>(-1);
  const isSaving = ref(false);

  /**
   * Find a node by path
   */
  function findNode(path: string): TreeNode | undefined {
    if (!tree.value) return undefined;
    if (path === "/") return tree.value;

    const findNodeByPath = (
      currentPath: string,
      currentFolder: Folder,
    ): TreeNode | undefined => {
      if (currentFolder.path === currentPath) {
        return currentFolder;
      }

      for (const child of currentFolder.children) {
        if (child.path === currentPath) {
          return child;
        }

        if (child.type === "folder") {
          const result = findNodeByPath(currentPath, child as Folder);
          if (result) return result;
        }
      }

      return undefined;
    };

    return findNodeByPath(path, tree.value);
  }

  /**
   * Find the first note in the tree
   */
  function findFirstNote(
    folder: Folder = tree.value as Folder,
  ): string | undefined {
    if (!folder) return undefined;

    const firstNote = folder.children.find((child) => child.type === "note");
    if (firstNote) {
      return firstNote.path;
    }

    for (const child of folder.children) {
      if (child.type === "folder") {
        const notePath = findFirstNote(child as Folder);
        if (notePath) {
          return notePath;
        }
      }
    }

    return undefined;
  }

  /**
   * Initialize the store by loading the note tree
   */
  async function initialize() {
    try {
      await refreshTree();
    } catch (error) {
      sdk.window.showToast(`Error initializing notes: ${error}`, {
        variant: "error",
      });
    }
  }

  /**
   * Refresh the file tree
   */
  async function refreshTree() {
    try {
      const result = await repository.getTree();
      if (result) {
        tree.value = structuredClone(result);

        if (!currentNotePath.value) {
          const firstNotePath = findFirstNote();
          if (firstNotePath) {
            selectNote(firstNotePath);
          }
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("No project found")) {
        return;
      }
      sdk.window.showToast(`Error loading note tree: ${error}`, {
        variant: "error",
      });
    }
  }

  /**
   * Load a specific note by path
   */
  async function loadNote(path: string) {
    try {
      const note = await repository.getNote(path);
      if (note) {
        currentNotePath.value = path;
      }
    } catch (error) {
      sdk.window.showToast(`Error loading note: ${error}`, {
        variant: "error",
      });
    }
  }

  /**
   * Create a new note
   */
  async function createNote(
    parentPath: string,
    noteName?: string,
    content: NoteContent = { type: "doc", content: [] },
  ) {
    if (!noteName) {
      noteName = await generateUntitledName(parentPath);
    }

    noteName = noteName.endsWith(".json") ? noteName : `${noteName}.json`;
    const path =
      parentPath === "/" ? `/${noteName}` : `${parentPath}/${noteName}`;

    try {
      const newNote = await repository.createNote(path, content);
      if (newNote) {
        await refreshTree();
        selectNote(path);
        return newNote;
      }
    } catch (error) {
      sdk.window.showToast(`Error creating note: ${error}`, {
        variant: "error",
      });
    }

    return undefined;
  }

  /**
   * Generate an "Untitled X" name that doesn't exist in the parent folder
   */
  async function generateUntitledName(parentPath: string): Promise<string> {
    if (!tree.value) await refreshTree();

    const parentNode = findNode(parentPath);
    if (!parentNode || parentNode.type !== "folder") {
      return "Untitled";
    }

    const parentFolder = parentNode as Folder;
    const existingNames = new Set(
      parentFolder.children
        .filter((node) => node.type === "note")
        .map((node) => node.name.replace(/\.json$/, "")),
    );

    let counter = 1;
    let newName = `Untitled ${counter}`;

    while (existingNames.has(newName)) {
      counter++;
      newName = `Untitled ${counter}`;
    }

    return newName;
  }

  /**
   * Generate a "New Folder X" name that doesn't exist in the parent folder
   */
  async function generateUntitledFolderName(
    parentPath: string,
  ): Promise<string> {
    if (!tree.value) await refreshTree();

    const parentNode = findNode(parentPath);
    if (!parentNode || parentNode.type !== "folder") {
      return "New Folder";
    }

    const parentFolder = parentNode as Folder;
    const existingNames = new Set(
      parentFolder.children
        .filter((node) => node.type === "folder")
        .map((node) => node.name),
    );

    let counter = 1;
    let newName = "New Folder";

    if (existingNames.has(newName)) {
      newName = `New Folder ${counter}`;
      while (existingNames.has(newName)) {
        counter++;
        newName = `New Folder ${counter}`;
      }
    }

    return newName;
  }

  /**
   * Create a new folder
   */
  async function createFolder(parentPath: string, name?: string) {
    let folderName = name;

    if (!folderName) {
      folderName = await generateUntitledFolderName(parentPath);
    }

    const cleanedName = folderName.replace(/[/\\]/g, "-");
    const path =
      parentPath === "/" ? `/${cleanedName}` : `${parentPath}/${cleanedName}`;

    try {
      const newFolder = await repository.createFolder(path);
      if (newFolder) {
        await refreshTree();
        return newFolder;
      }
    } catch (error) {
      sdk.window.showToast(`Error creating folder: ${error}`, {
        variant: "error",
      });
    }
    return undefined;
  }

  /**
   * Delete a note by path
   */
  async function deleteNote(path: string) {
    try {
      const success = await repository.deleteNote(path);
      if (success) {
        if (currentNotePath.value === path) {
          currentNotePath.value = undefined;
        }
        await refreshTree();
      }
      return success;
    } catch (error) {
      sdk.window.showToast(`Error deleting note: ${error}`, {
        variant: "error",
      });
      return false;
    }
  }

  /**
   * Save the open state of a folder and all its descendants
   */
  function saveOpenState(path: string): Map<string, boolean> {
    const treeViewStore = useTreeViewStore();
    const openStates = new Map<string, boolean>();

    if (!tree.value) return openStates;

    const node = findNode(path);
    if (!node || node.type !== "folder") return openStates;

    const saveNodeOpenState = (nodePath: string, folder: Folder) => {
      openStates.set(nodePath, treeViewStore.isNodeOpen(nodePath));

      for (const child of folder.children) {
        if (child.type === "folder") {
          saveNodeOpenState(child.path, child as Folder);
        }
      }
    };

    saveNodeOpenState(path, node as Folder);
    return openStates;
  }

  /**
   * Restore the open state of folders with path mapping
   */
  function restoreOpenState(
    oldStates: Map<string, boolean>,
    oldPrefix: string,
    newPrefix: string,
  ) {
    const treeViewStore = useTreeViewStore();

    oldStates.forEach((isOpen, oldPath) => {
      if (oldPath.startsWith(oldPrefix)) {
        const relativePath = oldPath.slice(oldPrefix.length);
        const newPath = newPrefix + relativePath;

        if (isOpen) {
          treeViewStore.openNode(newPath);
        }
      }
    });
  }

  /**
   * Rename/move a note or folder
   */
  async function moveItem(oldPath: string, newPath: string, isFolder: boolean) {
    try {
      if (!isFolder && !newPath.endsWith(".json")) {
        newPath += ".json";
      }

      let openStates = new Map<string, boolean>();
      if (isFolder) {
        openStates = saveOpenState(oldPath);
      }

      let currentNoteRelativePath: string | undefined = undefined;
      if (isFolder && currentNotePath.value) {
        const isExactFolder = currentNotePath.value === oldPath;
        const isInSubfolder = currentNotePath.value.startsWith(oldPath + "/");

        if (isExactFolder || isInSubfolder) {
          currentNoteRelativePath = currentNotePath.value.slice(oldPath.length);
        }
      }

      const success = await repository.moveItem(oldPath, newPath);
      if (success) {
        if (currentNotePath.value === oldPath) {
          currentNotePath.value = newPath;
        } else if (isFolder && currentNoteRelativePath !== undefined) {
          const newNotePath = newPath + currentNoteRelativePath;
          currentNotePath.value = newNotePath;

          if (
            historyIndex.value >= 0 &&
            historyIndex.value < notesHistory.value.length
          ) {
            notesHistory.value[historyIndex.value] = newNotePath;
          }
        }

        await refreshTree();

        if (isFolder) {
          restoreOpenState(openStates, oldPath, newPath);
        }
      } else {
        sdk.window.showToast(`Error occured while moving item`, {
          variant: "error",
        });
      }
      return success;
    } catch (error) {
      sdk.window.showToast(`Error moving item: ${error}`, {
        variant: "error",
      });
      return false;
    }
  }

  /**
   * Rename a note or folder
   */
  async function renameItem(path: string, newName: string) {
    try {
      if (newName.includes("/") || newName.includes("\\")) {
        throw new Error("New name cannot contain slashes");
      }

      const node = findNode(path);
      if (!node) {
        throw new Error(`Item not found: ${path}`);
      }

      const isFolder = node.type === "folder";
      const pathParts = path.split("/");
      const parentPath = pathParts.slice(0, -1).join("/") || "/";

      const finalName = isFolder
        ? newName
        : newName.endsWith(".json")
          ? newName
          : `${newName}.json`;

      const newPath =
        parentPath === "/" ? `/${finalName}` : `${parentPath}/${finalName}`;

      if (newPath === path) return true;

      return await moveItem(path, newPath.replace(/\.json$/, ""), isFolder);
    } catch (error) {
      sdk.window.showToast(`Error renaming item: ${error}`, {
        variant: "error",
      });
      return false;
    }
  }

  /**
   * Select a note by path or undefined to deselect
   */
  function selectNote(path: string | undefined) {
    if (path === currentNotePath.value) return;

    if (
      historyIndex.value >= 0 &&
      historyIndex.value < notesHistory.value.length - 1
    ) {
      notesHistory.value = notesHistory.value.slice(0, historyIndex.value + 1);
    }

    if (path !== undefined) {
      notesHistory.value.push(path);
      historyIndex.value = notesHistory.value.length - 1;
    }

    currentNotePath.value = path;
  }

  /**
   * Go back to the previous note
   */
  function goBack() {
    if (historyIndex.value <= 0) return;

    historyIndex.value--;
    const previousPath = notesHistory.value[historyIndex.value] || undefined;
    currentNotePath.value = previousPath;
  }

  /**
   * Go forward to the next note
   */
  function goForward() {
    if (historyIndex.value >= notesHistory.value.length - 1) return;

    historyIndex.value++;
    const nextPath = notesHistory.value[historyIndex.value] || undefined;
    currentNotePath.value = nextPath;
  }

  /**
   * Check if we can go back
   */
  function canGoBack() {
    return historyIndex.value > 0;
  }

  /**
   * Check if we can go forward
   */
  function canGoForward() {
    return historyIndex.value < notesHistory.value.length - 1;
  }

  /**
   * Search for notes by content or tags
   */
  async function searchNotes(query: string) {
    try {
      return await repository.searchNotes(query);
    } catch (error) {
      sdk.window.showToast(`Error searching notes: ${error}`, {
        variant: "error",
      });
      return [];
    }
  }

  /**
   * Update the content of a note
   */
  async function updateNoteContent(path: string, content: NoteContent) {
    try {
      return await repository.updateNote(path, { content });
    } catch (error) {
      sdk.window.showToast(`Error updating note content: ${error}`, {
        variant: "error",
      });
      return false;
    }
  }

  /**
   * Delete a folder by path
   */
  async function deleteFolder(path: string) {
    try {
      const isCurrentNoteExactFolder = currentNotePath.value === path;
      const isCurrentNoteInSubfolder =
        currentNotePath.value && currentNotePath.value.startsWith(path + "/");

      const success = await repository.deleteFolder(path);
      if (success) {
        if (isCurrentNoteExactFolder || isCurrentNoteInSubfolder) {
          currentNotePath.value = undefined;

          const firstNotePath = findFirstNote();
          if (firstNotePath) {
            selectNote(firstNotePath);
          }
        }
        await refreshTree();
      }
      return success;
    } catch (error) {
      sdk.window.showToast(`Error deleting folder: ${error}`, {
        variant: "error",
      });
      return false;
    }
  }

  emitter.on("refreshTree", (affected) => {
    if (affected > 0) {
      refreshTree();
    }

    sdk.window.showToast(`${affected} notes were affected by the migration`, {
      variant: "info",
    });
  });

  sdk.backend.onEvent("notes++:projectChange", async () => {
    currentNotePath.value = undefined;
    await refreshTree();
  });

  return {
    currentNotePath,
    currentNote,
    tree,
    notesHistory,
    historyIndex,
    isSaving,

    findNode,
    initialize,
    refreshTree,
    loadNote,
    createNote,
    createFolder,
    deleteNote,
    deleteFolder,
    moveItem,
    renameItem,
    selectNote,
    searchNotes,
    updateNoteContent,
    goBack,
    goForward,
    canGoBack,
    canGoForward,
  };
});
