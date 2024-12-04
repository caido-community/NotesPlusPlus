import {SDK} from "caido:plugin";
import type {Project} from "caido:utils"
import {backendAPI, BackendEvents} from "../index";
import {createRootNoteFolder, getNotes} from "./diskStorage";
export function projectChangeListener(sdk: SDK<backendAPI, BackendEvents>, project: Project | null) {
    createRootNoteFolder(sdk).then(() => {
        sdk.console.log("ROOT FOLDER CREATED: GETTING NOTES")
        getNotes(sdk,project.getId()).then((notes) => {
            sdk.api.send("notes++:projectChange",notes);
        }).catch((err) => {
            sdk.console.log("ERROR GETTING NOTES: "+err)
        })
    })
}
