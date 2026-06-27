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

/**
 * What kind of item is saved: a request, or a response.
 */
export type SavedItemKind = "request" | "response";

/**
 * Where the saved item was captured from.
 * - "history": Search / HTTP History / Sitemap (same underlying rows, same IDs)
 * - "replay": a Replay pane, after the request was actually sent
 * - "draft": a Replay pane, before the request was ever sent — there is
 *   no Request.id yet, so the raw content itself is stored directly
 */
export type SavedItemSourceKind = "history" | "replay" | "draft";

/**
 * A reference to a request or response saved into a note. This is the
 * literal shape stored as the `savedItemMention` node's `attrs` inside
 * the note's own JSON document — there is no separate record or lookup
 * table.
 *
 * For "history" and "replay" items, only the ID (`refId`) is stored —
 * the raw HTTP content is always fetched live from Caido. For "draft"
 * items (an unsent Replay request, no Request.id yet), `refId` is
 * unused and `draftRaw`/`draftHost`/`draftPort`/`draftIsTls` carry the
 * data directly.
 *
 * `parentRequestId` is only set when `kind === "response"`, since a
 * Response doesn't expose a path back to its request.
 *
 * `replaySessionId` / `sessionLabel` are only set when saved from a
 * Replay pane: they let double-click prefer reopening the original live
 * session (if it still has the same name) instead of creating a fresh
 * one from the static snapshot.
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

/**
 * The live content resolved for a SavedItem, fetched fresh from Caido
 * (for "history"/"replay" items) or read from the note's own attrs (for
 * "draft" items). `found: false` means the original request/response no
 * longer exists.
 *
 * `requestId` seeds a new Replay session via `{type: "ID", id}` for
 * "history"/"replay" items; `draftConnection` does the same via
 * `{type: "Raw", raw, connectionInfo}` for "draft" items.
 */
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
