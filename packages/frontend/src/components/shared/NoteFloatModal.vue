<script setup lang="ts">
import { type NoteModalSaveData } from "shared";
import { onBeforeUnmount, onMounted } from "vue";

import { useNoteModal } from "@/composables/useNoteModal";
import { useSDK } from "@/plugins/sdk";

const sdk = useSDK();

interface Position {
  x: number;
  y: number;
}

const props = defineProps({
  initialPosition: {
    type: Object as () => Position,
    default: () => ({ x: 100, y: 100 }),
  },
});

const emit = defineEmits<{
  close: [];
  save: [data: NoteModalSaveData];
}>();

const {
  position,
  size,
  noteContent,
  attachContext,
  selectedNotePath,
  availableNotes,
  textarea,
  isReplayPage,
  startDrag,
  startResize,
  close,
  save,
  initialize,
} = useNoteModal({
  initialPosition: props.initialPosition,
  onClose: () => emit("close"),
  onSave: (data) => emit("save", data),
});

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === "Escape") {
    close();
  } else if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    save();
  }
};

onMounted(async () => {
  await initialize();
  if (textarea.value) {
    textarea.value.focus();
    noteContent.value = sdk.window.getActiveEditor()?.getSelectedText() || "";
  }
  document.addEventListener("keydown", handleKeyDown);
});

onBeforeUnmount(() => {
  document.removeEventListener("keydown", handleKeyDown);
});
</script>

<template>
  <div
    class="fixed z-50 flex flex-col bg-surface-800 border border-surface-700 rounded-md p-2 shadow-md"
    :style="{
      top: position.y + 'px',
      left: position.x + 'px',
      width: size.width + 'px',
      height: size.height + 'px',
    }"
    @mousedown="startDrag"
  >
    <div class="flex items-center justify-between mb-2">
      <select
        v-model="selectedNotePath"
        class="text-sm w-full py-0.5 px-1 border-none rounded-sm bg-surface-900 text-surface-100 focus:outline-none focus:ring-1 focus:ring-blue-400"
      >
        <option value="">Create new note</option>
        <option
          v-for="note in availableNotes"
          :key="note.path"
          :value="note.path"
        >
          {{ note.path }}
        </option>
      </select>
    </div>

    <textarea
      ref="textarea"
      v-model="noteContent"
      placeholder="Write your note here..."
      class="w-full h-full p-2 resize-none border-none outline-none rounded-md bg-surface-900 text-surface-100 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-blue-400"
      autofocus
    ></textarea>

    <div
      class="flex items-center justify-between mt-2 text-xs text-surface-400"
    >
      <button
        v-if="isReplayPage"
        class="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-surface-700 transition-colors"
        @click="attachContext = !attachContext"
      >
        <span
          class="w-4 h-4 inline-flex items-center justify-center border rounded border-surface-500"
          :class="{ 'bg-blue-500 border-blue-500': attachContext }"
        >
          <svg
            v-if="attachContext"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="w-3 h-3"
          >
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </span>
        <span>Attach current context</span>
      </button>
      <div v-else class="flex-1"></div>

      <div class="flex items-center gap-2">
        <span
          class="cursor-pointer transition-all duration-200 hover:opacity-80"
          @click="save"
        >
          <strong
            class="bg-surface-700 p-1 rounded mr-1 transition-colors duration-200 hover:bg-surface-600/50"
            >↩</strong
          >
          to save
        </span>
        <span
          class="cursor-pointer transition-all duration-200 hover:opacity-80"
          @click="close"
        >
          <strong
            class="bg-surface-700 px-1 py-0.5 rounded mr-1 transition-colors duration-200 hover:bg-surface-600/50"
            >esc</strong
          >
          to close
        </span>
      </div>
    </div>

    <div
      class="absolute right-0 bottom-0 w-3 h-3 cursor-se-resize"
      @mousedown.stop="startResize"
    >
      <div
        class="absolute right-[3px] bottom-[3px] w-[5px] h-[5px] border-r-2 border-b-2 border-surface-500"
      ></div>
    </div>
  </div>
</template>
