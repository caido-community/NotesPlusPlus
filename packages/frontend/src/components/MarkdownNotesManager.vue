<script setup lang="ts">
import {computed, onMounted, onUnmounted, ref, watch} from "vue";
import { NoteNode } from "shared";
import Tree from 'primevue/tree';
import {getProjectId} from "@/utils/index.js";
import {useSDK} from "@/plugins/sdk";
import ContextMenu from 'primevue/contextmenu';
import DynamicDialog from "primevue/dynamicdialog";
import ConfirmDialog from 'primevue/confirmdialog';
import {useConfirm} from "primevue/useconfirm";
import { useDialog } from 'primevue/usedialog';
import CreateNoteOrFolderDialog from "@/components/CreateNoteOrFolderDialog.vue";
import { uuid } from 'vue-uuid';
import MarkdownEditor from "@/components/MarkdownEditor.vue";
import {
  DeletedReplaySessionPayload,
} from "@caido/sdk-frontend/src/types/__generated__/graphql-sdk";
import {provideApolloClient, useSubscription} from "@vue/apollo-composable";
import {client} from "@/utils/graphqlClient";
import {handleCustomLinkClick} from "@/plugins/CustomLinkMarkedExtension";
import {gql} from "@apollo/client/core";
import { EvenBetterAPI } from "@bebiks/evenbetter-api";
import Explainer from "@/components/Explainer.vue";
import {TreeNode} from "primevue/treenode";

const sdk = useSDK();
const dialog = useDialog();
let showTree = ref(true);
let menu = ref()
const tree = ref();
let nodes = ref<NoteNode[]>([])

const DELETED_REPLAY_SESSION_SUBSCRIPTION = gql`
  subscription OnDeletedReplaySession {
    deletedReplaySession {
      deletedSessionId
    }
  }
`;

sdk.commands.register("CopyToNotes",{
  name: "Copy Selected Text To Current Note",
  run: () => {
    const text = sdk.window.getActiveEditor().getSelectedText()
    selectedNode.value.data = selectedNode.value.data + `\n\`\`\`\n${text}\n\`\`\``
  }
})
sdk.shortcuts.register("CopyToNotes",["control", 'alt', "c"])

sdk.commandPalette.register("CopyToNotes")

const evenBetterAPI = new EvenBetterAPI(sdk,undefined);




function collapse() {
  console.log("Collapse");
  showTree.value = !showTree.value;
}


sdk.backend.getNotes(getProjectId()).then((notes) => {
  console.log("PROJECT NOTES: ",notes);
nodes.value = notes
})

function modifyNodeByKey(nodes, targetKey, operation) {
  if (!Array.isArray(nodes)) return nodes;

  return nodes.reduce((acc, node) => {
    if (node.key === targetKey) {
      const result = operation(node);
      return result ? [...acc, result] : acc;
    }

    if (node.children) {
      const modifiedNode = {
        ...node,
        children: modifyNodeByKey(node.children, targetKey, operation)
      };
      return [...acc, modifiedNode];
    }

    return [...acc, node];
  }, []);
}


sdk.backend.onEvent("notes++:projectChange", (notes: NoteNode[]) => {
  console.log("PROJECT CHANGE: ",notes)
  selectedNode.value = null;
  selectedKey.value  = null;
  nodes.value = notes
})

const findNodeById = (nodes: NoteNode[], id:string): NoteNode => {
  for (const node of nodes) {

    console.log(`Does node: ${node.key} === ${id}`)
    if (node.key === id) {
      return node
    }

    if (node.children && node.children.length > 0) {
      const result = findNodeById(node.children, id, node)
      if (result) {
        return result
      }
    }
  }
  return null
}


const nodeSelected = function(node) {
  if ( node.selectable ) {
    console.log("SELECTED: ",node, selectedKey.value)
    selectedNode.value = node
  }
}

const selectedNode = ref();
const rightClickNode = ref<NoteNode>();
const creatingNewNoteOrFolder = ref();


const handleRightClick = function (event, node:TreeNode) {
  console.log("RIGHT CLICK: ",event, node,tree.value.state, tree.value.context);
  rightClickNode.value = node
  menu.value.show(event);
}


