<script setup lang="ts">
import { type MenuItem } from "primevue/menuitem";

import SearchBar from "./search/SearchBar.vue";

import { useContextMenuStore } from "@/stores/contextMenu";
import { useEditorStore } from "@/stores/editor";
import { useNotesStore } from "@/stores/notes";

const notesStore = useNotesStore();
const editorStore = useEditorStore();
const contextMenuStore = useContextMenuStore();

const createNote = async () => {
  const newNote = await notesStore.createNote("/");
  if (newNote) {
    notesStore.selectNote(newNote.path);
    editorStore.startRenaming();
  }
};

const createFolder = async () => {
  await notesStore.createFolder("/");
};

const handleFolderButtonContextMenu = (event: MouseEvent) => {
  event.preventDefault();
  const menuItems: MenuItem[] = [
    {
      label: "New Folder",
      icon: "fas fa-folder-plus",
      command: () => createFolder(),
    },
  ];
  contextMenuStore.showContextMenu(event, menuItems);
};
</script>

<template>
  <div class="flex items-center gap-1 p-2">
    <SearchBar class="flex-1" />
    <button
      class="bg-zinc-800/70 h-[35px] w-[35px] rounded-md flex items-center justify-center transition-all duration-200 hover:bg-opacity-80 border border-zinc-600 text-gray-400 hover:text-gray-200"
      title="New Folder"
      @click="createFolder"
      @contextmenu="handleFolderButtonContextMenu"
    >
      <i class="fas fa-folder-plus text-sm transition-colors duration-200"></i>
    </button>
    <button
      class="bg-zinc-800/70 h-[35px] w-[35px] rounded-md flex items-center justify-center transition-all duration-200 hover:bg-opacity-80 border border-zinc-600 text-gray-400 hover:text-gray-200"
      title="New Note"
      @click="createNote"
    >
      <i class="fas fa-pen text-sm transition-colors duration-200"></i>
    </button>
  </div>
</template>
