import type { DefineEvents } from "caido:plugin";
import {Project} from "caido:utils";

export type BackendEvents = DefineEvents<{
    "notes++:projectChange": (project: Project) => void;
}>;