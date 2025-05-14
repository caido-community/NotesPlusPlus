import { defineStore } from "pinia";
import { type TreeNode } from "shared";
import { ref } from "vue";

import { useNotesStore } from "./notes";

import { useSDK } from "@/plugins/sdk";

export interface DragData {
  path: string;
  name: string;
  type: string;
}

export const useDragDropStore = defineStore("dragDrop", () => {
  const sdk = useSDK();
  const notesStore = useNotesStore();

  const isDragging = ref(false);
  const currentDragItem = ref<DragData | undefined>(undefined);

  function setDragItem(item: DragData | undefined) {
    currentDragItem.value = item;
    isDragging.value = !!item;
  }

  function handleDragStart(event: DragEvent, node: TreeNode) {
    if (!event.dataTransfer) return;

    event.dataTransfer.effectAllowed = "move";
    const dragData: DragData = {
      path: node.path,
      name: node.name,
      type: node.type,
    };

    setDragItem(dragData);
    event.dataTransfer.setData("application/json", JSON.stringify(dragData));

    if (event.target instanceof HTMLElement) {
      event.target.classList.add("dragging");
    }
  }

  function handleDragEnd(event: DragEvent) {
    if (event.target instanceof HTMLElement) {
      event.target.classList.remove("dragging");
    }
    setDragItem(undefined);
  }

  function isFolder(node: TreeNode): boolean {
    return node.type === "folder";
  }

  function parseDropData(dataTransfer: DataTransfer): DragData | undefined {
    try {
      return JSON.parse(dataTransfer.getData("application/json"));
    } catch (e) {
      sdk.window.showToast("Invalid drag data", { variant: "error" });
      return undefined;
    }
  }

  function canDrop(sourcePath: string, targetPath: string): boolean {
    if (sourcePath === targetPath) {
      return false;
    }

    if (targetPath.startsWith(sourcePath + "/")) {
      sdk.window.showToast("Cannot move a folder into its own subfolder", {
        variant: "error",
      });
      return false;
    }

    return true;
  }

  function buildNewPath(sourcePath: string, targetPath: string): string {
    const sourcePathParts = sourcePath.split("/");
    const sourceItemName = sourcePathParts[sourcePathParts.length - 1];
    return targetPath === "/"
      ? `/${sourceItemName}`
      : `${targetPath}/${sourceItemName}`;
  }

  async function moveItem(sourcePath: string, targetPath: string) {
    if (!canDrop(sourcePath, targetPath)) return;

    const sourceNode = notesStore.findNode(sourcePath);
    if (!sourceNode) {
      sdk.window.showToast("Source item not found", { variant: "error" });
      return;
    }

    const newPath = buildNewPath(sourcePath, targetPath);
    return await notesStore.moveItem(
      sourcePath,
      newPath,
      sourceNode.type === "folder",
    );
  }

  return {
    isDragging,
    currentDragItem,
    handleDragStart,
    handleDragEnd,
    parseDropData,
    canDrop,
    moveItem,
    isFolder,
  };
});
