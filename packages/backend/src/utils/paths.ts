import { homedir } from "os";
import path from "path";

export const NOTES_ROOT_DIR = ".CaidoNotesPlusPlusV2";
export const LEGACY_NOTES_DIR = ".CaidoNotesPlusPlus";

/**
 * Get the root path for notes storage
 */
export function getNoteRootPath(projectID?: string, legacy?: boolean): string {
  if (!projectID) {
    return path.join(homedir(), legacy ? LEGACY_NOTES_DIR : NOTES_ROOT_DIR);
  }
  return path.join(
    homedir(),
    legacy ? LEGACY_NOTES_DIR : NOTES_ROOT_DIR,
    projectID,
  );
}

/**
 * Build a full file path for a note
 */
export function buildNotePath(
  projectID: string,
  filepath: string[],
  legacy?: boolean,
): string {
  return path.join(getNoteRootPath(projectID, legacy), ...filepath);
}
