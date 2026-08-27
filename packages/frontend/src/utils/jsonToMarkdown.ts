import { Editor } from "@tiptap/core";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import { StarterKit } from "@tiptap/starter-kit";
import { type NoteContent, type NoteContentItem, type SavedItem } from "shared";
import { Markdown } from "tiptap-markdown";

import { type FrontendSDK } from "@/types";
import { decodeRawBlob } from "@/utils/httpEncoding";

async function fetchReplaySessionContent(
  sdk: FrontendSDK,
  sessionId: string,
): Promise<string | undefined> {
  try {
    const sessionResponse = await sdk.graphql.replaySessionEntries({
      id: sessionId,
    });
    const activeEntryId = sessionResponse?.replaySession?.activeEntry?.id;

    if (!activeEntryId) {
      return undefined;
    }

    const entryResponse = await sdk.graphql.replayEntry({
      id: activeEntryId,
    });

    return entryResponse?.replayEntry?.raw || undefined;
  } catch (error) {
    console.error("Error fetching replay session content:", error);
    return undefined;
  }
}

const MAX_FILE_SIZE_BYTES = 150 * 1024 * 1024;

interface FileMention {
  id: string;
  path: string;
  size: number;
  name: string;
}

function collectMentionIds(content: NoteContentItem[]): string[] {
  const ids: string[] = [];

  for (const node of content) {
    if (node.type === "mention" && node.attrs?.id) {
      ids.push(node.attrs.id as string);
    }
    if (node.content) {
      ids.push(...collectMentionIds(node.content));
    }
  }

  return ids;
}

function collectFileMentions(content: NoteContentItem[]): FileMention[] {
  const files: FileMention[] = [];

  for (const node of content) {
    if (node.type === "fileMention" && node.attrs) {
      files.push({
        id: node.attrs.id as string,
        path: node.attrs.path as string,
        size: node.attrs.size as number,
        name: node.attrs.name as string,
      });
    }
    if (node.content) {
      files.push(...collectFileMentions(node.content));
    }
  }

  return files;
}

function collectSavedItemMentions(content: NoteContentItem[]): SavedItem[] {
  const items: SavedItem[] = [];

  for (const node of content) {
    if (node.type === "savedItemMention" && node.attrs) {
      items.push(node.attrs as unknown as SavedItem);
    }
    if (node.content) {
      items.push(...collectSavedItemMentions(node.content));
    }
  }

  return items;
}

function savedItemKey(item: SavedItem): string {
  // Drafts have no stable refId — key by their raw content instead.
  if (item.sourceKind === "draft") {
    return `draft:${item.draftHost}:${item.draftPort}:${item.draftRaw ?? ""}`;
  }
  return `${item.sourceKind}:${item.kind}:${item.refId}`;
}

function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts[parts.length - 1]!.toLowerCase() : "";
}

