<script setup lang="ts">
import {computed} from "vue";
import {marked} from "marked";
import { debounce } from 'throttle-debounce';
import type { Caido } from "@caido/sdk-frontend";
import {markedHighlight} from "marked-highlight";
import hljs from "highlight.js";
import {SmartSuggest} from "vue-smart-suggest";
import {customLinkExtension} from "@/plugins/CustomLinkMarkedExtension";
import {storeImage,getImageUrl} from "@/utils/indexedDBClient";
import MarkdownExampleDialog from "@/components/MarkdownExampleDialog.vue";
import {useDialog} from "primevue/usedialog";
import markedAlert from "marked-alert";

const model = defineModel('model')
const replays = defineModel('replays')
const dialog = useDialog();




const userMentionTrigger = {
  char: '@',
  items: replays.value,
};

marked.use({ extensions: [customLinkExtension] });
marked.use(markedAlert())
marked.use(markedHighlight({
  langPrefix: 'hljs language-',
  highlight(code, lang) {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  }
}));

const renderedMarkdown = computed(() => {
  console.log("RENDER MARKDOWN COMPUTE:",model.value.text)
  if (model.value.text != undefined) {
    return marked(model.value.text)
  }
  return marked("")
});

const emit = defineEmits(['update:note'])

const debouncedSave = debounce(10000,() => {
  Caido.window.showToast("Auto-Saved Note",{variant: "info"})
  emit('update:note', model.value )
})

const handleSave = function() {
  console.log("SAVING NOTE FOR: ",model.value )
  debouncedSave.cancel({ upcomingOnly: true });
  Caido.window.showToast("Saved Note",{variant: "info"})
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
      // Create a blob URL for the image
      await storeImage(imageFile);

      // Retrieve and display the stored image
      const imageUrl = await getImageUrl(imageFile.name);
      const markdownLink = `![${imageFile.name}](${imageUrl})`

      const cursorPos = textarea.selectionStart;
      const textBefore = model.value.text.substring(0, cursorPos);
      const textAfter = model.value.text.substring(cursorPos);
      model.value.text = textBefore + markdownLink + textAfter;
      textarea.selectionStart = textarea.selectionEnd = cursorPos + markdownLink.length;
    } catch (error) {
      console.error('Error handling image paste:', error)
    }
  }
}

const showInfoModal = function () {
  const dialogRef = dialog.open(MarkdownExampleDialog, {
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