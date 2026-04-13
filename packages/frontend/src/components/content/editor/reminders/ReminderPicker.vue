<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";

const props = defineProps<{
  position: { x: number; y: number };
}>();

const emit = defineEmits<{
  confirm: [date: Date];
  cancel: [];
}>();

const pickerRef = ref<HTMLElement>();
const dateValue = ref(formatDatetimeLocal(getDefaultDate()));
const currentPosition = ref({ x: props.position.x, y: props.position.y + 8 });
const isDragging = ref(false);
const dragOffset = ref({ x: 0, y: 0 });

const presets = [
  { key: "3m" as const, label: "3 minutes" },
  { key: "5m" as const, label: "5 minutes" },
  { key: "15m" as const, label: "15 minutes" },
  { key: "1h" as const, label: "1 hour" },
];

function getDefaultDate(): Date {
  const date = new Date();
  date.setMinutes(date.getMinutes() + 5);
  return date;
}

function formatDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function applyPreset(preset: "3m" | "5m" | "15m" | "1h") {
  const now = new Date();
  switch (preset) {
    case "3m":
      now.setMinutes(now.getMinutes() + 3);
      break;
    case "5m":
      now.setMinutes(now.getMinutes() + 5);
      break;
    case "15m":
      now.setMinutes(now.getMinutes() + 15);
      break;
    case "1h":
      now.setHours(now.getHours() + 1);
      break;
  }
  dateValue.value = formatDatetimeLocal(now);
}

function handleDateInput(event: Event) {
  const target = event.target as HTMLInputElement;
  dateValue.value = target.value;
}

function handleConfirm() {
  const date = new Date(dateValue.value);
  if (isNaN(date.getTime())) return;
  if (date <= new Date()) return;
  emit("confirm", date);
}

function startDrag(event: MouseEvent) {
  isDragging.value = true;
  dragOffset.value = {
    x: event.clientX - currentPosition.value.x,
    y: event.clientY - currentPosition.value.y,
  };
  document.addEventListener("mousemove", handleDrag);
  document.addEventListener("mouseup", stopDrag);
}

function handleDrag(event: MouseEvent) {
  currentPosition.value = {
    x: event.clientX - dragOffset.value.x,
    y: event.clientY - dragOffset.value.y,
  };
}

function stopDrag() {
  isDragging.value = false;
  document.removeEventListener("mousemove", handleDrag);
  document.removeEventListener("mouseup", stopDrag);
}

function handleClickOutside(event: MouseEvent) {
  if (isDragging.value) return;
  if (pickerRef.value && !pickerRef.value.contains(event.target as Node)) {
    emit("cancel");
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    emit("cancel");
  }
}

onMounted(() => {
  requestAnimationFrame(() => {
    document.addEventListener("mousedown", handleClickOutside);
  });
  document.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener("mousedown", handleClickOutside);
  document.removeEventListener("keydown", handleKeydown);
  document.removeEventListener("mousemove", handleDrag);
  document.removeEventListener("mouseup", stopDrag);
});
</script>

<template>
  <div
    ref="pickerRef"
    class="fixed z-[10000] bg-surface-800 border border-surface-600 rounded-lg p-3 min-w-[240px] shadow-2xl select-none"
    :style="{
      left: `${currentPosition.x}px`,
      top: `${currentPosition.y}px`,
    }"
  >
    <div
      class="flex items-center gap-2 text-[13px] font-semibold text-surface-100 mb-2.5 cursor-move"
      @mousedown.prevent="startDrag"
    >
      <i class="fas fa-bell text-primary-500"></i>
      <span>Set Reminder</span>
    </div>

    <div class="grid grid-cols-2 gap-1">
      <button
        v-for="preset in presets"
        :key="preset.key"
        class="px-2 py-1.5 text-xs text-surface-300 bg-surface-900 border border-surface-600 rounded cursor-pointer text-center transition-colors hover:bg-surface-700 hover:border-surface-500"
        @click="applyPreset(preset.key)"
      >
        {{ preset.label }}
      </button>
    </div>

    <div class="h-px bg-surface-600 my-2.5"></div>

    <div class="mb-3">
      <label
        class="block text-[11px] font-medium text-surface-400 mb-1 uppercase tracking-wider"
      >
        Date & Time
      </label>
      <input
        type="datetime-local"
        class="w-full px-2 py-1.5 text-[13px] text-surface-100 bg-surface-900 border border-surface-600 rounded outline-none focus:border-primary-500 [color-scheme:dark]"
        :value="dateValue"
        :min="formatDatetimeLocal(new Date())"
        @input="handleDateInput"
      />
    </div>

    <div class="flex gap-1.5 justify-end">
      <button
        class="px-3.5 py-1.5 text-xs font-medium rounded cursor-pointer text-surface-400 bg-transparent border-none transition-colors hover:bg-surface-900"
        @click="emit('cancel')"
      >
        Cancel
      </button>
      <button
        class="px-3.5 py-1.5 text-xs font-medium rounded cursor-pointer text-white bg-primary-500 border-none transition-colors hover:bg-primary-600"
        @click="handleConfirm"
      >
        Set Reminder
      </button>
    </div>
  </div>
</template>
