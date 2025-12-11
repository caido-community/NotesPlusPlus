<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";

import { useSDK } from "@/plugins/sdk";
import { useEditorStore } from "@/stores/editor";
import { useNotesStore } from "@/stores/notes";
import { useSidebarStore } from "@/stores/sidebar";
import { convertTipTapToMarkdown } from "@/utils/jsonToMarkdown";

const notesStore = useNotesStore();
const note = computed(() => notesStore.currentNote);
const editorStore = useEditorStore();
const sidebarStore = useSidebarStore();
const sdk = useSDK();
const inputRef = ref<HTMLInputElement | undefined>(undefined);
const isSubmitting = ref(false);

const copyAsMarkdown = async () => {
  const content = notesStore.currentNote?.content;
  if (!content) {
    sdk.window.showToast("No note content to copy", { variant: "warning" });
    return;
  }

  try {
    const markdown = await convertTipTapToMarkdown(content, sdk);
    await navigator.clipboard.writeText(markdown);
    sdk.window.showToast("Copied to clipboard as Markdown", {
      variant: "success",
    });
  } catch (error) {
    sdk.window.showToast(`Failed to copy: ${String(error)}`, {
      variant: "error",
    });
  }
};

watch(inputRef, (value) => {
  editorStore.renamingInputRef = value;
});

const updateNoteName = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (note.value) {
    note.value.name = target.value;
  }
};

const submitRename = () => {
  if (note.value && !isSubmitting.value) {
    isSubmitting.value = true;
    notesStore.renameItem(note.value.path, note.value.name);
    editorStore.stopRenaming();
    setTimeout(() => {
      isSubmitting.value = false;
    }, 100);
  }
};

watch(
  () => editorStore.isRenaming,
  (isRenaming) => {
    if (isRenaming) {
      isSubmitting.value = false;
      nextTick(() => {
        inputRef.value?.focus();
        inputRef.value?.select();
      });
    }
  },
);
</script>

<template>
  <div
    class="w-full h-[35px] border-b border-zinc-800 flex items-center justify-between px-2 text-base text-gray-400"
  >
    <div class="flex items-center">
      <div class="flex items-center">
        <div
          class="p-2 cursor-pointer hover:text-gray-300 transition-colors"
          title="Toggle Sidebar (⌘ + B or Ctrl + B)"
          @click="sidebarStore.toggleSidebar()"
        >
          <i class="fas fa-bars"></i>
        </div>
        <div
          class="p-2 transition-colors"
          :class="[
            notesStore.canGoBack()
              ? 'cursor-pointer hover:text-gray-300'
              : 'opacity-50 cursor-not-allowed',
          ]"
          @click="notesStore.canGoBack() && notesStore.goBack()"
        >
          <i class="fas fa-arrow-left"></i>
        </div>
        <div
          class="p-2 transition-colors"
          :class="[
            notesStore.canGoForward()
              ? 'cursor-pointer hover:text-gray-300'
              : 'opacity-50 cursor-not-allowed',
          ]"
          @click="notesStore.canGoForward() && notesStore.goForward()"
        >
          <i class="fas fa-arrow-right"></i>
        </div>
      </div>
    </div>
    <div class="flex items-center">
      <i class="fas fa-file-alt mr-1.5"></i>
      <div class="relative">
        <template v-if="editorStore.isRenaming">
          <div
            class="inline-flex items-center bg-zinc-700/50 rounded px-2 py-0.5"
          >
            <input
              ref="inputRef"
              type="text"
              :value="note?.name || ''"
              class="w-auto min-w-[80px] bg-transparent text-gray-200 focus:outline-none"
              @input="updateNoteName"
              @blur="submitRename"
              @keyup.enter="submitRename"
            />
            <i class="fas fa-pen text-xs ml-1 text-gray-400"></i>
          </div>
        </template>
        <div
          v-else
          class="group inline-flex items-center px-1 cursor-pointer hover:text-gray-300"
          @dblclick="editorStore.startRenaming()"
        >
          <span>{{ note?.name || "" }}</span>
          <i
            class="fas fa-pen text-xs ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
          ></i>
        </div>
      </div>
    </div>
    <div class="flex items-center">
      <div
        class="p-2 cursor-pointer hover:text-gray-300 transition-colors flex items-center gap-1"
        title="Copy as Markdown"
        @click="copyAsMarkdown()"
      >
        <i class="fas fa-copy"></i>
        <span class="text-sm">Copy as Markdown</span>
      </div>
      <div
        class="p-2 cursor-pointer hover:text-gray-300 transition-colors"
        title="Close note"
        @click="notesStore.selectNote(undefined)"
      >
        <i class="fas fa-times"></i>
      </div>
    </div>
  </div>
</template>
