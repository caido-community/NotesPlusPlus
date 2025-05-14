<script setup lang="ts">
import { computed, ref } from "vue";

import Tree from "./Tree.vue";
import TreeNode from "./TreeNode.vue";

import { useDragDropStore } from "@/stores/dragDrop";
import { useNotesStore } from "@/stores/notes";

const notesStore = useNotesStore();
const dragDropStore = useDragDropStore();
const tree = computed(() => notesStore.tree?.children);
const isDraggingOver = ref(false);

const handleRootDragOver = (event: DragEvent) => {
  if (event.target === event.currentTarget) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
      isDraggingOver.value = true;
    }
  }
};

const handleRootDragLeave = (event: DragEvent) => {
  if (event.target === event.currentTarget) {
    isDraggingOver.value = false;
  }
};

const handleRootDrop = (event: DragEvent) => {
  event.preventDefault();
  isDraggingOver.value = false;

  if (event.target !== event.currentTarget) return;
  if (!event.dataTransfer) return;

  const sourceData = dragDropStore.parseDropData(event.dataTransfer);
  if (!sourceData) return;

  if (sourceData.path !== "/") {
    dragDropStore.moveItem(sourceData.path, "/");
  }
};
</script>

<template>
  <div
    class="relative w-full h-full"
    :class="{
      'bg-slate-500/10 border border-dashed border-slate-400': isDraggingOver,
    }"
    @dragover="handleRootDragOver"
    @dragleave="handleRootDragLeave"
    @drop="handleRootDrop"
  >
    <Tree>
      <TreeNode
        v-for="node in tree"
        :key="JSON.stringify(node)"
        :tree-node="node"
      />
    </Tree>
  </div>
</template>
