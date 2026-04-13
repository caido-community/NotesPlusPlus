import type { Reminder } from "shared";

export type ReminderDisplayState = "upcoming" | "due" | "dismissed" | "missed";

const registry = new Map<string, "dismissed" | "missed">();

export function setReminderState(
  id: string,
  state: "dismissed" | "missed",
): void {
  registry.set(id, state);
}

/**
 * Resolve the display state for a reminder chip.
 * Priority: explicit state from registry > time-based calculation.
 */
export function getReminderDisplayState(
  id: string,
  reminderAt: string,
): ReminderDisplayState {
  const override = registry.get(id);
  if (override) return override;

  return new Date(reminderAt) <= new Date() ? "due" : "upcoming";
}

/**
 * Populate the registry from backend reminder data.
 * Call on store init to restore states after page refresh.
 */
export function loadReminderStates(reminders: Reminder[]): void {
  for (const r of reminders) {
    if (r.dismissed) {
      registry.set(r.id, "dismissed");
    } else if (r.triggered) {
      registry.set(r.id, "missed");
    }
  }
}
