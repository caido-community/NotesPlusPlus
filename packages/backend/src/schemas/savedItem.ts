import { z } from "zod";

/**
 * The kind of context a saved request/response was captured from.
 * - "history": Search, HTTP History, or Sitemap - all share the same
 *   underlying Request/Response rows, so the saved ID is the canonical one.
 * - "replay": captured from a Replay pane after the request was actually
 *   sent (it has a real, persisted ID by that point).
 * - "draft": captured from a Replay pane *before* it was ever sent. There
 *   is no Request.id to point to yet, so the raw content itself is stored
 *   directly instead of a reference.
 */
export const savedItemSourceKindSchema = z.enum(["history", "replay", "draft"]);

/**
 * Validates a `SavedItem` as it comes back out of a note's own JSON
 * content — the note file is user-editable on disk, so these attrs are
 * untrusted input.
 */
export const savedItemSchema = z.object({
  kind: z.enum(["request", "response"]),
  refId: z.string(),
  parentRequestId: z.string().optional(),
  sourceKind: savedItemSourceKindSchema,
  replaySessionId: z.string().optional(),
  sessionLabel: z.string().optional(),
  draftRaw: z.string().optional(),
  draftHost: z.string().optional(),
  draftPort: z.number().int().min(1).max(65535).optional(),
  draftIsTls: z.boolean().optional(),
  label: z.string().optional(),
});

export const getSavedItemSchema = z.object({
  item: savedItemSchema,
});
