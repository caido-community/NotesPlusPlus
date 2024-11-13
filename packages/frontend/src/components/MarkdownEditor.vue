<script setup lang="ts">
import {marked} from "@/utils/marked";
import { debounce } from 'throttle-debounce';
import {SmartSuggest} from "vue-smart-suggest";
import MarkdownExampleDialog from "@/components/MarkdownExampleDialog.vue";
import {useDialog} from "primevue/usedialog";
import {useSDK} from "@/plugins/sdk";
import { computedAsync } from '@vueuse/core'
import Splitter from 'primevue/splitter';
import SplitterPanel from 'primevue/splitterpanel';

const model = defineModel('model')
const replays = defineModel('replays')
const dialog = useDialog();
const sdk = useSDK();



const userMentionTrigger = {
  char: '@',
  items: replays.value,
};

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

const vFocus = {
  mounted: (el: HTMLElement) => el.focus(),
};

</script>

<template>
  <div style="display: flex;height: 100%;width: 100%;">
    <Splitter style="width: 100%; height: 100%;">
      <SplitterPanel>
        <div class="flex-auto" style="height: 100%;flex: 1 1 auto; position: relative;">
          <SmartSuggest :triggers="[userMentionTrigger]" style="width: 100%; height: 100%;" append-to="self">
          <textarea
              style="width: 100%; height: 100%; padding: 1em; resize: none"
              class="bg-surface-700"
              v-model="model.text"
              v-focus
              id="markdownEditorTextarea"
              @input="debouncedSave"
              @blur="handleSave"
              @keydown.ctrl.s.prevent="handleSave"
              @paste="handlePaste"
              placeholder="Type your markdown here..."
          />
          </SmartSuggest>
          <Button @click="showInfoModal" rounded class="pi pi-fw pi-info-circle absolute top-0 right-0 m-2" v-tooltip.bottom="'Markdown Help'"/>
        </div>
      </SplitterPanel>
      <SplitterPanel>
        <div class="flex-auto overflow-auto p-4 markdown-body" style="height: 100%; border: 0.5rem groove">
          <div v-html="renderedMarkdown" id="markdownView"></div>
        </div>
      </SplitterPanel>
    </Splitter>
  </div>
</template>

<style scoped>
@import 'highlight.js/styles/github.css';
@import "marked-admonition-extension/dist/index.css";
</style>