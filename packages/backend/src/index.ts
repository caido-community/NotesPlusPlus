import type { DefineAPI, SDK } from "caido:plugin";
import {saveNote, initProject, getNotesByProject} from "./storage/databaseAccess";

export type { BackendEvents } from "./types";

export type API = DefineAPI<{
  saveNote: typeof saveNote;
  initProject: typeof initProject;
  getNotesByProject: typeof getNotesByProject;
}>;

export function init(sdk: SDK<API>) {
  sdk.api.register("saveNote", saveNote)
  sdk.api.register("initProject", initProject);
  sdk.api.register("getNotesByProject", getNotesByProject);
}
