import * as fs from "fs";
import path from "path";

import type { SDK } from "caido:plugin";
import type { Folder, Note, NoteContent, Result, TreeNode } from "shared";
import { error, ok } from "shared";

import {
  createNoteSchema,
  deleteNoteSchema,
  getNoteSchema,
  moveItemSchema,
  searchNotesSchema,
  updateNoteSchema,
} from "../schemas/note";
import {
  createDirectory,
  deleteFile,
  directoryExists,
  ensureJsonExtension,
  ensureProjectDirectory,
  fileExists,
  getNameFromPath,
  move,
  readFile,
  writeFile,
} from "../utils/fileSystem";
import { getNoteRootPath } from "../utils/paths";

/**
 * Get entire folder structure as a tree
 */
export async function getTree(sdk: SDK): Promise<Result<Folder>> {
  try {
    const projectIDResult = await ensureProjectDirectory(sdk);
    if (projectIDResult.kind === "Error") {
      return error(projectIDResult.error);
    }

    const projectID = projectIDResult.value;
    const rootPath = getNoteRootPath(projectID);
    if (!directoryExists(rootPath)) {
      createDirectory(rootPath);
      return ok({
        path: "/",
        name: "Root",
        type: "folder",
        children: [],
        metadata: {
          createdAt: new Date(),
          modifiedAt: new Date(),
        },
      });
    }

    return ok(buildFolderTree(rootPath, "/"));
  } catch (err) {
    sdk.console.error(`Error getting tree: ${err}`);
    return error(err instanceof Error ? err.message : String(err));
  }
}

/**
 * Get a specific note
 */
export async function getNote(
  sdk: SDK,
  notePath: string,
): Promise<Result<Note>> {
  try {
    getNoteSchema.parse({ path: notePath });

    const projectIDResult = await ensureProjectDirectory(sdk);
    if (projectIDResult.kind === "Error") {
      return error(projectIDResult.error);
    }

    const projectID = projectIDResult.value;
    const rootPath = getNoteRootPath(projectID);
    const fullPath = path.join(rootPath, ensureJsonExtension(notePath));

    if (!fileExists(fullPath)) {
      return error(`Note not found at path: ${notePath}`);
    }

    const content = readFile(fullPath);
    const name = getNameFromPath(notePath);

    const stats = fs.statSync(fullPath);

    return ok({
      path: ensureJsonExtension(notePath),
      name,
      type: "note",
      content,
      metadata: {
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
      },
    });
  } catch (err) {
    sdk.console.error(`Error getting note: ${err}`);
    return error(err instanceof Error ? err.message : String(err));
  }
}

/**
 * Create a new note
 */
export async function createNote(
  sdk: SDK,
  notePath: string,
  content: NoteContent,
): Promise<Result<Note>> {
  try {
    createNoteSchema.parse({ path: notePath, content });

    const projectIDResult = await ensureProjectDirectory(sdk);
    if (projectIDResult.kind === "Error") {
      return error(projectIDResult.error);
    }

    const projectID = projectIDResult.value;
    const pathWithExtension = ensureJsonExtension(notePath);
    const rootPath = getNoteRootPath(projectID);
    const fullPath = path.join(rootPath, pathWithExtension);

    const dirPath = path.dirname(fullPath);
    if (!directoryExists(dirPath)) {
      createDirectory(dirPath);
    }

    if (fileExists(fullPath)) {
      return error(`Note already exists at path: ${notePath}`);
    }

    writeFile(fullPath, content);

    const stats = fs.statSync(fullPath);
    const name = getNameFromPath(notePath);

    return ok({
      path: pathWithExtension,
      name,
      type: "note",
      content,
      metadata: {
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
      },
    });
  } catch (err) {
    sdk.console.error(`Error creating note: ${err}`);
    return error(err instanceof Error ? err.message : String(err));
  }
}

/**
 * Update an existing note
 */
export async function updateNote(
  sdk: SDK,
  notePath: string,
  updates: Partial<Note>,
): Promise<Result<Note>> {
  try {
    updateNoteSchema.parse({ path: notePath, updates });

    const projectIDResult = await ensureProjectDirectory(sdk);
    if (projectIDResult.kind === "Error") {
      return error(projectIDResult.error);
    }

    const projectID = projectIDResult.value;
    const pathWithExtension = ensureJsonExtension(notePath);
    const rootPath = getNoteRootPath(projectID);
    const fullPath = path.join(rootPath, pathWithExtension);

    if (!fileExists(fullPath)) {
      return error(`Note not found at path: ${notePath}`);
    }

    const existingContent = readFile(fullPath);
    const updatedContent = updates.content ?? existingContent;

    writeFile(fullPath, updatedContent);

    const stats = fs.statSync(fullPath);
    const name = getNameFromPath(notePath);

    return ok({
      path: pathWithExtension,
      name,
      type: "note",
      content: updatedContent,
      metadata: {
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
      },
    });
  } catch (err) {
    sdk.console.error(`Error updating note: ${err}`);
    return error(err instanceof Error ? err.message : String(err));
  }
}

/**
 * Delete a note
 */
