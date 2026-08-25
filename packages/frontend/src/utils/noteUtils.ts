import {
  type NoteContent,
  type NoteContentItem,
  type SavedItem,
  type SavedItemKind,
  type SavedItemSourceKind,
} from "shared";

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

/**
 * Builds a SavedItem for an unsent Replay draft. Drafts have no stable
 * ID so the raw content and connection info are stored directly.
 *
 * Accepts both `isTls` and `isTLS` to accommodate different SDK shapes.
 */
export function createDraftSavedItem(options: {
  request: {
    raw: string;
    host: string;
    port: number;
    isTls?: boolean;
    isTLS?: boolean;
    path?: string;
  };
  session?: { id: string; name: string };
}): SavedItem {
  return {
    kind: "request",
    refId: "",
    sourceKind: "draft",
    draftRaw: options.request.raw,
    draftHost: options.request.host,
    draftPort: options.request.port,
    draftIsTls: options.request.isTls ?? options.request.isTLS ?? false,
    replaySessionId: options.session?.id,
    sessionLabel: options.session?.name,
    label: options.request.path,
  };
}

/**
 * Builds a SavedItem for a sent request or response (history, replay,
 * or response). Use `createDraftSavedItem` for unsent drafts instead.
 */
export function createSavedItem(options: {
  kind: SavedItemKind;
  refId: string;
  sourceKind: SavedItemSourceKind;
  parentRequestId?: string;
  session?: { id: string; name: string };
  label?: string;
}): SavedItem {
  return {
    kind: options.kind,
    refId: options.refId,
    sourceKind: options.sourceKind,
    parentRequestId: options.parentRequestId,
    replaySessionId: options.session?.id,
    sessionLabel: options.session?.name,
    label: options.label,
  };
}