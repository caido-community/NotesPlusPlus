<script setup lang="ts">
import type { MenuItem } from "primevue/menuitem";

import { useContextMenuStore } from "@/stores/contextMenu";
import { useDragDropStore } from "@/stores/dragDrop";
import { useEditorStore } from "@/stores/editor";
import { useNotesStore } from "@/stores/notes";

const dragDropStore = useDragDropStore();
const contextMenuStore = useContextMenuStore();
const notesStore = useNotesStore();
const editorStore = useEditorStore();

const handleDragOver = (event: DragEvent) => {
  event.stopPropagation();
  event.preventDefault();

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }
};

const handleDrop = (event: DragEvent) => {
  event.stopPropagation();
  event.preventDefault();

  if (!event.dataTransfer) return;

  const sourceData = dragDropStore.parseDropData(event.dataTransfer);
  if (sourceData) {
    dragDropStore.moveItem(sourceData.path, "/");
  }
};

const handleContextMenu = (event: MouseEvent) => {
  if (event.target === event.currentTarget) {
    event.preventDefault();

    const menuItems: MenuItem[] = [
      {
        label: "Create Note",
        icon: "fas fa-file-alt",
        command: async () => {
          const newNote = await notesStore.createNote("/");
          if (newNote) {
            notesStore.selectNote(newNote.path);
            editorStore.startRenaming();
          }
        },
      },
      {
        label: "Create Folder",
        icon: "fas fa-folder-plus",
        command: async () => {
          await notesStore.createFolder("/");
        },
      },
    ];

    contextMenuStore.showContextMenu(event, menuItems);
  }
};
</script>

<template>
  <ul
    class="flex flex-col overflow-auto flex-grow"
    @dragover="handleDragOver"
    @drop="handleDrop"
    @contextmenu="handleContextMenu"
  >
    <slot />
  </ul>
</template>

<style scoped>
:deep([draggable="true"]) {
  cursor: grab;
}

:deep([draggable="true"]:active) {
  cursor: grabbing;
}

:deep(.dragging) {
  opacity: 0.5;
}
</style>
