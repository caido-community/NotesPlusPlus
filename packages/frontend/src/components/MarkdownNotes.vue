<script setup lang="ts">
import {ref, computed, onMounted, onUnmounted, watch, watchEffect} from 'vue';
import { marked } from 'marked';
import hljs from 'highlight.js';
import { markedHighlight } from "marked-highlight";
import 'highlight.js/styles/github.css';
import markedAlert from "marked-alert";
import type { Caido } from "@caido/sdk-frontend";
import { SmartSuggest, Trigger } from 'vue-smart-suggest';
import {
  DeletedReplaySessionPayload,
  UpdatedReplaySessionSubscription
} from "@caido/sdk-frontend/src/types/__generated__/graphql-sdk";
import { gql } from '@apollo/client/core';
import {provideApolloClient, useSubscription} from "@vue/apollo-composable";
import {client} from "@/utils/graphqlClient";
import {useSDK} from "@/plugins/sdk";

const sdk = useSDK();

const props = defineProps({
  note: {
    type: Object,
  }
})

const emit = defineEmits(['update:note'])

const noteData = computed({
  get: () => props.note,
  set: (newValue) => emit('update:note', newValue)
})


let items = []
const editorTextarea = ref<HTMLTextAreaElement | null>(null);
const fullContent = ref("");
const displayContent = ref(fullContent.value);

watch(
    () => props.note,
    (newNote) => {
      console.log("NEW NOTE: ", newNote)
      fullContent.value = newNote.text ;
      displayContent.value = newNote.shortText ;
    },
    { deep: true } // Use deep watching if your node has nested properties
)

const DELETED_REPLAY_SESSION_SUBSCRIPTION = gql`
  subscription OnDeletedReplaySession {
    deletedReplaySession {
      deletedSessionId
    }
  }
`;

const truncateDataUri = (uri: string): string => {
  if (uri.length <= 30) return uri;
  const prefix = uri.slice(0, 10);
  const suffix = uri.slice(-10);
  return `${prefix}...${suffix}`;
};


const handlePaste = (event: ClipboardEvent) => {
  const items = event.clipboardData?.items;
  if (!items) return;

  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      event.preventDefault();
      const blob = items[i].getAsFile();
      if (!blob) continue;

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        insertImageMarkdown(dataUrl);
      };
      reader.readAsDataURL(blob);
      break;
    }
  }
};

const insertImageMarkdown = (dataUrl: string) => {
  const textarea = editorTextarea.value;
  if (!textarea) return;

  const cursorPos = textarea.selectionStart;
  const textBefore = fullContent.value.substring(0, cursorPos);
  const textAfter = fullContent.value.substring(cursorPos);

  const fullImageMarkdown = `![Pasted Image](${dataUrl})`;
  const truncatedImageMarkdown = `![Pasted Image](${truncateDataUri(dataUrl)})`;

  fullContent.value = `${textBefore}${fullImageMarkdown}${textAfter}`;
  displayContent.value = `${textBefore}${truncatedImageMarkdown}${textAfter}`;

  // Move cursor after the inserted image markdown
  textarea.selectionStart = textarea.selectionEnd = cursorPos + truncatedImageMarkdown.length;
};





let userMentionTrigger: Trigger;
async function listenForNewReplays() {
  const newReplays = Caido.graphql.updatedReplaySession({})
  for await (const newReplay:UpdatedReplaySessionSubscription of newReplays) {
    console.log(newReplay,newReplay.updatedReplaySession);
    let found = false;
    for(let i=0; i < items.length; i++) {
      if( items[i].id == newReplay.updatedReplaySession.sessionEdge.node.id) {
        console.log("found, updating")
        found = true;
        items[i] = {
          value: `@[${newReplay.updatedReplaySession.sessionEdge.node.name}]`,
          label: newReplay.updatedReplaySession.sessionEdge.node.name,
          searchMatch: newReplay.updatedReplaySession.sessionEdge.node.name,
          id: newReplay.updatedReplaySession.sessionEdge.node.id}
      }
    }
    if(!found) {
      console.log("new")
      items.push({
        value: `@[${newReplay.updatedReplaySession.sessionEdge.node.name}]`,
        label: newReplay.updatedReplaySession.sessionEdge.node.name,
        searchMatch: newReplay.updatedReplaySession.sessionEdge.node.name,
        id: newReplay.updatedReplaySession.sessionEdge.node.id})
    }
  }
}

listenForNewReplays()


Caido.graphql.replaySessionCollections().then((collections) => {
  console.log(collections);
  collections.replaySessionCollections.edges.forEach( (edge) => {
    console.log("node",edge.node);
    edge.node.sessions.forEach( (session) => {
      console.log("session",session);
      items.push({value: `@[${session.name}]`, label: session.name, searchMatch: session.name, id: session.id});
    })
  })
})

userMentionTrigger = {
  char: '@',
  items: items,
};


