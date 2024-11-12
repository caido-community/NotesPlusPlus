<script setup lang="ts">
import {marked} from "marked";
import { debounce } from 'throttle-debounce';
import {markedHighlight} from "marked-highlight";
import hljs from "highlight.js";
import {SmartSuggest} from "vue-smart-suggest";
import {customLinkExtension} from "@/plugins/CustomLinkMarkedExtension";
import {imagePasteMarkedExtension} from "@/plugins/ImagePasteMarkedExtension";
import MarkdownExampleDialog from "@/components/MarkdownExampleDialog.vue";
import {useDialog} from "primevue/usedialog";
import markedAlert from "marked-alert";
import {useSDK} from "@/plugins/sdk";
import { computedAsync } from '@vueuse/core'

const model = defineModel('model')
const replays = defineModel('replays')
const dialog = useDialog();
const sdk = useSDK();



const userMentionTrigger = {
  char: '@',
  items: replays.value,
};

marked.use({
  async: true,
  async walkTokens(token) {
    if( token.type === 'imagePasteMarkedExtension') {
      for (let file of sdk.files.getAll()) {
        console.log(`Checking for match between ${file.id} and ${token.id}`);
        if (file.id === token.id) {
          console.log("MATCH", file.path)
          try {
            token.fileName = file.name
            token.dataUrl = await sdk.backend.fetchImage(file)
            break
          } catch (e) {
            console.log("FILE LOAD ERROR: ", e);
          }
        }
      }
    }
  },
  extensions: [customLinkExtension, imagePasteMarkedExtension]
});
marked.use(markedAlert())
marked.use(markedHighlight({
  langPrefix: 'hljs language-',
  highlight(code, lang) {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  }
}));

const renderedMarkdown = computedAsync(async () => {
  console.log("RENDER MARKDOWN COMPUTE:",model.value.text)
  if (model.value.text != undefined) {
    return marked(model.value.text);
  }
  return marked("")
});

const emit = defineEmits(['update:note'])

const debouncedSave = debounce(10000,() => {
  sdk.window.showToast("Auto-Saved Note",{variant: "info"})
  emit('update:note', model.value )
})

const handleSave = function() {
  console.log("SAVING NOTE FOR: ",model.value )
  debouncedSave.cancel({ upcomingOnly: true });
  sdk.window.showToast("Saved Note",{variant: "info"})
  emit('update:note', model.value )
}

const handlePaste = async (event) => {
  // Get the cursor position before paste
  const textarea = event.target

  // Check if there are any image files in the clipboard
  const items = event.clipboardData?.items
  if (!items) return

  let imageFile: File = null
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      event.preventDefault() // Prevent default paste
      imageFile = item.getAsFile()
      break
    }
  }

  if (imageFile) {
    try {

      sdk.files.create(imageFile).then((res) => {
        console.log("PASTE FILE SAVE:", res)
        const markdownLink = `{${res.id}}`
        const cursorPos = textarea.selectionStart;
        const textBefore = model.value.text.substring(0, cursorPos);
        const textAfter = model.value.text.substring(cursorPos);
        model.value.text = textBefore + markdownLink + textAfter;
        textarea.selectionStart = textarea.selectionEnd = cursorPos + markdownLink.length;
      })
    } catch (error) {
      console.error('Error handling image paste:', error)
    }
  }
}

const showInfoModal = function () {
  dialog.open(MarkdownExampleDialog, {
    props: {
      header: "Supported Markdown Features",
      style: {
        height: '75%',
        width: '75%',
        background: 'var(--c-bg-subtle)'
      },
      contentStyle: {
        width: '100%',
        height: '100%',
      },
      modal: true,
      appendTo: 'self',
    },
  })
}

</script>

<template>
  <div style="display: flex;height: 100%;width: 100%;">
    <div class="flex-auto" style="flex: 1 1 auto; position: relative;">
      <SmartSuggest :triggers="[userMentionTrigger]" style="width: 100%; height: 100%;" append-to="self">
      <textarea
          style="width: 100%; height: 100%; padding: 1em; resize: none"
          class="bg-surface-700"
          v-model="model.text"
          @input="debouncedSave"
          @blur="handleSave"
          @keydown.ctrl.s.prevent="handleSave"
          @paste="handlePaste"
          placeholder="Type your markdown here..."
      />
      </SmartSuggest>
      <Button @click="showInfoModal" rounded class="pi pi-fw pi-info-circle absolute top-0 right-0 m-2" v-tooltip.bottom="'Markdown Help'"/>
    </div>
    <div class="flex-auto overflow-auto p-4 markdown-body" style="max-width: 50%; min-width: 50%; border: 0.5rem groove">
      <div v-html="renderedMarkdown" id="markdownView"></div>
    </div>
  </div>
</template>

<style scoped>
@import 'highlight.js/styles/github.css';
@import "marked-admonition-extension/dist/index.css";
</style>