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

export const noteContentItemSchema: z.ZodType<{
  type: string;
  content?: unknown[];
  text?: string;
  attrs?: Record<string, unknown>;
}> = z.object({
  type: z.string().min(1),
  content: z.array(z.any()).optional(),
  text: z.string().optional(),
  attrs: z.record(z.unknown()).optional(),
});

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