function waitForElm(selector, detatch=true) {

  return new Promise(resolve => {
    if (document.querySelector(selector)) {
      return resolve(document.querySelector(selector));
    }

    const observer = new MutationObserver(() => {
      if (document.querySelector(selector)) {
        if( detatch ) {
          observer.disconnect();
        }
        resolve(document.querySelector(selector));
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  });
}

const handleInput = () => {
  fullContent.value = displayContent.value;
};


const handleCustomLinkClick = (e: Event) => {
  const target = e.target as HTMLElement;
  if (target.classList.contains('custom-link')) {
    e.preventDefault();
    const id = target.getAttribute('data-id');
    console.log(`Custom link clicked: ${id}`);
    Caido.navigation.goTo("/replay");
    const event = new MouseEvent("mousedown", { button: 0 });


    waitForElm('.c-replay').then((elm) => {
      console.log(elm);
      let replayTabs = document.getElementsByClassName("c-tree-item__item");
      console.log(replayTabs);
      console.log(replayTabs.length);
      for (let i = 0; i < replayTabs.length; i++) {
        console.log(i, replayTabs[i].innerText, id, replayTabs[i].innerText == id);
        if( replayTabs[i].innerText == id ) {
          console.log("found:",replayTabs[i]);
          replayTabs[i].dispatchEvent(event);
          replayTabs[i].dispatchEvent(event);
          let wrapperDiv = document.createElement("div");
          wrapperDiv.classList.add("c-request-header__action");
          let icon = document.createElement("i");
          icon.classList.add("c-icon", "fas", "fa-code");
          wrapperDiv.appendChild(icon);
          console.log("REQUEST HEADER:" ,document.getElementsByClassName("c-request-header")[0])
          document.getElementsByClassName("c-request-header")[0].appendChild(wrapperDiv);
        }
      }
    });
  }
};

const { result } =provideApolloClient(client)(() => useSubscription(DELETED_REPLAY_SESSION_SUBSCRIPTION));


watch(
    result,
    (data: DeletedReplaySessionPayload) => {
      console.log("watch:",data.deletedReplaySession);
      let index:number =  items.findIndex(x => x.id==data.deletedReplaySession.deletedSessionId);
      if( index > -1 ) {
        console.log("found, Removing")
        items.splice(index, 1);
      }
    }
)


    onMounted(() => {
      const customLinkExtension = {
        name: 'ReplayLink',
        level: 'inline',
        start(src: string) { return src.match(/@\[/)?.index; },
        tokenizer(src: string) {
          const rule = /^@\[([a-zA-Z0-9-]+)]/;
          const match = rule.exec(src);
          if (match) {
            return {
              type: 'ReplayLink',
              raw: match[0],
              id: match[1],
            };
          }
        },
        renderer(token: any) {
          return `<a href="#" class="custom-link" data-id="${token.id}">${token.id}</a>`;
        }
      };

      // Add the custom extension to marked
      marked.use({ extensions: [customLinkExtension] });
      marked.use(markedAlert())
      marked.use(markedHighlight({
        langPrefix: 'hljs language-',
        highlight(code, lang) {
          const language = hljs.getLanguage(lang) ? lang : 'plaintext';
          return hljs.highlight(code, { language }).value;
        }
      }));

      document.addEventListener('click', handleCustomLinkClick);

    });

    onUnmounted(() => {
      document.removeEventListener('click', handleCustomLinkClick);
    });


    const renderedMarkdown = computed(() => {
      //return marked(fullContent.value);
      console.log("RENDER MARKDOWN COMPUTE:",noteData.value)
      if (noteData.value != undefined) {
        return marked(noteData.value.text)
      }
      return marked("")
    });

    const handleSave = function() {
      console.log("SAVING NOTE FOR: ",props.note )
      // sdk.backend.editNoteText(props.note.key,fullContent.value, displayContent.value).then((result) => {
      //   console.log("SAVE NOTE RESULT: ",result);
      // });
      $emit('update:note', { ...nodeData, name: $event.target.value })
    }
</script>

<style scoped>
@import 'highlight.js/styles/github.css';
@import "marked-admonition-extension/dist/index.css";
</style>

<template>
  <div style="display: flex;height: 100%;width: 100%;">
    <div class="flex-auto" style="flex: 1 1 auto;">
      <SmartSuggest :triggers="[userMentionTrigger]" style="width: 100%; height: 100%;">
      <textarea
          style="width: 100%; height: 100%; padding: 1em; resize: none"
          ref="editorTextarea"
          @paste="handlePaste"
          v-model="noteData.text"
          @input="handleInput"
          @keydown.ctrl.s.prevent="handleSave"
          class="editor-textarea"
          placeholder="Type your markdown here..."
      ></textarea>
      </SmartSuggest>
    </div>
      <div class="flex-auto overflow-auto p-4" style="max-width: 50%; min-width: 50%;">
        <div v-html="renderedMarkdown"></div>
      </div>
  </div>
</template>
