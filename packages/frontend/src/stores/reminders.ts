import { defineStore } from "pinia";
import { type Reminder } from "shared";
import { ref } from "vue";

import { useSDK } from "@/plugins/sdk";
import { useRemindersRepository } from "@/repositories/reminders";
import { emitter } from "@/utils/eventBus";
import { playNotificationSound } from "@/utils/notificationSound";
import { loadReminderStates, setReminderState } from "@/utils/reminderStates";

export const useRemindersStore = defineStore("reminders", () => {
  const sdk = useSDK();
  const repository = useRemindersRepository();

  const activeToasts = ref<Reminder[]>([]);

  async function createReminder(
    notePath: string,
    context: string,
    reminderAt: string,
  ) {
    try {
      const reminder = await repository.createReminder(
        notePath,
        context,
        reminderAt,
      );
      sdk.window.showToast("Reminder set", { variant: "success" });
      return reminder;
    } catch (error) {
      sdk.window.showToast(`Error creating reminder: ${error}`, {
        variant: "error",
      });
      return undefined;
    }
  }

  async function deleteReminder(reminderId: string) {
    try {
      await repository.deleteReminder(reminderId);
      return true;
    } catch (error) {
      sdk.window.showToast(`Error deleting reminder: ${error}`, {
        variant: "error",
      });
      return false;
    }
  }

  /** User explicitly dismissed — persists to backend and marks chip as dismissed. */
  async function dismissReminder(reminderId: string) {
    activeToasts.value = activeToasts.value.filter((r) => r.id !== reminderId);

    setReminderState(reminderId, "dismissed");
    emitter.emit("reminderStateChanged", {
      id: reminderId,
      state: "dismissed",
    });

    try {
      await repository.dismissReminder(reminderId);
    } catch (error) {
      sdk.window.showToast(`Error dismissing reminder: ${error}`, {
        variant: "error",
      });
    }
  }

  /** Toast auto-expired without user action. */
  function markMissed(reminderId: string) {
    activeToasts.value = activeToasts.value.filter((r) => r.id !== reminderId);

    setReminderState(reminderId, "missed");
    emitter.emit("reminderStateChanged", {
      id: reminderId,
      state: "missed",
    });
  }

  sdk.backend.onEvent("notes++:reminderDue", (reminder: Reminder) => {
    activeToasts.value.push(reminder);
    playNotificationSound();
  });

  repository
    .getReminders()
    .then(loadReminderStates)
    .catch(() => {});

  return {
    activeToasts,
    createReminder,
    deleteReminder,
    dismissReminder,
    markMissed,
  };
});
