<script setup lang="ts">
import { computed, ref, watch } from "vue";

import { useNotesStore } from "@/stores/notes";

const notesStore = useNotesStore();
const contentLength = computed(() => 123);
const wordCount = computed(() => {
    return 123;
});

const lineCount = computed(() => {
    return 123;
});

const showSaved = ref(false);

watch(
    () => notesStore.isSaving,
    (newValue) => {
        if (!newValue) {
            showSaved.value = true;
            setTimeout(() => {
                showSaved.value = false;
            }, 500);
        }
    },
);
</script>

<template>
    <div
        class="w-full h-[25px] border-t border-zinc-800 flex items-center justify-between px-2 text-base text-gray-400"
    >
        <div class="flex items-center gap-2">
            <span class="text-gray-400/50">{{
                notesStore.currentNotePath
            }}</span>
            <span v-if="showSaved" class="text-gray-500/50">Saved...</span>
        </div>
        <div class="flex items-center gap-2">
            <span class="text-gray-400/50">{{ lineCount }} lines</span>
            <span class="text-gray-400/50">{{ wordCount }} words</span>
            <span class="text-gray-400/50">{{ contentLength }} characters</span>
        </div>
    </div>
</template>
