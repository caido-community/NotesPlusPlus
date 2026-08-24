<script setup lang="ts">
import { Image as ImageExtension } from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import { PluginKey } from "@tiptap/pm/state";
import { StarterKit } from "@tiptap/starter-kit";
import { type Editor, EditorContent, useEditor } from "@tiptap/vue-3";
import { useDebounceFn } from "@vueuse/core";
import type { NoteContent } from "shared";
import { onUnmounted, toRaw, watch } from "vue";

import { MarkdownHeading } from "@/components/content/editor/extensions/markdown-heading";
import MarkdownStyling from "@/components/content/editor/extensions/markdown-styling";
import { createFileMention } from "@/components/content/editor/extensions/mentions/mention-file";
import { createSessionMention } from "@/components/content/editor/extensions/mentions/mention-request";
import { createSavedItemMention } from "@/components/content/editor/extensions/mentions/mention-saved-item";
import { createSessionTriggerMention } from "@/components/content/editor/extensions/mentions/mention-session-trigger";
import createSuggestion from "@/components/content/editor/extensions/mentions/suggestion";
import { SlashCommands } from "@/components/content/editor/extensions/slash-commands";
import { useSDK } from "@/plugins/sdk";
import { injectEditorStyles } from "@/utils/injectEditorStyles";

injectEditorStyles();

const sdk = useSDK();
const suggestion = createSuggestion(sdk);
// See the comment at SessionTriggerMention.configure() below for why
// this needs to be explicit and unique.
const sessionTriggerPluginKey = new PluginKey("sessionTriggerSuggestion");
const SessionTriggerMention = createSessionTriggerMention(sdk);
const FileMention = createFileMention(sdk);
const SavedItemMention = createSavedItemMention(sdk);
const SessionMention = createSessionMention(sdk);

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
    SessionTriggerMention.configure({
      // See the comment on this same call in NoteEditor.vue: each
      // Mention.extend() instance otherwise defaults to a shared
      // suggestion plugin key, which collides once SessionMention
      // (mention-request.ts) is registered alongside this one.
      // @ts-expect-error - SuggestionProps clientRect null/undefined mismatch with TipTap types
      suggestion: { ...suggestion, pluginKey: sessionTriggerPluginKey },
    }),
    MarkdownStyling,
    FileMention,
    SavedItemMention,
    SessionMention,
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