const contextMenuItems = computed(() => {
  let items = [{
    label: "New Folder",
    command: () => {
      console.log(rightClickNode.value)
      creatingNewNoteOrFolder.value = 0;
      showDialog(false)
    }
  },
    {
      label: "New Note",
      command: () => {
        console.log(rightClickNode.value)
        creatingNewNoteOrFolder.value = 1;
        showDialog(false)
      }
    }];

  console.log("SELECTED NODE: ",rightClickNode.value)

  if (rightClickNode.value == undefined ) {
    // right click was in tree but not on node
    return items
  } else if( rightClickNode.value.children != null ) {
    // right click was on a node
    items.push(
        {
          label: "Delete Folder",
          command: () => {
            console.log("DELETE FOLDER:",rightClickNode.value)
            if( rightClickNode.value.children.length > 0 ) {
              confirmDelete(false)
            } else {
              confirmDelete(true)
            }
          }
        },
        {
          label: "Edit Folder Name",
          command: () => {
            console.log("EDIT FOLDER:",rightClickNode.value)
            if(rightClickNode.value.children.length > 0) {
              sdk.window.showToast("Renaming folders with contents coming soon.",{variant:"info"})
            } else {
              showDialog(true)
            }
          }
        }
    )
  } else {
    // right click on note
    items = []
    items.push(
        {
          label: "Delete Note",
          command: () => {
            console.log("DELETE NOTE:",rightClickNode.value)
            confirmDelete(true)
          }

        },
        {
          label: "Edit Note Name",
          command: () => {
            console.log("EDIT NOTE:",rightClickNode.value)
            showDialog(true)
          }
        },
        {
          label: "Export to PDF",
          command: () => {
            let content = document.getElementById("markdownView").innerHTML

            const replayMapping = Promise.all(sdk.replay.getSessions().map(session => {
              console.log("session:", session)
              return sdk.graphql.request({id: session.id}).then((request) => {
                console.log("Request: ", request)
                content = content.replace(
                    `<a href="#" class="custom-link" data-id="${session.name}">${session.name}</a>`,
                    `<h3>Request for Replay: ${session.name}</h3><br><pre><code>${request.request.raw}</code></pre>`
                )
              })
            }))

            Promise.all([replayMapping]).then(() => {

              // Create an iframe
              const iframe = document.createElement('iframe')
              iframe.style.display = 'none'  // Make it invisible
              document.body.appendChild(iframe)

              const doc = iframe.contentDocument
              doc.open()
              doc.write(content)
              doc.close()
              iframe.contentWindow.print()
            })

          }
        },
        {
          label: "Export to MD",
          command: () => {
            console.log("EXPORT to MD",rightClickNode.value)

            let content = rightClickNode.value.data

            const mapping = Promise.all(sdk.files.getAll().map((file) => {
              return sdk.backend.fetchImage(file).then((dataURL:String) => {
                console.log("dataURL:",dataURL)
                content = content.replace(`{${file.id}}`, `![${file.name}](${dataURL})`)
              })
            }))

            const replayMapping = Promise.all(sdk.replay.getSessions().map(session => {
              console.log("session:", session)
              return sdk.graphql.request({id: session.id}).then((request) => {
                console.log("Request: ", request)
                content = content.replace(
                    `@[${session.name}]`,
                    `### Request for Replay: ${session.name}\n\`\`\`\n${request.request.raw}\n\`\`\``
                )
              })
            }))

            Promise.all([mapping,replayMapping]).then(() => {

              console.log("Converted doc:\n "+content)
              const blob = new Blob([content], { type: 'text/markdown' })

              // Create a URL for the blob
              const url = URL.createObjectURL(blob)

              // Create a temporary link element
              const link = document.createElement('a')
              link.href = url
              link.download = rightClickNode.value.data+'.md'

              // Programmatically click the link to trigger download
              document.body.appendChild(link)
              link.click()

              // Clean up
              document.body.removeChild(link)
              URL.revokeObjectURL(url)
            })
          }
        }
    )
  }
  return items;
})


