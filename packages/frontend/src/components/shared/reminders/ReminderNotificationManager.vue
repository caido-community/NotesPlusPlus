<script setup lang="ts">
import ReminderToast from "./ReminderToast.vue";

import { useSDK } from "@/plugins/sdk";
import { useRemindersStore } from "@/stores/reminders";

const sdk = useSDK();
const remindersStore = useRemindersStore();

function handleDismiss(reminderId: string) {
  remindersStore.dismissReminder(reminderId);
}

function handleExpire(reminderId: string) {
  remindersStore.markMissed(reminderId);
}

function handleNavigate(_notePath: string) {
  sdk.navigation.goTo("/notes");
}
</script>

<template>
  <div
    class="fixed top-4 right-4 z-[99999] flex flex-col gap-2 pointer-events-none"
  >
    <ReminderToast
      v-for="reminder in remindersStore.activeToasts"
      :key="reminder.id"
      :reminder="reminder"
      @dismiss="handleDismiss"
      @expire="handleExpire"
      @navigate="handleNavigate"
    />
  </div>
</template>
