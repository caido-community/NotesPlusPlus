import mitt from "mitt";

type Events = {
  refreshEditors: void;
  refreshTree: number;
  restoreFocus: void;
  showMigrationDialog: { path: string; content: string }[];
  confirmMigration: { path: string; content: string }[];
};

export const emitter = mitt<Events>();
