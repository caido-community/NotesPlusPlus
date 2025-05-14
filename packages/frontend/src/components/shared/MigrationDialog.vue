<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

import { emitter } from "@/utils/eventBus";

const visible = ref(false);
const notes = ref<{ path: string; content: string }[]>([]);
const dontShowAgain = ref(false);

const confirmMigration = () => {
  emitter.emit("confirmMigration", notes.value);

  if (dontShowAgain.value) {
    localStorage.setItem("notesplusplus:dontShowMigrationDialog", "true");
  }

  visible.value = false;
};

const cancelMigration = () => {
  if (dontShowAgain.value) {
    localStorage.setItem("notesplusplus:dontShowMigrationDialog", "true");
  }

  visible.value = false;
};

onMounted(() => {
  emitter.on("showMigrationDialog", (legacyNotes) => {
    if (
      localStorage.getItem("notesplusplus:dontShowMigrationDialog") === "true"
    ) {
      return;
    }

    notes.value = legacyNotes;
    visible.value = true;
  });
});

onBeforeUnmount(() => {
  emitter.off("showMigrationDialog");
});
</script>

<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
  >
    <div
      class="bg-surface-800 rounded-lg shadow-lg p-6 max-w-md w-full border border-surface-700"
    >
      <h2 class="text-lg font-semibold text-surface-100 mb-4">
        Legacy Notes Found
      </h2>

      <p class="text-surface-200 mb-4">
        {{ notes.length }} legacy note{{ notes.length !== 1 ? "s" : "" }} found
        that need to be migrated to the new format. Would you like to migrate
        them now?
      </p>

      <div
        class="text-xs text-surface-400 mb-4 max-h-32 overflow-y-auto p-2 bg-surface-900 rounded"
      >
        <div v-for="(note, index) in notes" :key="index" class="mb-1">
          {{ note.path }}
        </div>
      </div>

      <div class="flex items-center mb-4">
        <input
          type="checkbox"
          id="dontShowAgain"
          v-model="dontShowAgain"
          class="mr-2"
        />
        <label for="dontShowAgain" class="text-surface-300 text-sm"
          >Don't show this again</label
        >
      </div>

      <div class="flex justify-end gap-3 mt-4">
        <button
          class="px-4 py-2 rounded bg-surface-700 text-surface-100 hover:bg-surface-600 transition-colors"
          @click="cancelMigration"
        >
          Cancel
        </button>
        <button
          class="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500 transition-colors"
          @click="confirmMigration"
        >
          Migrate
        </button>
      </div>
    </div>
  </div>
</template>