export async function deleteNote(
  sdk: SDK,
  notePath: string,
): Promise<Result<boolean>> {
  try {
    deleteNoteSchema.parse({ path: notePath });

    const projectIDResult = await ensureProjectDirectory(sdk);
    if (projectIDResult.kind === "Error") {
      return error(projectIDResult.error);
    }

    const projectID = projectIDResult.value;
    const pathWithExtension = ensureJsonExtension(notePath);

    const rootPath = getNoteRootPath(projectID);
    const fullPath = path.join(rootPath, pathWithExtension);

    if (!fileExists(fullPath)) {
      return error(`Note not found at path: ${notePath}`);
    }

    deleteFile(fullPath);

    return ok(true);
  } catch (err) {
    sdk.console.error(`Error deleting note: ${err}`);
    return error(err instanceof Error ? err.message : String(err));
  }
}

/**
 * Move a note or folder to a new location
 */
export async function moveItem(
  sdk: SDK,
  oldPath: string,
  newPath: string,
): Promise<Result<boolean>> {
  try {
    moveItemSchema.parse({ oldPath, newPath });

    const projectIDResult = await ensureProjectDirectory(sdk);
    if (projectIDResult.kind === "Error") {
      return error(projectIDResult.error);
    }

    const projectID = projectIDResult.value;
    const rootPath = getNoteRootPath(projectID);

    const isNote =
      oldPath.endsWith(".json") ||
      !directoryExists(path.join(rootPath, oldPath));

    // Add .json extension if needed for notes
    const sourcePathWithExt = isNote ? ensureJsonExtension(oldPath) : oldPath;
    const targetPathWithExt = isNote ? ensureJsonExtension(newPath) : newPath;

    const sourcePath = path.join(rootPath, sourcePathWithExt);
    const targetPath = path.join(rootPath, targetPathWithExt);

    if (
      (isNote && !fileExists(sourcePath)) ||
      (!isNote && !directoryExists(sourcePath))
    ) {
      return error(`Source path not found: ${oldPath}`);
    }

    const targetDir = path.dirname(targetPath);
    if (!directoryExists(targetDir)) {
      createDirectory(targetDir);
    }

    if (
      (isNote && fileExists(targetPath)) ||
      (!isNote && directoryExists(targetPath))
    ) {
      return error(`Target path already exists: ${newPath}`);
    }

    move(sourcePath, targetPath);
    return ok(true);
  } catch (err) {
    sdk.console.error(`Error moving item: ${err}`);
    return error(err instanceof Error ? err.message : String(err));
  }
}

/**
 * Search notes by content
 */
export async function searchNotes(
  sdk: SDK,
  query: string,
): Promise<Result<Note[]>> {
  try {
    searchNotesSchema.parse({ query });

    const projectIDResult = await ensureProjectDirectory(sdk);
    if (projectIDResult.kind === "Error") {
      return error(projectIDResult.error);
    }

    const projectID = projectIDResult.value;
    const results: Note[] = [];
    const rootPath = getNoteRootPath(projectID);
    const lowercaseQuery = query.toLowerCase();

    const searchInDirectory = (
      dirPath: string,
      relativePath: string = "",
    ): void => {
      const entries = fs.readdirSync(dirPath);

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry);

        if (directoryExists(fullPath)) {
          searchInDirectory(fullPath, path.join(relativePath, entry));
        } else if (entry.endsWith(".json") && fileExists(fullPath)) {
          const name = getNameFromPath(entry);
          const entryPath = path.join(relativePath, entry);

          const nameMatch = name.toLowerCase().includes(lowercaseQuery);
          const pathMatch = entryPath.toLowerCase().includes(lowercaseQuery);

          if (nameMatch || pathMatch) {
            try {
              const content = readFile(fullPath);
              const stats = fs.statSync(fullPath);

              results.push({
                path: entryPath,
                name,
                type: "note",
                content,
                metadata: {
                  createdAt: stats.birthtime,
                  modifiedAt: stats.mtime,
                },
              });

              continue;
            } catch (err) {
              sdk.console.error(
                `Error reading file during search: ${fullPath}`,
              );
              continue;
            }
          }
        }
      }
    };

    searchInDirectory(rootPath);
    return ok(results);
  } catch (err) {
    sdk.console.error(`Error searching notes: ${err}`);
    return error(err instanceof Error ? err.message : String(err));
  }
}

/**
 * Helper function to build folder tree from filesystem
 */
function buildFolderTree(dirPath: string, relativePath: string): Folder {
  const entries = fs.readdirSync(dirPath);
  const children: TreeNode[] = [];
  const dirStat = fs.statSync(dirPath);

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry);
    const entryRelativePath = path.join(relativePath, entry);

    if (directoryExists(fullPath)) {
      children.push(buildFolderTree(fullPath, entryRelativePath));
    } else if (entry.endsWith(".json") && fileExists(fullPath)) {
      try {
        const content = readFile(fullPath);
        const name = getNameFromPath(entry);
        const stats = fs.statSync(fullPath);

        const noteObj: Note = {
          path: entryRelativePath,
          name,
          type: "note",
          content,
          metadata: {
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime,
          },
        };

        children.push(noteObj);
      } catch (err) {
        // Skip files that can't be read
      }
    }
  }

  return {
    path: relativePath,
    name: path.basename(relativePath) || "Root",
    type: "folder",
    children,
    metadata: {
      createdAt: dirStat.birthtime,
      modifiedAt: dirStat.mtime,
    },
  };
}
