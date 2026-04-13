<script setup lang="ts">
import { Image as ImageExtension } from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import { StarterKit } from "@tiptap/starter-kit";
import { type Editor, EditorContent, useEditor } from "@tiptap/vue-3";
import { useDebounceFn } from "@vueuse/core";
import type { NoteContent } from "shared";
import { onUnmounted, toRaw, watch } from "vue";

import { MarkdownHeading } from "@/components/content/editor/extensions/markdown-heading";
import MarkdownStyling from "@/components/content/editor/extensions/markdown-styling";
import { createFileMention } from "@/components/content/editor/extensions/mentions/mention-file";
import { createSessionMention } from "@/components/content/editor/extensions/mentions/mention-request";
import createSuggestion from "@/components/content/editor/extensions/mentions/suggestion";
import { SlashCommands } from "@/components/content/editor/extensions/slash-commands";
import { useSDK } from "@/plugins/sdk";
import { injectEditorStyles } from "@/utils/injectEditorStyles";

injectEditorStyles();

const sdk = useSDK();
const suggestion = createSuggestion(sdk);
const SessionMention = createSessionMention(sdk);
const FileMention = createFileMention(sdk);

const props = defineProps<{
  content: NoteContent;
}>();

const emit = defineEmits<{
  save: [content: NoteContent];
}>();

function saveContent(editor: Editor) {
  emit("save", editor.getJSON() as NoteContent);
}

const debouncedSave = useDebounceFn(saveContent, 250);

const editor = useEditor({
  content: "",
  extensions: [
    StarterKit.configure({ heading: false }),
    MarkdownHeading,
    MarkdownStyling,
    // @ts-expect-error - TipTap expects null for clientRect but we can't do it due to eslint rules
    SessionMention.configure({ suggestion }),
    FileMention,
    Placeholder.configure({ placeholder: "Empty note..." }),
    ImageExtension.configure({
      HTMLAttributes: { class: "caido-image" },
    }),
    Table.configure({
      resizable: true,
      HTMLAttributes: { class: "notes-table" },
    }),
    TableRow,
    TableHeader,
    TableCell,
    SlashCommands.configure({ sdk }),
  ],
  editorProps: {
    attributes: {
      class:
        "mx-auto focus:outline-none font-mono dark:text-surface-100 h-full",
    },
  },
  onUpdate: ({ editor }) => {
    debouncedSave(editor as Editor);
  },
  onCreate: ({ editor }) => {
    if (props.content) {
      const rawContent = JSON.parse(JSON.stringify(toRaw(props.content)));
      editor.commands.setContent(rawContent);
    }
  },
});

watch(
  () => props.content,
  (newContent) => {
    if (editor.value && newContent) {
      const rawContent = JSON.parse(JSON.stringify(toRaw(newContent)));
      const currentJSON = JSON.stringify(editor.value.getJSON());
      const newJSON = JSON.stringify(rawContent);
      if (currentJSON !== newJSON) {
        editor.value.commands.setContent(rawContent);
      }
    }
  },
);

onUnmounted(() => {
  editor.value?.destroy();
});
</script>

<template>
  <div class="flex-1 overflow-y-auto min-h-0 p-2">
    <editor-content
      :editor="editor"
      spellcheck="false"
      autocorrect="off"
      autocapitalize="off"
      class="editor-wrapper"
    />
  </div>
</template>
