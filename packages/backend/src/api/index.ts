import { getFileContent } from "./file";
import { createFolder, deleteFolder } from "./folder";
import { getLegacyNotes, migrateNote } from "./migration";
import {
  createNote,
  deleteNote,
  getNote,
  getTree,
  moveItem,
  searchNotes,
  updateNote,
} from "./note";
import { getCurrentProjectId } from "./project";

export {
  getTree,
  getNote,
  createNote,
  updateNote,
  deleteNote,
  createFolder,
  deleteFolder,
  moveItem,
  searchNotes,
  getCurrentProjectId,
  getLegacyNotes,
  migrateNote,
  getFileContent,
};
