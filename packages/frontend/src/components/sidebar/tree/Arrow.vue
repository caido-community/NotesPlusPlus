<script setup lang="ts">
const props = defineProps<{
  open?: boolean;
  class?: string;
}>();
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke-width="2"
    stroke="currentColor"
    :class="['origin-center', open ? 'rotate-90' : 'rotate-0', props.class]"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M8.25 4.5l7.5 7.5-7.5 7.5"
    />
  </svg>
</template>
