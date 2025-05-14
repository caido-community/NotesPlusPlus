import * as fs from "fs";
import path from "path";

import { type SDK } from "caido:plugin";
import type { Note, NoteContent, Result } from "shared";
import { error, ok } from "shared";

import { getLegacyNotesSchema, migrateNoteSchema } from "../schemas/note";
import {
  deleteFile,
  directoryExists,
  ensureJsonExtension,
  ensureProjectDirectory,
  fileExists,
  getNameFromPath,
  normalizePath,
  writeFile,
} from "../utils/fileSystem";
import { getNoteRootPath } from "../utils/paths";

/**
 * Get all legacy notes (notes without .json extension and plain text content)
 */
export async function getLegacyNotes(
  sdk: SDK,
): Promise<Result<{ path: string; content: string }[]>> {
  try {
    getLegacyNotesSchema.parse({});

    const projectIDResult = await ensureProjectDirectory(sdk);
    if (projectIDResult.kind === "Error") {
      return error(projectIDResult.error);
    }

    const projectID = projectIDResult.value;
    const rootPath = getNoteRootPath(projectID, true);
    const legacyNotes: { path: string; content: string }[] = [];

    const findLegacyNotesInDirectory = (
      dirPath: string,
      relativePath: string = "",
    ): void => {
      const entries = fs.readdirSync(dirPath);

      for (const entry of entries) {
        if (entry === ".DS_Store") continue;

        const fullPath = path.join(dirPath, entry);
        const normalizedEntry = normalizePath(entry);
        const normalizedRelativePath = relativePath
          ? normalizePath(relativePath)
          : "";
        const entryRelativePath = normalizePath(
          path.join(normalizedRelativePath, normalizedEntry),
        );

        if (directoryExists(fullPath)) {
          findLegacyNotesInDirectory(fullPath, entryRelativePath);
        } else if (
          !entry.endsWith(".json") &&
          fileExists(fullPath) &&
          !fs.statSync(fullPath).isDirectory()
        ) {
          try {
            const content = fs.readFileSync(fullPath, "utf8");

            try {
              JSON.parse(content);
              continue;
            } catch {
              legacyNotes.push({
                path: normalizePath(entryRelativePath),
                content,
              });
            }
          } catch (err) {
            sdk.console.error(`Error reading legacy note file: ${fullPath}`);
          }
        }
      }
    };

    findLegacyNotesInDirectory(rootPath);
    return ok(legacyNotes);
  } catch (err) {
    sdk.console.error(`Error getting legacy notes: ${err}`);
    return error(err instanceof Error ? err.message : String(err));
  }
}

/**
 * Migrate a legacy note to the new format
 */
export async function migrateNote(
  sdk: SDK,
  notePath: string,
  content: NoteContent,
): Promise<Result<Note>> {
  try {
    migrateNoteSchema.parse({ path: notePath, content });

    const projectIDResult = await ensureProjectDirectory(sdk);
    if (projectIDResult.kind === "Error") {
      return error(projectIDResult.error);
    }

    const projectID = projectIDResult.value;
    const rootPath = getNoteRootPath(projectID);
    const legacyRootPath = getNoteRootPath(projectID, true);
    const legacyPath = path.join(legacyRootPath, notePath);
    const newPath = path.join(rootPath, ensureJsonExtension(notePath));

    if (!fileExists(legacyPath)) {
      return error(`Legacy note not found at path: ${notePath}`);
    }

    writeFile(newPath, content);
    deleteFile(legacyPath);

    const stats = fs.statSync(newPath);
    const name = getNameFromPath(notePath);

    return ok({
      path: ensureJsonExtension(normalizePath(notePath)),
      name,
      type: "note",
      content,
      metadata: {
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
      },
      isLegacy: false,
    });
  } catch (err) {
    sdk.console.error(`Error migrating note: ${err}`);
    return error(err instanceof Error ? err.message : String(err));
  }
}
