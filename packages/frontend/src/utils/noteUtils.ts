import { type NoteContent, type NoteContentItem, type SavedItem } from "shared";

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
 * directly to the document's top-level content, without wrapping it in
 * a paragraph — paragraphs only accept inline content, so a
 * `group: "block"` node nested inside one is an invalid document.
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
 * Creates a saved request/response mention content item. `item` is the
 * entire `SavedItem` — kind, refId, sourceKind, and so on — stored
 * directly as the node's `attrs` inside the note's own JSON document.
 */
export function createSavedItemMention(item: SavedItem): NoteContentItem {
  return {
    type: "savedItemMention",
    attrs: { ...item },
  };
}
