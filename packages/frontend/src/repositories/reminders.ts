import { useSDK } from "@/plugins/sdk";

export const useRemindersRepository = () => {
  const sdk = useSDK();

  async function getReminders() {
    const result = await sdk.backend.getReminders();
    if (result.kind === "Error") {
      throw new Error(`Error loading reminders: ${result.error}`);
    }

    return result.value;
  }

  async function createReminder(
    notePath: string,
    context: string,
    reminderAt: string,
  ) {
    const result = await sdk.backend.createReminder(
      notePath,
      context,
      reminderAt,
    );
    if (result.kind === "Error") {
      throw new Error(`Error creating reminder: ${result.error}`);
    }

    return result.value;
  }

  async function deleteReminder(reminderId: string) {
    const result = await sdk.backend.deleteReminder(reminderId);
    if (result.kind === "Error") {
      throw new Error(`Error deleting reminder: ${result.error}`);
    }

    return result.value;
  }

  async function dismissReminder(reminderId: string) {
    const result = await sdk.backend.dismissReminder(reminderId);
    if (result.kind === "Error") {
      throw new Error(`Error dismissing reminder: ${result.error}`);
    }

    return result.value;
  }

  return {
    getReminders,
    createReminder,
    deleteReminder,
    dismissReminder,
  };
};
