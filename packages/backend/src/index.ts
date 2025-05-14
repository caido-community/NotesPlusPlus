import type { DefineAPI, SDK } from "caido:plugin";

import {
  createFolder,
  createNote,
  deleteFolder,
  deleteNote,
  getCurrentProjectId,
  getLegacyNotes,
  getNote,
  getTree,
  migrateNote,
  moveItem,
  searchNotes,
  updateNote,
} from "./api";
import { type BackendEvents } from "./types/events";

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

  sdk.events.onProjectChange((sdk, project) => {
    sdk.api.send("notes++:projectChange", project?.getId());
  });

  sdk.console.log("Notes++ backend initialized successfully");
}
