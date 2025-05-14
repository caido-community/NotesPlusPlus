import * as fs from "fs";
import path from "path";

import type { SDK } from "caido:plugin";
import type { NoteContent, Result } from "shared";
import { error, ok } from "shared";

import { getNoteRootPath } from "./paths";

/**
 * Normalize path to use forward slashes for application use
 */
export function normalizePath(filepath: string): string {
  return filepath.split(path.sep).join("/");
}

/**
 * Convert application path (with forward slashes) to system path
 */
export function toSystemPath(filepath: string): string {
  return filepath.split("/").join(path.sep);
}

/**
 * Copy a file using readFile and writeFile
 */
export function copyFile(source: string, destination: string): void {
  const content = fs.readFileSync(toSystemPath(source));
  fs.writeFileSync(toSystemPath(destination), content);
}

/**
 * Rename a file by copying it to the new location and removing the old one
 */
export function moveFile(source: string, destination: string): void {
  copyFile(source, destination);
  fs.rmSync(toSystemPath(source));
}

/**
 * Delete a file
 */
export function deleteFile(filepath: string): void {
  fs.rmSync(toSystemPath(filepath));
}

/**
 * Copy a directory recursively
 */
export function copyDirectory(source: string, destination: string): void {
  fs.mkdirSync(toSystemPath(destination), { recursive: true });
  const entries = fs.readdirSync(toSystemPath(source));

  for (const entry of entries) {
    const sourcePath = path.join(source, entry);
    const destPath = path.join(destination, entry);

    if (fs.statSync(toSystemPath(sourcePath)).isDirectory()) {
      copyDirectory(sourcePath, destPath);
    } else {
      copyFile(sourcePath, destPath);
    }
  }
}

/**
 * Move a directory by copying it to the new location and removing the old one
 */
export function moveDirectory(source: string, destination: string): void {
  copyDirectory(source, destination);
  fs.rmSync(toSystemPath(source), { recursive: true });
}

/**
 * Move a file or directory
 */
export function move(source: string, destination: string): void {
  if (fs.statSync(toSystemPath(source)).isDirectory()) {
    moveDirectory(source, destination);
  } else {
    moveFile(source, destination);
  }
}

/**
 * Check if a directory exists
 */
export function directoryExists(filepath: string): boolean {
  try {
    return fs.statSync(toSystemPath(filepath)).isDirectory();
  } catch (error) {
    return false;
  }
}

/**
 * Check if a file exists
 */
export function fileExists(filepath: string): boolean {
  try {
    return fs.statSync(toSystemPath(filepath)).isFile();
  } catch (error) {
    return false;
  }
}

/**
 * Create a directory
 */
export function createDirectory(filepath: string): void {
  fs.mkdirSync(toSystemPath(filepath), { recursive: true });
}

/**
 * Write content to a file
 */
export function writeFile(filepath: string, content: NoteContent): void {
  const dirPath = path.dirname(filepath);
  if (!directoryExists(dirPath)) {
    createDirectory(dirPath);
  }
  fs.writeFileSync(toSystemPath(filepath), JSON.stringify(content, null, 2));
}

/**
 * Read content from a file
 */
export function readFile(filepath: string): NoteContent {
  return (
    JSON.parse(fs.readFileSync(toSystemPath(filepath), "utf8")) || {
      type: "doc",
      content: [],
    }
  );
}

/**
 * Create project root directory
 */
export async function ensureProjectDirectory(
  sdk: SDK,
  projectID?: string,
): Promise<Result<string>> {
  try {
    if (!projectID) {
      const project = await sdk.projects.getCurrent();
      projectID = project?.getId();
    }

    if (!projectID) {
      sdk.console.log("No project found, cannot create notes directory");
      return error("No project found");
    }

    const rootPath = getNoteRootPath(projectID);
    createDirectory(rootPath);
    sdk.console.log(`Ensured notes directory at: ${rootPath}`);
    return ok(projectID);
  } catch (err) {
    sdk.console.error(`Failed to create project directory: ${err}`);
    return error(err instanceof Error ? err.message : String(err));
  }
}

/**
 * Make sure path ends with .json for notes
 */
export function ensureJsonExtension(path: string): string {
  return path.endsWith(".json") ? path : `${path}.json`;
}

/**
 * Get name from path
 */
export function getNameFromPath(filepath: string): string {
  const parts = filepath.split("/");
  const filename = parts[parts.length - 1] || "";
  const lastDotIndex = filename.lastIndexOf(".");
  return lastDotIndex === -1 ? filename : filename.substring(0, lastDotIndex);
}