function processContentTokens(
  content: NoteContentItem[],
  httpContentMap: Map<string, string>,
  fileContentMap: Map<string, string>,
  savedItemContentMap: Map<
    string,
    { raw: string; kind: string; label?: string }
  >,
): NoteContentItem[] {
  const result: NoteContentItem[] = [];

  for (const node of content) {
    if (node.type === "mention" && node.attrs?.id) {
      const sessionId = node.attrs.id as string;
      const httpContent = httpContentMap.get(sessionId);

      if (httpContent) {
        result.push({
          type: "codeBlock",
          attrs: { language: "http" },
          content: [
            {
              type: "text",
              text: httpContent,
            },
          ],
        });
      } else {
        result.push({
          type: "paragraph",
          content: [
            {
              type: "text",
              text: `[Replay Session: ${sessionId} (unavailable)]`,
            },
          ],
        });
      }
    } else if (node.type === "savedItemMention" && node.attrs) {
      const item = node.attrs as unknown as SavedItem;
      const key = savedItemKey(item);
      const resolved = savedItemContentMap.get(key);
      const heading = item.label
        ? `${item.kind === "response" ? "Response" : "Request"}: ${item.label}`
        : `Saved ${item.kind === "response" ? "Response" : "Request"}`;

      if (resolved) {
        result.push({
          type: "paragraph",
          content: [{ type: "text", text: `**${heading}**` }],
        });
        result.push({
          type: "codeBlock",
          attrs: { language: "http" },
          content: [{ type: "text", text: resolved.raw }],
        });
      } else {
        result.push({
          type: "paragraph",
          content: [{ type: "text", text: `[${heading} (unavailable)]` }],
        });
      }
    } else if (node.type === "fileMention" && node.attrs) {
      const path = node.attrs.path as string;
      const size = node.attrs.size as number;
      const name = node.attrs.name as string;

      if (size > MAX_FILE_SIZE_BYTES) {
        result.push({
          type: "paragraph",
          content: [
            {
              type: "text",
              text: `File: ${path}`,
            },
          ],
        });
      } else {
        const fileContent = fileContentMap.get(path);
        if (fileContent !== undefined) {
          result.push({
            type: "codeBlock",
            attrs: { language: getFileExtension(name) },
            content: [
              {
                type: "text",
                text: fileContent,
              },
            ],
          });
        } else {
          // Fallback if content fetch failed but wasn't large
          result.push({
            type: "paragraph",
            content: [
              {
                type: "text",
                text: `File: ${path} (content unavailable)`,
              },
            ],
          });
        }
      }
    } else if (node.content) {
      result.push({
        ...node,
        content: processContentTokens(
          node.content,
          httpContentMap,
          fileContentMap,
          savedItemContentMap,
        ),
      });
    } else {
      result.push(node);
    }
  }

  return result;
}

export async function convertTipTapToMarkdown(
  content: NoteContent,
  sdk: FrontendSDK,
): Promise<string> {
  const mentionIds = collectMentionIds(content.content || []);
  const fileMentions = collectFileMentions(content.content || []);
  const savedItemMentions = collectSavedItemMentions(content.content || []);

  const httpContentMap = new Map<string, string>();
  const fileContentMap = new Map<string, string>();
  const savedItemContentMap = new Map<
    string,
    { raw: string; kind: string; label?: string }
  >();

  const promises: Promise<void>[] = [];

  // Fetch replay sessions
  if (mentionIds.length > 0) {
    const p = (async () => {
      const fetchPromises = mentionIds.map(async (id) => {
        const httpContent = await fetchReplaySessionContent(sdk, id);
        if (httpContent) {
          httpContentMap.set(id, httpContent);
        }
      });
      await Promise.all(fetchPromises);
    })();
    promises.push(p);
  }

  // Fetch file contents
  if (fileMentions.length > 0) {
    const p = (async () => {
      const fetchPromises = fileMentions.map(async (file) => {
        if (file.size <= MAX_FILE_SIZE_BYTES) {
          try {
            const content = await sdk.backend.getFileContent(file.path);
            fileContentMap.set(file.path, content);
          } catch (err) {
            console.error(
              `Failed to fetch content for file ${file.path}:`,
              err,
            );
          }
        }
      });
      await Promise.all(fetchPromises);
    })();
    promises.push(p);
  }

  // Fetch savedItemMention content via backend
  if (savedItemMentions.length > 0) {
    const p = (async () => {
      const fetchPromises = savedItemMentions.map(async (item) => {
        try {
          const result = await sdk.backend.getSavedItem(item);
          if (result.kind === "Success" && result.value.found) {
            const resolved = result.value;
            const raw =
              resolved.sourceKind === "draft"
                ? resolved.raw
                : decodeRawBlob(resolved.raw);
            savedItemContentMap.set(savedItemKey(item), {
              raw,
              kind: resolved.kind,
              label: item.label,
            });
          }
        } catch (err) {
          console.error("Error fetching saved item for markdown export:", err);
        }
      });
      await Promise.all(fetchPromises);
    })();
    promises.push(p);
  }

  await Promise.all(promises);

  const processedContent: NoteContent = {
    ...content,
    content: processContentTokens(
      content.content || [],
      httpContentMap,
      fileContentMap,
      savedItemContentMap,
    ),
  };

  const editor = new Editor({
    extensions: [StarterKit, Table, TableRow, TableHeader, TableCell, Markdown],
    content: processedContent,
  });

  const markdown = editor.storage.markdown.getMarkdown();
  editor.destroy();

  return markdown;
}
