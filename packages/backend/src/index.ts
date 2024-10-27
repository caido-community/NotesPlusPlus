import type { DefineAPI, SDK } from "caido:plugin";
import {
  saveNote,
  initProject,
  getNotesByProject,
  deleteNote,
  deleteFolderAndChildren,
  editNoteName, editNoteText
} from "./storage/databaseAccess";


export type API = DefineAPI<{
  saveNote: typeof saveNote;
  initProject: typeof initProject;
  getNotesByProject: typeof getNotesByProject;
  deleteNote: typeof deleteNote;
  deleteFolderAndChildren: typeof deleteFolderAndChildren;
  editNoteName: typeof editNoteName;
  editNoteText: typeof editNoteText;
}>;

export function init(sdk: SDK<API>) {
  sdk.api.register("saveNote", saveNote)
  sdk.api.register("initProject", initProject);
  sdk.api.register("getNotesByProject", getNotesByProject);
  sdk.api.register("deleteNote", deleteNote);
  sdk.api.register("deleteFolderAndChildren", deleteFolderAndChildren);
  sdk.api.register("editNoteName", editNoteName);
  sdk.api.register("editNoteText",  editNoteText);
}
