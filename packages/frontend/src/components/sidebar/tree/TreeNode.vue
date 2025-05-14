<script setup lang="ts">
import { type TreeNode } from "shared";
import { computed, ref } from "vue";

import Arrow from "./Arrow.vue";

import { useTreeNode } from "@/composables/useTreeNode";
import { useDragDropStore } from "@/stores/dragDrop";

const dragDropStore = useDragDropStore();
const props = defineProps<{
  treeNode: TreeNode;
}>();

const treeNode = computed(() => props.treeNode);
const isDragOver = ref(false);
const preventNextBlur = ref(false);

const {
  children,
  hasChildren,
  isOpen,
  isSelected,
  isRenaming,
  newName,
  inputRef,
  startRename,
  isFolder,
  handleClick,
  handleContextMenu,
  saveRename,
  cancelRename,
} = useTreeNode(props.treeNode);

const handleDragStart = (event: DragEvent) => {
  dragDropStore.handleDragStart(event, props.treeNode);
};

const handleDragEnd = (event: DragEvent) => {
  dragDropStore.handleDragEnd(event);
  isDragOver.value = false;
};

const handleDragOver = (event: DragEvent) => {
  event.stopPropagation();
  event.preventDefault();

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }

  if (dragDropStore.isFolder(props.treeNode)) {
    isDragOver.value = true;
  }
};

const handleDragLeave = (event: DragEvent) => {
  event.stopPropagation();
  isDragOver.value = false;
};

const handleDrop = (event: DragEvent) => {
  event.stopPropagation();
  event.preventDefault();
  isDragOver.value = false;

  if (!event.dataTransfer) return;

  const sourceData = dragDropStore.parseDropData(event.dataTransfer);
  if (!sourceData) return;

  if (dragDropStore.isFolder(props.treeNode)) {
    dragDropStore.moveItem(sourceData.path, props.treeNode.path);
  }
};

const handleEnterKey = (event: KeyboardEvent) => {
  event.preventDefault();
  preventNextBlur.value = true;
  saveRename();
};

const handleBlur = () => {
  if (preventNextBlur.value) {
    preventNextBlur.value = false;
    return;
  }
  saveRename();
};
</script>

<template>
  <li class="flex flex-col cursor-pointer select-none">
    <div
      class="flex items-center space-x-2 font-mono font-medium px-1 text-ellipsis whitespace-nowrap overflow-hidden h-7"
      :class="[
        isSelected ? 'bg-slate-300/20' : 'hover:bg-slate-500/10',
        isDragOver && isFolder(treeNode)
          ? 'bg-slate-500/30 border border-dashed border-slate-400'
          : '',
      ]"
      draggable="true"
      @click="handleClick"
      @dblclick="treeNode.type !== 'folder' && startRename()"
      @contextmenu="handleContextMenu"
      @dragstart="handleDragStart"
      @dragend="handleDragEnd"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
    >
      <template v-if="isFolder(treeNode)">
        <Arrow class="h-4 w-4 shrink-0 text-zinc-400" :open="isOpen" />
      </template>
      <template v-else>
        <span class="h-4 w-4 shrink-0 fas fa-file-alt"></span>
      </template>

      <input
        v-if="isRenaming"
        ref="inputRef"
        v-model="newName"
        class="bg-slate-600/30 text-zinc-100 outline-none px-1 rounded w-full"
        @click.stop
        @keydown.enter="handleEnterKey"
        @keyup.esc="cancelRename"
        @blur="handleBlur"
      />
      <span
        v-else
        class="text-ellipsis whitespace-nowrap overflow-hidden"
        :class="isFolder(treeNode) ? 'text-zinc-400' : 'text-zinc-100'"
      >
        {{ treeNode.name }}
      </span>
    </div>

    <ul v-if="hasChildren && isOpen" class="pl-4">
      <TreeNode
        v-for="node in children"
        :key="JSON.stringify(node)"
        :tree-node="node"
      />
    </ul>
  </li>
</template>
