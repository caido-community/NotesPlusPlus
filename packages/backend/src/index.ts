import type { DefineAPI, SDK } from "caido:plugin";
import {projectChangeListener} from "./storage/projectChangeListener";
import {createRootNoteFolder, deleteNoteOnDisk, renameNoteOnDisk, saveNoteNode, fetchImage, getNotes} from "./storage/diskStorage";

export type { BackendEvents } from "./types/events";


export type backendAPI = DefineAPI<{
  getNotes: typeof getNotes;
  createRootNoteFolder: typeof createRootNoteFolder;
  fetchImage: typeof fetchImage;
  deleteNoteOnDisk: typeof deleteNoteOnDisk;
  renameNoteOnDisk: typeof renameNoteOnDisk;
  saveNoteNode: typeof saveNoteNode;
}>;

export function init(sdk: SDK<backendAPI>) {
  sdk.api.register("getNotes",getNotes)
  sdk.api.register("createRootNoteFolder",createRootNoteFolder)
  sdk.api.register("saveNoteNode",saveNoteNode);
  sdk.api.register("fetchImage", fetchImage);
  sdk.api.register("deleteNoteOnDisk",deleteNoteOnDisk);
  sdk.api.register("renameNoteOnDisk",renameNoteOnDisk);
  sdk.events.onProjectChange((sdk,project) => {
    if(project !== null) {
      sdk.console.log("backend project change: " + project.getId());
      projectChangeListener(sdk, project);
    }
  })
}