const computedNoteDialogHeader = computed(() => {
  return creatingNewNoteOrFolder.value ? "New Note Name" : "New Folder Name"
})

const confirm = useConfirm();


const confirmDelete = (isEmpty:boolean) => {
  confirm.require({
    message: isEmpty ? "Are you sure you want to delete this?": "This folder has notes within it, are you sure you want to delete it?",
    header: "Confirm deletion",
    icon: 'pi pi-exclamation-triangle',
    rejectProps: {
      label: "Cancel",
      severity: "secondary",
      outlined: true
    },
    acceptProps: {
      label: "Confirm"
    },
    accept: () => {
      sdk.backend.deleteNoteOnDisk(rightClickNode.value).then(() => {
        nodes.value = modifyNodeByKey(nodes.value,rightClickNode.value.key,function (){return null})
      })
    },
  })
}

const showDialog = (editMode: boolean) => {
  console.log("SHOW DIALOG")
  dialog.open(CreateNoteOrFolderDialog, {
    props: {
      header: computedNoteDialogHeader.value,
      style: {
        width: '25rem', background:'var(--c-bg-subtle)'
      },
      modal: true,
      appendTo: 'self',
    },
    data: {
      currentName: editMode ? rightClickNode.value.label : null,
    },
    onClose: (options) => {
      const newNoteOrFolderName = options.data;

      if ( newNoteOrFolderName ) {
        console.log("New " + (creatingNewNoteOrFolder.value ? "note" : "folder"), newNoteOrFolderName)
        if (editMode) {
          sdk.backend.renameNoteOnDisk(rightClickNode.value, newNoteOrFolderName).then(() => {
            rightClickNode.value.label = newNoteOrFolderName
            rightClickNode.value.filepath[rightClickNode.value.filepath.length-1] = newNoteOrFolderName
            console.log("Updated: ",rightClickNode.value)
          })
        } else {
          const noteKey = uuid.v4()
          if (creatingNewNoteOrFolder.value) {

            // creating a note
            const note = new NoteNode(noteKey, "", newNoteOrFolderName, "pi pi-fw pi-file", true, getProjectId(), false)
            if (rightClickNode.value == null) {
              sdk.backend.saveNoteNode(note)
              note.filepath = [note.label]
              // creating a root note
              nodes.value.push(note)
            } else {
              // creating a note in a folder
              rightClickNode.value.children.push(note)
              note.filepath = [...rightClickNode.value.filepath, note.label]
              sdk.backend.saveNoteNode(note)

            }
          } else {

            // creating a folder
            const folder = new NoteNode(noteKey, "", newNoteOrFolderName, "pi pi-fw pi-folder", false, getProjectId(), true, [])
            if (rightClickNode.value == null) {
              // creating a root folder
              nodes.value.push(folder)
              folder.filepath = [folder.label]
              sdk.backend.saveNoteNode(folder)

            } else {
              // creating subfolder
              rightClickNode.value.children.push(folder)
              folder.filepath = [...rightClickNode.value.filepath, folder.label]
              sdk.backend.saveNoteNode(folder)
            }
          }
        }
      }
    }
  })
}

const noteUpdate = function(newNote) {
  console.log("SAVED NOTE: ",newNote)
  sdk.backend.saveNoteNode(newNote)
}

const replays = ref([])

async function listenForNewReplays() {
  const newReplays = sdk.graphql.updatedReplaySession({})
  for await (const newReplay of newReplays) {
    console.log("UPDATED REPLAY:",newReplay);
    let found = false;
    for(let i=0; i < replays.value.length; i++) {
      if( replays.value[i].id == newReplay.updatedReplaySession.sessionEdge.node.id) {
        console.log("already exists, updating")
        found = true;
        replays.value[i] = {
          value: `@[${newReplay.updatedReplaySession.sessionEdge.node.name}]`,
          label: newReplay.updatedReplaySession.sessionEdge.node.name,
          searchMatch: newReplay.updatedReplaySession.sessionEdge.node.name,
          id: newReplay.updatedReplaySession.sessionEdge.node.id}
      }
    }
    if(!found) {
      console.log("new replay, adding")
      replays.value.push({
        value: `@[${newReplay.updatedReplaySession.sessionEdge.node.name}]`,
        label: newReplay.updatedReplaySession.sessionEdge.node.name,
        searchMatch: newReplay.updatedReplaySession.sessionEdge.node.name,
        id: newReplay.updatedReplaySession.sessionEdge.node.id})
    }
  }
}

