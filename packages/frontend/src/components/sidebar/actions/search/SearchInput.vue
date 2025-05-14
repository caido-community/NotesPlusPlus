<script setup lang="ts">
import { ref } from "vue";

defineProps<{
  modifierKey: string;
}>();

const emit = defineEmits<{
  search: [query: string];
  keydown: [event: KeyboardEvent];
}>();

const isHighlighted = ref(false);
const inputElement = ref<HTMLInputElement | undefined>(undefined);

const handleInput = (event: Event) => {
  const input = event.target as HTMLInputElement;
  emit("search", input.value);
};

const handleKeyDown = (event: KeyboardEvent) => {
  emit("keydown", event);
  if (event.key === "Enter" && inputElement.value) {
    inputElement.value.value = "";
  }
};

const handleFocus = () => {
  isHighlighted.value = true;
  if (inputElement.value && inputElement.value.value) {
    emit("search", inputElement.value.value);
  }
};
</script>

<template>
  <div
    :class="[
      'flex items-center justify-between bg-zinc-800/70 rounded-md px-3 h-[35px] flex-1 transition-all duration-200 hover:bg-opacity-80 border',
      isHighlighted
        ? 'border-blue-500 ring-1 ring-blue-500'
        : 'border-zinc-600',
    ]"
  >
    <div class="flex items-center flex-1">
      <i
        class="fas fa-search text-gray-500 text-sm mr-2.5 transition-transform duration-200"
      ></i>
      <input
        ref="inputElement"
        type="text"
        placeholder="Search"
        class="bg-transparent outline-none text-gray-300 w-full text-sm transition-colors duration-200 border-0"
        @input="handleInput"
        @keydown="handleKeyDown"
        @focus="handleFocus"
        @blur="isHighlighted = false"
      />
    </div>
    <div
      class="text-xs text-gray-500 transition-opacity duration-200 hover:opacity-100 opacity-70"
    >
      {{ modifierKey }}S
    </div>
  </div>
</template>
