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
 * A reference to a request or response that has been saved into a note.
 *
 * For "history" and "replay" items, we only ever store the ID — the raw
 * HTTP content is always fetched live from Caido so it can never go
 * stale or get duplicated on disk. `refId` is that ID.
 *
 * For "draft" items (an unsent Replay request), there is no Request.id
 * to point to — Caido has never created a row for it — so the raw text
 * and connection info are stored directly instead. `refId` is unused for
 * drafts; `draftRaw`/`draftHost`/`draftPort`/`draftIsTls` carry the data.
 *
 * `parentRequestId` is only set when `kind === "response"` — it's the ID
 * of the request that response belongs to, captured at save-time, since
 * a Response itself doesn't expose a path back to its request and we
 * need it to support double-click-to-replay from a saved response.
 *
 * `replaySessionId` / `sessionLabel` are only set when saved from a Replay
 * request pane. For a sent request, `refId` (the underlying `Request.id`)
 * is always the permanent, immutable snapshot — what's actually rendered
 * in the note never changes even if the Replay session is later edited.
 * The session fields exist purely so double-click can *prefer* reopening
 * the original live session when it still represents the same request
 * (see `sessionLabel` matching in ResolvedSavedItem), falling back to a
 * fresh session seeded from the static snapshot otherwise. For a draft,
 * only `replaySessionId` is set (there's no separate static/live
 * distinction to reconcile by name — the session IS the draft).
 */
export interface SavedItem {
  id: string;
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
  projectId: string;
  createdAt: string;
}

/**
 * The live content resolved for a SavedItem, fetched fresh from Caido
 * (for "history"/"replay" items) or read directly from storage (for
 * "draft" items, which were never sent and have nothing to re-fetch).
 * `found: false` means the original request/response no longer exists
 * (e.g. the project history was cleared) — this never happens for
 * drafts, since their content is stored directly.
 *
 * `requestId` is the ID of the *request* to seed a new Replay session
 * from via `{type: "ID", id}` — set for "history"/"replay" items, absent
 * for "draft" items, which instead use `draftConnection` with
 * `{type: "Raw", raw, connectionInfo}`.
 *
 * `replaySessionId` / `sessionLabel` are passed through as captured at
 * save-time (see `SavedItem`), for the frontend to compare against the
 * session's *current* name before deciding whether to reopen it.
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
