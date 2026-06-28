import { z } from "zod";

// todo: improve schemas

export const getNoteSchema = z.object({
  path: z.string().min(1),
});

export const createNoteSchema = z.object({
  path: z.string().min(1),
  content: z.any(),
});

export const updateNoteSchema = z.object({
  path: z.string().min(1),
  updates: z.object({}).passthrough(),
});

export interface NoteContentItemShape {
  type: string;
  content?: NoteContentItemShape[];
  text?: string;
  attrs?: Record<string, unknown>;
}

const MAX_CONTENT_DEPTH = 50;

function buildNoteContentItemSchema(
  depth: number,
): z.ZodType<NoteContentItemShape> {
  return z.lazy(() =>
    z.object({
      type: z.string().min(1),
      content:
        depth < MAX_CONTENT_DEPTH
          ? z.array(buildNoteContentItemSchema(depth + 1)).optional()
          : z.array(z.never()).optional(),
      text: z.string().optional(),
      attrs: z.record(z.unknown()).optional(),
    }),
  );
}

export const noteContentItemSchema = buildNoteContentItemSchema(0);

export const appendToNoteSchema = z.object({
  path: z.string().min(1),
  block: noteContentItemSchema,
});

export const deleteNoteSchema = z.object({
  path: z.string().min(1),
});

export const moveItemSchema = z.object({
  oldPath: z.string().min(1),
  newPath: z.string().min(1),
});

export const searchNotesSchema = z.object({
  query: z.string().min(1),
});

export const getLegacyNotesSchema = z.object({});

export const migrateNoteSchema = z.object({
  path: z.string().min(1),
  content: z.any(),
});