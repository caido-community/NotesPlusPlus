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

export const saveRequestSchema = z.object({
  requestId: z.string().min(1),
  sourceKind: savedItemSourceKindSchema,
  // .nullable() in addition to .optional(): when an earlier positional arg
  // is skipped with `undefined` but a later one is still passed, the RPC
  // bridge serializes that `undefined` as JSON `null` (since arrays can't
  // have holes) — so these fields can arrive as `null`, not just absent.
  label: z.string().optional().nullable(),
  replaySessionId: z.string().min(1).optional().nullable(),
  sessionLabel: z.string().optional().nullable(),
});

/**
 * Saving an unsent Replay draft: there's no Request.id yet, so the raw
 * HTTP text and connection info are stored directly instead of a
 * reference to re-fetch later.
 */
export const saveDraftRequestSchema = z.object({
  raw: z.string().min(1),
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  isTls: z.boolean(),
  label: z.string().optional().nullable(),
  replaySessionId: z.string().min(1).optional().nullable(),
});

export const saveResponseSchema = z.object({
  responseId: z.string().min(1),
  requestId: z.string().min(1),
  sourceKind: savedItemSourceKindSchema,
  label: z.string().optional().nullable(),
});

export const getSavedItemSchema = z.object({
  id: z.string().min(1),
});

export const deleteSavedItemSchema = z.object({
  id: z.string().min(1),
});
