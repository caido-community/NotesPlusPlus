export interface TreeNode {
  path: string;
  name: string;
  type: "note" | "folder";
  metadata: {
    createdAt: Date;
    modifiedAt: Date;
  };
}

export interface Note extends TreeNode {
  type: "note";
  content: NoteContent;
  isLegacy?: boolean;
}

export interface Folder extends TreeNode {
  type: "folder";
  children: TreeNode[];
}

export interface NoteContent {
  type: string;
  content: NoteContentItem[];
}

export interface NoteContentItem {
  type: string;
  content?: NoteContentItem[];
  text?: string;
  attrs?: Record<string, unknown>;
}

export interface NoteModalSaveData {
  content: string;
  attachContext: boolean;
  notePath: string;
}

export type Result<T> =
  | { kind: "Error"; error: string }
  | { kind: "Success"; value: T };

export function ok<T>(value: T): Result<T> {
  return { kind: "Success", value };
}

export function error<T>(error: string): Result<T> {
  return { kind: "Error", error };
}
