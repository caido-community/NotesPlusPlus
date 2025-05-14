import type { DefineEvents } from "caido:plugin";

export type BackendEvents = DefineEvents<{
  "notes++:projectChange": (projectId: string) => void;
}>;
