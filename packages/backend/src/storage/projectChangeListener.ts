import {SDK} from "caido:plugin";
import type {Project} from "caido:utils"
import {backendAPI, BackendEvents} from "../index";
export function projectChangeListener(sdk: SDK<backendAPI, BackendEvents>, project: Project | null) {
    sdk.api.send("notes++:projectChange",project);
}
