import { Editor, type JSONContent } from "@tiptap/core";
import { StarterKit } from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";

export function convertMarkdownToTipTap(markdown: string): JSONContent {
  const editor = new Editor({
    extensions: [StarterKit, Markdown],
    content: markdown,
  });

  const json = editor.getJSON();
  editor.destroy();

  return json;
}
