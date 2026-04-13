<script setup lang="ts">
import { onMounted, ref, watch } from "vue";

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
  search: [query: string];
}>();

const inputRef = ref<HTMLInputElement>();
const query = ref(props.modelValue);

watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal !== query.value) {
      query.value = newVal;
    }
  },
);

function onInput() {
  emit("update:modelValue", query.value);
  emit("search", query.value);
}

function focus() {
  inputRef.value?.focus();
}

onMounted(() => {
  setTimeout(focus, 50);
});
</script>

<template>
  <div class="flex items-center gap-2 px-2 py-1.5 border-b border-surface-700">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="w-4 h-4 text-surface-400 shrink-0"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
    <input
      ref="inputRef"
      v-model="query"
      type="text"
      placeholder="Search notes..."
      class="w-full bg-transparent text-sm text-surface-100 placeholder-surface-500 outline-none border-none"
      @input="onInput"
    />
  </div>
</template>
