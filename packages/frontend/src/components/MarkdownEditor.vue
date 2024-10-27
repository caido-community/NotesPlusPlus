<script setup lang="ts">
import {computed, onMounted, onUnmounted, watch} from "vue";
import {marked} from "marked";
import { debounce } from 'throttle-debounce';
import type { Caido } from "@caido/sdk-frontend";
import {markedHighlight} from "marked-highlight";
import hljs from "highlight.js";
import {SmartSuggest} from "vue-smart-suggest";
import {customLinkExtension, handleCustomLinkClick} from "@/plugins/CustomLinkMarkedExtension";
const model = defineModel('model')
const replays = defineModel('replays')




const userMentionTrigger = {
  char: '@',
  items: replays.value,
};

marked.use({ extensions: [customLinkExtension] });
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
  emit('update:note', model.value )
}



</script>

<template>
  <div style="display: flex;height: 100%;width: 100%;">
    <div class="flex-auto" style="flex: 1 1 auto;">
      <SmartSuggest :triggers="[userMentionTrigger]" style="width: 100%; height: 100%;" append-to="self">
      <textarea
          style="width: 100%; height: 100%; padding: 1em; resize: none"
          v-model="model.text"
          @input="debouncedSave"
          @keydown.ctrl.s.prevent="handleSave"
          placeholder="Type your markdown here..."
      />
      </SmartSuggest>
    </div>
    <div class="flex-auto overflow-auto p-4" style="max-width: 50%; min-width: 50%;">
      <div v-html="renderedMarkdown"></div>
    </div>
  </div>
</template>

<style scoped>
@import 'highlight.js/styles/github.css';
@import "marked-admonition-extension/dist/index.css";

</style>