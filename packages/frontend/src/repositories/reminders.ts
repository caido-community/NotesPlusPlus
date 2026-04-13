import { useSDK } from "@/plugins/sdk";
import { handleBackendCall } from "@/utils/backend";

export const useRemindersRepository = () => {
  const sdk = useSDK();

  async function getReminders() {
    return handleBackendCall(sdk.backend.getReminders(), sdk);
  }

  async function createReminder(
    notePath: string,
    context: string,
    reminderAt: string,
  ) {
    return handleBackendCall(
      sdk.backend.createReminder(notePath, context, reminderAt),
      sdk,
    );
  }

  async function deleteReminder(reminderId: string) {
    return handleBackendCall(sdk.backend.deleteReminder(reminderId), sdk);
  }

  async function dismissReminder(reminderId: string) {
    return handleBackendCall(sdk.backend.dismissReminder(reminderId), sdk);
  }

  return {
    getReminders,
    createReminder,
    deleteReminder,
    dismissReminder,
  };
};
