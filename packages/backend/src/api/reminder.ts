import { randomUUID } from "crypto";

import type { SDK } from "caido:plugin";
import type { Reminder, Result } from "shared";
import { error, ok } from "shared";

import {
  createReminderSchema,
  deleteReminderSchema,
  dismissReminderSchema,
} from "../schemas/reminder";
import { ensureProjectDirectory } from "../utils/fileSystem";
import { readRemindersFile, writeRemindersFile } from "../utils/reminderFile";

/**
 * Get all reminders for the current project
 */
export async function getReminders(sdk: SDK): Promise<Result<Reminder[]>> {
  try {
    const projectIDResult = await ensureProjectDirectory(sdk);
    if (projectIDResult.kind === "Error") {
      return error(projectIDResult.error);
    }

    const reminders = readRemindersFile(projectIDResult.value);
    return ok(reminders);
  } catch (err) {
    sdk.console.error(`Error getting reminders: ${err}`);
    return error(err instanceof Error ? err.message : String(err));
  }
}

/**
 * Create a new reminder
 */
export async function createReminder(
  sdk: SDK,
  notePath: string,
  context: string,
  reminderAt: string,
): Promise<Result<Reminder>> {
  try {
    createReminderSchema.parse({ notePath, context, reminderAt });

    const parsedDate = new Date(reminderAt);
    if (isNaN(parsedDate.getTime())) {
      return error("Invalid reminder date");
    }
    const normalizedReminderAt = parsedDate.toISOString();

    const projectIDResult = await ensureProjectDirectory(sdk);
    if (projectIDResult.kind === "Error") {
      return error(projectIDResult.error);
    }

    const projectID = projectIDResult.value;
    const reminder: Reminder = {
      id: randomUUID(),
      notePath,
      context,
      reminderAt: normalizedReminderAt,
      createdAt: new Date().toISOString(),
      triggered: false,
      dismissed: false,
    };

    const reminders = readRemindersFile(projectID);
    reminders.push(reminder);
    writeRemindersFile(projectID, reminders);

    return ok(reminder);
  } catch (err) {
    sdk.console.error(`Error creating reminder: ${err}`);
    return error(err instanceof Error ? err.message : String(err));
  }
}

/**
 * Delete a reminder by ID
 */
export async function deleteReminder(
  sdk: SDK,
  reminderId: string,
): Promise<Result<boolean>> {
  try {
    deleteReminderSchema.parse({ reminderId });

    const projectIDResult = await ensureProjectDirectory(sdk);
    if (projectIDResult.kind === "Error") {
      return error(projectIDResult.error);
    }

    const projectID = projectIDResult.value;
    const reminders = readRemindersFile(projectID);
    const filtered = reminders.filter((r) => r.id !== reminderId);

    if (filtered.length === reminders.length) {
      return error(`Reminder not found: ${reminderId}`);
    }

    writeRemindersFile(projectID, filtered);
    return ok(true);
  } catch (err) {
    sdk.console.error(`Error deleting reminder: ${err}`);
    return error(err instanceof Error ? err.message : String(err));
  }
}

/**
 * Dismiss a reminder (mark as acknowledged by user)
 */
export async function dismissReminder(
  sdk: SDK,
  reminderId: string,
): Promise<Result<boolean>> {
  try {
    dismissReminderSchema.parse({ reminderId });

    const projectIDResult = await ensureProjectDirectory(sdk);
    if (projectIDResult.kind === "Error") {
      return error(projectIDResult.error);
    }

    const projectID = projectIDResult.value;
    const reminders = readRemindersFile(projectID);
    const target = reminders.find((r) => r.id === reminderId);

    if (!target) {
      return error(`Reminder not found: ${reminderId}`);
    }

    target.dismissed = true;
    writeRemindersFile(projectID, reminders);
    return ok(true);
  } catch (err) {
    sdk.console.error(`Error dismissing reminder: ${err}`);
    return error(err instanceof Error ? err.message : String(err));
  }
}
