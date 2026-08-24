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

export interface Reminder {
  id: string;
  notePath: string;
  context: string;
  reminderAt: string;
  createdAt: string;
  triggered: boolean;
  dismissed: boolean;
}

export type SavedItemKind = "request" | "response";

export type SavedItemSourceKind = "history" | "replay" | "draft";

/**
 * Stored directly as `savedItemMention` node attrs — no separate lookup
 * to facilitate integrity on the data.
 *
 * Drafts (unsent Replay requests) have no `refId`; their content lives
 * in `draftRaw`/`draftHost`/`draftPort`/`draftIsTls` instead.
 *
 * `parentRequestId` is only set for `kind === "response"` to enable replay.
 */
export interface SavedItem {
  kind: SavedItemKind;
  refId: string;
  parentRequestId?: string;
  sourceKind: SavedItemSourceKind;
  replaySessionId?: string;
  sessionLabel?: string;
  draftRaw?: string;
  draftHost?: string;
  draftPort?: number;
  draftIsTls?: boolean;
  label?: string;
}

export type ResolvedSavedItem =
  | {
      found: true;
      kind: SavedItemKind;
      sourceKind: SavedItemSourceKind;
      raw: string;
      requestId?: string;
      draftConnection?: { host: string; port: number; isTls: boolean };
      replaySessionId?: string;
      sessionLabel?: string;
      label?: string;
    }
  | {
      found: false;
    };

export type Result<T> =
  | { kind: "Error"; error: string }
  | { kind: "Success"; value: T };

export function ok<T>(value: T): Result<T> {
  return { kind: "Success", value };
}

export function error<T>(error: string): Result<T> {
  return { kind: "Error", error };
}