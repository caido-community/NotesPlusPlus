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
 * Creates a mention content item
 */
export function createMention(id: string, label: string): NoteContentItem {
  return {
    type: "mention",
    attrs: {
      id,
      label: label || id,
    },
  };
}

/**
 * Creates a new note content with a text paragraph
 */
export function createNoteContentWithText(text: string): NoteContent {
  return {
    type: "doc",
    content: [createTextParagraph(text)],
  };
}
