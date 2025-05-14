import { z } from "zod";

export const createFolderSchema = z.object({
  path: z.string().min(1),
});

export const deleteFolderSchema = z.object({
  path: z.string().min(1),
});
