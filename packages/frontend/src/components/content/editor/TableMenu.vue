<script setup lang="ts">
import { BubbleMenu, type Editor } from "@tiptap/vue-3";

const props = defineProps<{
  editor: Editor;
}>();

const shouldShowMenu = () => {
  if (!props.editor.isActive("table")) return false;
  return (
    props.editor.isActive("tableCell") || props.editor.isActive("tableHeader")
  );
};

const addColumnBefore = () => {
  props.editor.chain().focus().addColumnBefore().run();
};

const addColumnAfter = () => {
  props.editor.chain().focus().addColumnAfter().run();
};

const deleteColumn = () => {
  props.editor.chain().focus().deleteColumn().run();
};

const addRowBefore = () => {
  props.editor.chain().focus().addRowBefore().run();
};

const addRowAfter = () => {
  props.editor.chain().focus().addRowAfter().run();
};

const deleteRow = () => {
  props.editor.chain().focus().deleteRow().run();
};

const deleteTable = () => {
  props.editor.chain().focus().deleteTable().run();
};
</script>

<template>
  <BubbleMenu
    :editor="editor"
    :tippy-options="{ duration: 100, placement: 'top' }"
    :should-show="shouldShowMenu"
    class="table-menu"
  >
    <button title="Add column left" @click="addColumnBefore">+Col</button>
    <button title="Add column right" @click="addColumnAfter">Col+</button>
    <button title="Delete column" class="del" @click="deleteColumn">−Col</button>
    <span class="sep"></span>
    <button title="Add row above" @click="addRowBefore">+Row</button>
    <button title="Add row below" @click="addRowAfter">Row+</button>
    <button title="Delete row" class="del" @click="deleteRow">−Row</button>
    <span class="sep"></span>
    <button title="Delete table" class="del" @click="deleteTable">
      <i class="fas fa-trash"></i>
    </button>
  </BubbleMenu>
</template>

<style scoped>
.table-menu {
  display: flex;
  align-items: center;
  gap: 2px;
  background: #27272a;
  border: 1px solid #52525b;
  border-radius: 6px;
  padding: 4px 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.sep {
  width: 1px;
  height: 16px;
  background: #52525b;
  margin: 0 4px;
}

button {
  padding: 3px 6px;
  background: transparent;
  border: none;
  border-radius: 3px;
  color: #a1a1aa;
  cursor: pointer;
  font-size: 11px;
  font-weight: 500;
}

button:hover {
  background: #3f3f46;
  color: #e5e5e5;
}

button.del {
  color: #f87171;
}

button.del:hover {
  background: rgba(248, 113, 113, 0.15);
}

button i {
  font-size: 12px;
}
</style>
