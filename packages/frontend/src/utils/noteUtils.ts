import { type NoteContent, type NoteContentItem } from "shared";

/**
 * Creates a paragraph content item from text
 */
export function createTextParagraph(text: string): NoteContentItem {
  const contentItems: NoteContentItem[] = [{ type: "text", text }];

  return {
    type: "paragraph",
    content: contentItems,
  };
}

/**
 * Adds a paragraph to existing note content
 */
export function addParagraphToContent(
  currentContent: NoteContent | undefined,
  paragraph: NoteContentItem,
): NoteContent {
  const content = currentContent || {
    type: "doc",
    content: [],
  };

  return {
    ...content,
    content: [...(content.content || []), paragraph],
  };
}

/**
 * Adds a block-level node (e.g. `savedItemMention`, `fileMention`)
 * directly to the document's top-level content.
 *
 * Unlike `addParagraphToContent`, this does NOT wrap the node in a
 * `paragraph` — paragraphs only accept inline content in ProseMirror's
 * default schema, so a `group: "block"` node nested inside one is an
 * invalid document. ProseMirror silently drops or "repairs" invalid
 * structure rather than erroring, which is why this previously failed
 * silently (most visibly on an empty note, where there was no existing
 * valid structure for the repair logic to fall back to).
 */
export function addBlockToContent(
  currentContent: NoteContent | undefined,
  block: NoteContentItem,
): NoteContent {
  const content = currentContent || {
    type: "doc",
    content: [],
  };

  return {
    ...content,
    content: [...(content.content || []), block],
  };
}

/**
 * Creates a saved request/response mention content item.
 * `id` here is the ID of the saved item record (not the Caido
 * request/response ID) — the backend resolves it to live content.
 */
export function createSavedItemMention(
  id: string,
  label?: string,
): NoteContentItem {
  return {
    type: "savedItemMention",
    attrs: {
      id,
      label: label || "",
    },
  };
}
