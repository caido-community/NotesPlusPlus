import * as fs from "fs";
import path from "path";

import type { Reminder } from "shared";

import {
  createDirectory,
  directoryExists,
  fileExists,
  toSystemPath,
} from "./fileSystem";
import { getNoteRootPath } from "./paths";

const REMINDERS_FILENAME = "reminders.json";

export function getRemindersFilePath(projectID: string): string {
  return path.join(getNoteRootPath(projectID), REMINDERS_FILENAME);
}

export function readRemindersFile(projectID: string): Reminder[] {
  const filePath = getRemindersFilePath(projectID);

  if (!fileExists(filePath)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(toSystemPath(filePath), "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Reminder[]) : [];
  } catch {
    return [];
  }
}

export function writeRemindersFile(
  projectID: string,
  reminders: Reminder[],
): void {
  const filePath = getRemindersFilePath(projectID);
  const dirPath = path.dirname(filePath);

  if (!directoryExists(dirPath)) {
    createDirectory(dirPath);
  }

  fs.writeFileSync(toSystemPath(filePath), JSON.stringify(reminders, null, 2));
}