onMounted(() => {
  const { result } =provideApolloClient(client)(() =>  {
    console.log("GQL CLIENT: ",client)
    return useSubscription(DELETED_REPLAY_SESSION_SUBSCRIPTION)
  });

  sdk.graphql.replaySessionCollections().then((collections) => {
    console.log("Current replay sessions:",collections);
    collections.replaySessionCollections.edges.forEach( (edge) => {
      edge.node.sessions.forEach( (session) => {
        replays.value.push({value: `@[${session.name}]`, label: session.name, searchMatch: session.name, id: session.id});
      })
    })
  })


  watch(
      result,
      (data: DeletedReplaySessionPayload) => {
        console.log("watch:",data);
        let index:number =  replays.value.findIndex(x => x.id==data.deletedSessionId);
        if( index > -1 ) {
          console.log("found, Removing")
          replays.value.splice(index, 1);
        }
      }
  )

  listenForNewReplays()

  document.addEventListener('click', handleCustomLinkClick);

})


onUnmounted(() => {
  document.removeEventListener('click', handleCustomLinkClick);
});

const selectedKey = ref(null);


</script>

<template>

  <div id="plugin--notesplusplus">

    <div class="tree-container" :class="{ treeShown: showTree, treeHide: !showTree}">
      <div  class="tree-collapse-button"  :class="{ collapsed: !showTree}" @click="collapse">
        <i v-if="showTree == true" class="pi pi-angle-double-left" :style="{'margin-right':'.5em'}"></i>
        <i v-else class="pi pi-angle-double-right" :style="{'margin-right':'.5em'}"></i>
      </div>
      <div  class="tree-content" id="tree-content" v-show="showTree">
        <Tree :pt="{pcFilterIconContainer:{root: 'p-inputicon'}, nodeLabel:{style:'width: 100%' }, nodeContent: ({context}) => ({
          onContextmenu: (event) => handleRightClick(event,context.node)
        })}" id="NoteTree" @contextmenu="handleRightClick($event, null)" @nodeSelect="nodeSelected" :value="nodes" class="w-full mw-100"
              :style="{'height':'100%', 'background':'var(--c-bg-subtle)'}" selectionMode="single"   :filter="true" filterMode="strict"
              filterBy='label,data' ref="tree" v-model:selectionKeys="selectedKey" >
        </Tree>
      </div>
    </div>
    <div id="markdown-view">
      <MarkdownEditor v-if="selectedNode" v-model:model="selectedNode" v-model:replays="replays" @update:note="noteUpdate" />
      <Explainer v-else />
    </div>
    <ContextMenu ref="menu" :model="contextMenuItems" append-to="self"/>
    <ConfirmDialog append-to="self"/>
    <DynamicDialog append-to="self"/>
  </div>
</template>

<style scoped>

#markdown-view {
  width: 100%;
}

:root {
  --p-inputtext-filled-background: gray;
}

#plugin--notesplusplus {
  height: 100%;
  width: 100%;
  display: flex;
}



.tree-container {
  position: relative;
  transition: width 0.3s ease;
}

.treeShown {
  max-width: 10%;
}

.treeHide {
  min-width: 20px;
  overflow: hidden;
  background-color: rgb(18, 18, 18);
}

.tree-content {
  height: 100%;
  overflow-y: auto;
}

.tree-collapse-button {
  position: absolute;
  top: 50%;
  right: 0;
  transform: translateY(-50%);
  cursor: pointer;
  border-top-left-radius: 4px;
  border-bottom-left-radius: 4px;
  transition: right 0.3s ease;
}

.tree-collapse-button.collapsed {
  right: 0;
}
</style>