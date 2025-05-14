import type { MenuItem } from "primevue/menuitem";
import { type Folder, type TreeNode } from "shared";
import { computed, nextTick, ref } from "vue";

import { useContextMenuStore } from "@/stores/contextMenu";
import { useEditorStore } from "@/stores/editor";
import { useNotesStore } from "@/stores/notes";
import { useTreeViewStore } from "@/stores/treeView";

/**
 * Composable for handling tree node functionality
 */
export function useTreeNode(node: TreeNode) {
  const notesStore = useNotesStore();
  const treeViewStore = useTreeViewStore();
  const contextMenuStore = useContextMenuStore();
  const editorStore = useEditorStore();

  const isRenaming = ref(false);
  const newName = ref("");
  const inputRef = ref<HTMLInputElement | undefined>(undefined);

  /**
   * Check if node is a folder
   */
  function isFolder(node: TreeNode): node is Folder {
    return node.type === "folder";
  }

  /**
   * Node children (if folder)
   */
  const children = computed(() => {
    if (isFolder(node)) {
      return node.children;
    }
    return [];
  });

  const hasChildren = computed(() => children.value.length > 0);
  const isOpen = computed(() => treeViewStore.isNodeOpen(node.path));
  const isSelected = computed(() => notesStore.currentNotePath === node.path);

  /**
   * Handle node click
   */
  function handleClick() {
    if (!isFolder(node)) {
      notesStore.selectNote(node.path);
    } else {
      treeViewStore.toggleNode(node.path);
    }
  }

  /**
   * Start renaming node
   */
  function startRename() {
    newName.value = node.name;
    isRenaming.value = true;

    nextTick(() => {
      if (inputRef.value) {
        inputRef.value.focus();
        inputRef.value.select();
      }
    });
  }

  /**
   * Save rename changes
   */
  function saveRename() {
    if (!newName.value.trim() || newName.value === node.name) {
      isRenaming.value = false;
      return;
    }

    notesStore.renameItem(node.path, newName.value);
    isRenaming.value = false;
  }

  /**
   * Cancel renaming
   */
  function cancelRename() {
    isRenaming.value = false;
  }

  /**
   * Get context menu items based on node type
   */
  function getContextMenuItems(): MenuItem[] {
    if (isFolder(node)) {
      return getFolderContextMenuItems();
    } else {
      return getNoteContextMenuItems();
    }
  }

  /**
   * Get context menu items for folder nodes
   */
  function getFolderContextMenuItems(): MenuItem[] {
    return [
      {
        label: "Create Note",
        icon: "fas fa-file-alt",
        command: () => newNote(),
      },
      {
        label: "Create Folder",
        icon: "fas fa-folder-plus",
        command: () => newFolder(),
      },
      {
        label: "Rename Folder",
        icon: "fas fa-edit",
        command: () => startRename(),
      },
      {
        label: "Delete Folder",
        icon: "fas fa-trash",
        command: () => notesStore.deleteFolder(node.path),
      },
    ];
  }

  async function newNote() {
    const newNote = await notesStore.createNote(node.path);
    if (newNote) {
      treeViewStore.openNode(node.path);
      notesStore.selectNote(newNote.path);
      editorStore.startRenaming();
    }
  }

  async function newFolder() {
    const newFolder = await notesStore.createFolder(node.path);
    if (newFolder) {
      treeViewStore.openNode(node.path);
    }
  }

  /**
   * Get context menu items for note nodes
   */
  function getNoteContextMenuItems(): MenuItem[] {
    return [
      {
        label: "Rename Note",
        icon: "fas fa-edit",
        command: () => startRename(),
      },
      {
        label: "Delete Note",
        icon: "fas fa-trash",
        command: () => notesStore.deleteNote(node.path),
      },
    ];
  }

  /**
   * Handle right-click to show context menu
   */
  function handleContextMenu(event: MouseEvent) {
    event.preventDefault();
    contextMenuStore.showContextMenu(event, getContextMenuItems());
  }

  return {
    isFolder,
    children,
    hasChildren,
    isOpen,
    isSelected,
    isRenaming,
    newName,
    inputRef,
    handleClick,
    handleContextMenu,
    startRename,
    saveRename,
    cancelRename,
  };
}
