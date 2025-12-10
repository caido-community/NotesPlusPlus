import { Editor } from "@tiptap/core";
import Table from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import { StarterKit } from "@tiptap/starter-kit";
import { type NoteContent, type NoteContentItem } from "shared";
import { Markdown } from "tiptap-markdown";

import { type FrontendSDK } from "@/types";

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

function replaceMentionsWithCodeBlocks(
  content: NoteContentItem[],
  httpContentMap: Map<string, string>,
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
    } else if (node.content) {
      result.push({
        ...node,
        content: replaceMentionsWithCodeBlocks(node.content, httpContentMap),
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

  const httpContentMap = new Map<string, string>();
  if (mentionIds.length > 0) {
    const fetchPromises = mentionIds.map(async (id) => {
      const httpContent = await fetchReplaySessionContent(sdk, id);
      if (httpContent) {
        httpContentMap.set(id, httpContent);
      }
    });
    await Promise.all(fetchPromises);
  }

  const processedContent: NoteContent = {
    ...content,
    content: replaceMentionsWithCodeBlocks(
      content.content || [],
      httpContentMap,
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
