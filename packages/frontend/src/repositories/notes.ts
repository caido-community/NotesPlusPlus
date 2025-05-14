import { type Note, type NoteContent } from "shared";

import { useSDK } from "@/plugins/sdk";

export const useNotesRepository = () => {
  const sdk = useSDK();

  async function getTree() {
    const result = await sdk.backend.getTree();
    if (result.kind === "Error") {
      throw new Error(`Error loading notes tree: ${result.error}`);
    }

    return result.value;
  }

  async function getNote(path: string) {
    const result = await sdk.backend.getNote(path);
    if (result.kind === "Error") {
      throw new Error(`Error loading note: ${result.error}`);
    }

    return result.value;
  }

  async function createNote(path: string, content: NoteContent) {
    const result = await sdk.backend.createNote(path, content);
    if (result.kind === "Error") {
      throw new Error(`Error creating note: ${result.error}`);
    }

    return result.value;
  }

  async function updateNote(path: string, updates: Partial<Note>) {
    const result = await sdk.backend.updateNote(path, updates);
    if (result.kind === "Error") {
      throw new Error(`Error updating note: ${result.error}`);
    }

    return result.value;
  }

  async function deleteNote(path: string) {
    const result = await sdk.backend.deleteNote(path);
    if (result.kind === "Error") {
      throw new Error(`Error deleting note: ${result.error}`);
    }

    return result.value;
  }

  async function createFolder(path: string) {
    const result = await sdk.backend.createFolder(path);
    if (result.kind === "Error") {
      throw new Error(`Error creating folder: ${result.error}`);
    }

    return result.value;
  }

  async function deleteFolder(path: string) {
    const result = await sdk.backend.deleteFolder(path);
    if (result.kind === "Error") {
      throw new Error(`Error deleting folder: ${result.error}`);
    }

    return result.value;
  }

  async function moveItem(oldPath: string, newPath: string) {
    const result = await sdk.backend.moveItem(oldPath, newPath);
    if (result.kind === "Error") {
      throw new Error(`Error moving item: ${result.error}`);
    }

    return result.value;
  }

  async function searchNotes(query: string) {
    const result = await sdk.backend.searchNotes(query);
    if (result.kind === "Error") {
      throw new Error(`Error searching notes: ${result.error}`);
    }

    return result.value;
  }

  async function getLegacyNotes() {
    const result = await sdk.backend.getLegacyNotes();
    if (result.kind === "Error") {
      throw new Error(`Error getting legacy notes: ${result.error}`);
    }

    return result.value;
  }

  async function migrateNote(path: string, content: NoteContent) {
    const result = await sdk.backend.migrateNote(path, content);
    if (result.kind === "Error") {
      throw new Error(`Error migrating note: ${result.error}`);
    }

    return result.value;
  }

  return {
    getTree,
    getNote,
    createNote,
    updateNote,
    deleteNote,
    createFolder,
    deleteFolder,
    moveItem,
    searchNotes,
    getLegacyNotes,
    migrateNote,
  };
};
