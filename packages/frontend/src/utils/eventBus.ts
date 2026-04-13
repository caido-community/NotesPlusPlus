import mitt from "mitt";

type Events = {
  refreshEditors: void;
  refreshTree: number;
  restoreFocus: void;
  showMigrationDialog: { path: string; content: string }[];
  confirmMigration: { path: string; content: string }[];
  openReminderPicker: {
    selectedText: string;
    position: { x: number; y: number };
    selectionRange: { from: number; to: number };
  };
  reminderStateChanged: {
    id: string;
    state: "dismissed" | "missed";
  };
  cancelReminder: {
    id: string;
  };
};

export const emitter = mitt<Events>();
