import type { SDK } from "caido:plugin";

import type { API } from "../index";
import type { BackendEvents } from "../types/events";

import { readRemindersFile, writeRemindersFile } from "./reminderFile";

const CHECK_INTERVAL_MS = 30_000;

/** Periodically checks for due reminders and dispatches notification events. */
export function startReminderTimer(sdk: SDK<API, BackendEvents>): () => void {
  async function checkReminders() {
    try {
      const project = await sdk.projects.getCurrent();
      const projectID = project?.getId();

      if (!projectID) return;

      const reminders = readRemindersFile(projectID);
      const now = new Date();
      let changed = false;

      for (const reminder of reminders) {
        if (reminder.triggered || reminder.dismissed) continue;

        const dueDate = new Date(reminder.reminderAt);
        if (dueDate <= now) {
          reminder.triggered = true;
          changed = true;
          sdk.api.send("notes++:reminderDue", reminder);
        }
      }

      if (changed) {
        writeRemindersFile(projectID, reminders);
      }
    } catch (err) {
      sdk.console.error(`Error checking reminders: ${err}`);
    }
  }

  checkReminders();
  const intervalId = setInterval(checkReminders, CHECK_INTERVAL_MS);

  return () => clearInterval(intervalId);
}
