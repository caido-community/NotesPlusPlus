import * as fs from "fs";
import path from "path";

import type { SDK } from "caido:plugin";
import type { Folder, Result } from "shared";
import { error, ok } from "shared";

import { createFolderSchema, deleteFolderSchema } from "../schemas/folder";
import {
  createDirectory,
  directoryExists,
  ensureProjectDirectory,
} from "../utils/fileSystem";
import { getNoteRootPath } from "../utils/paths";

/**
 * Create a new folder
 */
export async function createFolder(
  sdk: SDK,
  folderPath: string,
): Promise<Result<Folder>> {
  try {
    createFolderSchema.parse({ path: folderPath });

    const projectIDResult = await ensureProjectDirectory(sdk);
    if (projectIDResult.kind === "Error") {
      return error(projectIDResult.error);
    }

    const projectID = projectIDResult.value;
    const rootPath = getNoteRootPath(projectID);
    const fullPath = path.join(rootPath, folderPath);

    if (directoryExists(fullPath)) {
      return error(`Folder already exists at path: ${folderPath}`);
    }

    createDirectory(fullPath);

    const name = path.basename(folderPath);
    return ok({
      path: folderPath,
      name,
      type: "folder",
      children: [],
      metadata: {
        createdAt: new Date(),
        modifiedAt: new Date(),
      },
    });
  } catch (err) {
    sdk.console.error(`Error creating folder: ${err}`);
    return error(err instanceof Error ? err.message : String(err));
  }
}

/**
 * Delete a folder
 */
export async function deleteFolder(
  sdk: SDK,
  folderPath: string,
): Promise<Result<boolean>> {
  try {
    deleteFolderSchema.parse({ path: folderPath });

    const projectIDResult = await ensureProjectDirectory(sdk);
    if (projectIDResult.kind === "Error") {
      return error(projectIDResult.error);
    }

    const projectID = projectIDResult.value;
    const rootPath = getNoteRootPath(projectID);
    const fullPath = path.join(rootPath, folderPath);

    if (!directoryExists(fullPath)) {
      return error(`Folder does not exist at path: ${folderPath}`);
    }

    fs.rmSync(fullPath, { recursive: true, force: true });

    return ok(true);
  } catch (err) {
    sdk.console.error(`Error deleting folder: ${err}`);
    return error(err instanceof Error ? err.message : String(err));
  }
}
