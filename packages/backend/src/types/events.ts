import type { DefineEvents } from "caido:plugin";
import type { Reminder } from "shared";

export type BackendEvents = DefineEvents<{
  "notes++:projectChange": (projectId: string) => void;
  "notes++:reminderDue": (reminder: Reminder) => void;
}>;
