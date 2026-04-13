<script setup lang="ts">
import { type Reminder } from "shared";
import { computed, onMounted, onUnmounted, ref } from "vue";

const props = defineProps<{
  reminder: Reminder;
}>();

const emit = defineEmits<{
  dismiss: [reminderId: string];
  expire: [reminderId: string];
  navigate: [notePath: string];
}>();

const AUTO_DISMISS_MS = 15_000;
const TICK_MS = 50;
const MAX_CONTEXT_LENGTH = 60;

const isHovered = ref(false);
const isFocused = ref(false);
const progress = ref(100);
const visible = ref(false);

let timerId: ReturnType<typeof setInterval> | undefined;
let elapsed = 0;

function startTimer() {
  timerId = setInterval(() => {
    if (isHovered.value || isFocused.value) return;

    elapsed += TICK_MS;
    progress.value = Math.max(0, 100 - (elapsed / AUTO_DISMISS_MS) * 100);

    if (elapsed >= AUTO_DISMISS_MS) {
      handleExpire();
    }
  }, TICK_MS);
}

function handleDismiss() {
  if (timerId) clearInterval(timerId);
  visible.value = false;
  setTimeout(() => emit("dismiss", props.reminder.id), 200);
}

function handleExpire() {
  if (timerId) clearInterval(timerId);
  visible.value = false;
  setTimeout(() => emit("expire", props.reminder.id), 200);
}

function handleNavigate() {
  if (timerId) clearInterval(timerId);
  emit("navigate", props.reminder.notePath);
  emit("dismiss", props.reminder.id);
}

const formattedTime = computed(() => {
  const date = new Date(props.reminder.reminderAt);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
});

const truncatedContext = computed(() => {
  const ctx = props.reminder.context;
  if (ctx.length <= MAX_CONTEXT_LENGTH) return ctx;
  return ctx.slice(0, MAX_CONTEXT_LENGTH - 3) + "...";
});

const noteName = computed(() => {
  const parts = props.reminder.notePath.split("/");
  const filename = parts[parts.length - 1] || props.reminder.notePath;
  return filename.replace(/\.json$/, "");
});

onMounted(() => {
  requestAnimationFrame(() => {
    visible.value = true;
  });
  startTimer();
});

onUnmounted(() => {
  if (timerId) clearInterval(timerId);
});
</script>

<template>
  <div
    class="pointer-events-auto w-[400px] bg-surface-800 border border-surface-600 rounded-[10px] overflow-hidden shadow-2xl"
    :style="{
      transform: visible ? 'translateX(0)' : 'translateX(120%)',
      opacity: visible ? '1' : '0',
      transition:
        'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease',
    }"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    @focusin="isFocused = true"
    @focusout="isFocused = false"
  >
    <div class="flex items-center justify-between px-3.5 pt-2.5">
      <div
        class="flex items-center gap-2 text-[13px] font-semibold text-surface-100"
      >
        <i class="fas fa-bell text-primary-500"></i>
        <span>Reminder</span>
      </div>
      <button
        class="bg-transparent border-none text-surface-500 cursor-pointer p-1 text-xs leading-none transition-colors hover:text-surface-200"
        @click="handleDismiss"
      >
        <i class="fas fa-times"></i>
      </button>
    </div>

    <div class="px-3.5 py-2">
      <p class="text-[13px] text-surface-300 mb-2 leading-relaxed italic m-0">
        "{{ truncatedContext }}"
      </p>
      <div class="flex items-center gap-1.5 text-xs text-surface-400">
        <i class="fas fa-file-alt w-3 text-center text-[11px]"></i>
        <span>{{ noteName }}</span>
        <span class="text-surface-600 mx-0.5">·</span>
        <i class="fas fa-clock w-3 text-center text-[11px]"></i>
        <span>{{ formattedTime }}</span>
      </div>
    </div>

    <div class="flex gap-1.5 px-3.5 pb-2.5 justify-end">
      <button
        class="px-3.5 py-1 text-xs font-medium rounded cursor-pointer border-none transition-colors text-surface-400 bg-surface-900 hover:bg-surface-700"
        @click="handleDismiss"
      >
        Dismiss
      </button>
      <button
        class="px-3.5 py-1 text-xs font-medium rounded cursor-pointer border-none transition-colors text-white bg-primary-500 hover:bg-primary-600"
        @click="handleNavigate"
      >
        Go to Note
      </button>
    </div>

    <div class="h-0.5 bg-surface-900">
      <div
        class="h-full bg-primary-500"
        :style="{ width: `${progress}%`, transition: 'width 0.05s linear' }"
      ></div>
    </div>
  </div>
</template>
