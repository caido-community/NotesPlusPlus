import type { DefineAPI, SDK } from "caido:plugin";

import {
  createFolder,
  createNote,
  createReminder,
  deleteFolder,
  deleteNote,
  deleteReminder,
  dismissReminder,
  getCurrentProjectId,
  getFileContent,
  getLegacyNotes,
  getNote,
  getReminders,
  getTree,
  migrateNote,
  moveItem,
  searchNotes,
  updateNote,
} from "./api";
import { type BackendEvents } from "./types/events";
import { startReminderTimer } from "./utils/reminderTimer";

export type { BackendEvents } from "./types/events";

export type API = DefineAPI<{
  getTree: typeof getTree;
  getNote: typeof getNote;
  createNote: typeof createNote;
  updateNote: typeof updateNote;
  deleteNote: typeof deleteNote;
  createFolder: typeof createFolder;
  deleteFolder: typeof deleteFolder;
  moveItem: typeof moveItem;
  searchNotes: typeof searchNotes;
  getCurrentProjectId: typeof getCurrentProjectId;
  getLegacyNotes: typeof getLegacyNotes;
  migrateNote: typeof migrateNote;
  getFileContent: typeof getFileContent;
  getReminders: typeof getReminders;
  createReminder: typeof createReminder;
  deleteReminder: typeof deleteReminder;
  dismissReminder: typeof dismissReminder;
}>;

export function init(sdk: SDK<API, BackendEvents>) {
  sdk.api.register("getTree", getTree);
  sdk.api.register("getNote", getNote);
  sdk.api.register("createNote", createNote);
  sdk.api.register("updateNote", updateNote);
  sdk.api.register("deleteNote", deleteNote);
  sdk.api.register("createFolder", createFolder);
  sdk.api.register("deleteFolder", deleteFolder);
  sdk.api.register("moveItem", moveItem);
  sdk.api.register("searchNotes", searchNotes);
  sdk.api.register("getCurrentProjectId", getCurrentProjectId);
  sdk.api.register("getLegacyNotes", getLegacyNotes);
  sdk.api.register("migrateNote", migrateNote);
  sdk.api.register("getFileContent", getFileContent);
  sdk.api.register("getReminders", getReminders);
  sdk.api.register("createReminder", createReminder);
  sdk.api.register("deleteReminder", deleteReminder);
  sdk.api.register("dismissReminder", dismissReminder);

  sdk.events.onProjectChange((sdk, project) => {
    sdk.api.send("notes++:projectChange", project?.getId());
  });

  startReminderTimer(sdk);

  sdk.console.log("Notes++ backend initialized successfully");
}
