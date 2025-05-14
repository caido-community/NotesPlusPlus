import { defineStore } from "pinia";
import { nextTick, ref } from "vue";

export const useEditorStore = defineStore("noteEditor", () => {
  const isRenaming = ref(false);
  const renamingInputRef = ref<HTMLInputElement | undefined>(undefined);

  function startRenaming() {
    isRenaming.value = true;
    nextTick(() => {
      renamingInputRef.value?.focus();
    });
  }

  function stopRenaming() {
    isRenaming.value = false;
    renamingInputRef.value?.blur();
  }

  return { isRenaming, renamingInputRef, startRenaming, stopRenaming };
});
