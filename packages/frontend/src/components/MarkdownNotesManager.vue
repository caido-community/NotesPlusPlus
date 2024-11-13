<script setup lang="ts">
import {computed, onMounted, onUnmounted, ref, watch} from "vue";
import Tree from 'primevue/tree';
import {getProjectId} from "@/utils/index.js";
import {useSDK} from "@/plugins/sdk";
import ContextMenu from 'primevue/contextmenu';
import DynamicDialog from "primevue/dynamicdialog";
import ConfirmDialog from 'primevue/confirmdialog';
import {useConfirm} from "primevue/useconfirm";
import { useDialog } from 'primevue/usedialog';
import CreateNoteOrFolderDialog from "@/components/CreateNoteOrFolderDialog.vue";
import EditNoteNameDialog from "@/components/EditNoteNameDialog.vue";
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

const sdk = useSDK();
const dialog = useDialog();
let showTree = ref(true);
let menu = ref()
const tree = ref(null);
let nodes = ref([])

const DELETED_REPLAY_SESSION_SUBSCRIPTION = gql`
  subscription OnDeletedReplaySession {
    deletedReplaySession {
      deletedSessionId
    }
  }
`;

const evenBetterAPI = new EvenBetterAPI(sdk,undefined);




function collapse() {
  console.log("Collapse");
  showTree.value = !showTree.value;
}


sdk.backend.getNotesByProject(getProjectId()).then((data) => {
  console.log("PROJECT NOTES: ",data);
  let node;
  for (let i = 0; i < data.length; i++) {
    node = {
      key:data[i].id,
      text: data[i].noteText,
      shortText: data[i].noteShortText,
      data:data[i].noteName,
      label:data[i].noteName,
      icon: "pi pi-fw "+(data[i].isFolder ? 'pi-folder' : 'pi-file'),
      selectable: !data[i].isFolder,
    }
    if (data[i].isFolder) {
      node.children = []
    }
    if ( data[i].parentId == 0) {
      console.log("Adding root node:",node)
      nodes.value.push(node)
    } else {
      console.log("appending node:",node, " to node of id: ",data[i].parentId)
      const { node: foundNode } = findNodeById(nodes.value,data[i].parentId) || {}
      if (foundNode) {
        foundNode.children.push(node)
      }
    }
  }
}).catch((err) => {
  console.log("ERROR FETCHING NOTES: "+err);
})

evenBetterAPI.eventManager.on("onProjectChange", (newProject) => {
  console.log("PROJECT CHANGE: ",newProject);
  sdk.backend.getNotesByProject(newProject).then((data) => {
    console.log("UPDATING NOTES: ",data);
    nodes.value = [];
    selectedNode.value = null;
    let node;
    for (let i = 0; i < data.length; i++) {
      node = {
        key:data[i].id,
        text: data[i].noteText,
        shortText: data[i].noteShortText,
        data:data[i].noteName,
        label:data[i].noteName,
        icon: "pi pi-fw "+(data[i].isFolder ? 'pi-folder' : 'pi-file'),
        selectable: !data[i].isFolder,
      }
      if (data[i].isFolder) {
        node.children = []
      }
      if ( data[i].parentId == 0) {
        console.log("Adding root node:",node)
        nodes.value.push(node)
      } else {
        console.log("appending node:",node, " to node of id: ",data[i].parentId)
        const { node: foundNode } = findNodeById(nodes.value,data[i].parentId) || {}
        if (foundNode) {
          foundNode.children.push(node)
        }
      }
    }
  }).catch((err) => {
    console.log("ERROR FETCHING NOTES: "+err);
  })
});


sdk.backend.onEvent("notes++:projectChange", (project) => {
  console.log("PROJECT CHANGE: ",project)
})

const findNodeById = (nodes, id, parent = null) => {
  for (const node of nodes) {
    if (node.key === id) {
      return { node, parent }
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
    console.log("SELECTED: ",node)
    selectedNode.value = node

  }
}

const selectedNode = ref();
const creatingNewNoteOrFolder = ref();


const handleRightClick = function (event, node) {
  console.log("RIGHT CLICK: ",event, node);
  selectedNode.value = node;
  menu.value.show(event);
}


const contextMenuItems = computed(() => {
  let items = [{
    label: "New Folder",
    command: () => {
      console.log(selectedNode.value)
      creatingNewNoteOrFolder.value = 0;
      showCreateNoteOrFolderDialog()
    }
  },
    {
      label: "New Note",
      command: () => {
        console.log(selectedNode.value)
        creatingNewNoteOrFolder.value = 1;
        showCreateNoteOrFolderDialog()
      }
    }];

  console.log("SELECTED NODE: ",selectedNode.value)

  if (selectedNode.value == undefined ) {
    return items
  } else if( selectedNode.value.children != null ) {
    items.push(
        {
          label: "Delete Folder",
          command: () => {
            console.log("DELETE FOLDER:",selectedNode.value)
            if( selectedNode.value.children.length > 0 ) {
              confirmDeleteFolderWithNotes()
            } else {
              confirmDelete()
            }
          }
        },
        {
          label: "Edit Folder Name",
          command: () => {
            console.log("EDIT FOLDER:",selectedNode.value)
            showEditNoteFolderNameDialog()
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
            console.log("DELETE NOTE:",selectedNode.value)
            confirmDelete()
          }

        },
        {
          label: "Edit Note Name",
          command: () => {
            console.log("EDIT NOTE:",selectedNode.value)
            showEditNoteFolderNameDialog()
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
            console.log("EXPORT to MD",selectedNode.value)

            let content = selectedNode.value.text

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
              link.download = selectedNode.value.data+'.md'

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


const confirmDelete = () => {
  confirm.require({
    message: "Are you sure you want to delete this?",
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
      const { node: foundNode, parent } = findNodeById(nodes.value,selectedNode.value.key) || {}
      console.log(foundNode,parent)
      if (foundNode) {
        sdk.backend.deleteNote(foundNode.key).then((result) => {
          console.log("DELETE RESULT: ",result)
        })
        if (parent) {
          parent.children = parent.children.filter((obj) => {
            return obj.key !== foundNode.key
          })
        } else {
          nodes.value = nodes.value.filter((obj) => {
            return obj.key !== foundNode.key
          })
        }
      }
    },
  })
}

const confirmDeleteFolderWithNotes = () => {
  confirm.require({
    message: "This folder has notes within it, are you sure you want to delete it?",
    header: "Confirm delete non-empty folder",
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
      const { node: foundNode, parent } = findNodeById(nodes.value,selectedNode.value.key) || {}
      console.log(foundNode,parent)
      sdk.backend.deleteFolderAndChildren(foundNode.key).then((result) => {
        console.log("DELETE RESULT: ",result)
      })
      if (foundNode) {
        if (parent) {
          parent.children = parent.children.filter((obj) => {
            return obj.key !== foundNode.key
          })
        } else {
          nodes.value = nodes.value.filter((obj) => {
            return obj.key !== foundNode.key
          })
        }
      }
    },
  })
}

const showEditNoteFolderNameDialog = () => {
  console.log("SHOW EDIT NOTE/FOLDER DIALOG")
  const dialogRef = dialog.open(EditNoteNameDialog, {
    props: {
      header: computedNoteDialogHeader.value,
      style: {
        width: '25rem', background:'var(--c-bg-subtle)'
      },
      modal: true,
      appendTo: 'self',
    },
    data: {
      currentName: selectedNode.value.label,
    },
    onClose: (options) => {
      const data = options.data;
      if ( data ) {
        console.log("New " + (creatingNewNoteOrFolder.value ? "note" : "folder") + " Name",data)
        sdk.backend.editNoteName(selectedNode.value.key,data).then((result) => {
          console.log("EDIT RESULT: ",result)
        })
        selectedNode.value.label = data
        selectedNode.value.data = data
      }
    }
  })
  console.log(dialogRef)
}



const showCreateNoteOrFolderDialog = () => {
  console.log("SHOW DIALOG")
  const dialogRef = dialog.open(CreateNoteOrFolderDialog, {
    props: {
      header: computedNoteDialogHeader.value,
      style: {
        width: '25rem', background:'var(--c-bg-subtle)'
      },
      modal: true,
      appendTo: 'self',
    },
    onClose: (options) => {
      const data = options.data;
      if ( data ) {
        console.log("New " + (creatingNewNoteOrFolder.value ? "note" : "folder"),data)
        const noteKey = uuid.v4()
        if(creatingNewNoteOrFolder.value) {
          const node = {
            text:"",
            shortText:"",
            key:noteKey,
            data:data,
            label:data,
            icon: "pi pi-fw pi-file",
            selectable: true,
          }
          if( selectedNode.value == null ) {
            nodes.value.push(node)
            sdk.backend.saveNote(noteKey,"",data,getProjectId(),0,false).then((result) => {
              console.log("SAVE ROOT NOTE RESULT:",result)
              selectedNode.value = node
            })
          } else {
            selectedNode.value.children.push(node)
            sdk.backend.saveNote(noteKey,"",data,getProjectId(),selectedNode.value.key,false).then((result) => {
              console.log("SAVE FOLDER NOTE RESULT:",result)
              selectedNode.value = node
            })
          }
        } else {
          if( selectedNode.value == null ) {

            nodes.value.push(
                {
                  key: noteKey,
                  label:data,
                  data:data,
                  icon: "pi pi-fw pi-folder",
                  children: []
                },
            )
            sdk.backend.saveNote(noteKey,"",data,getProjectId(),0,true).then((result) => {console.log("SAVE ROOT FOLDER RESULT:",result)})

          } else {
            selectedNode.value.children.push(
                {
                  key: noteKey,
                  label:data,
                  data:data,
                  icon: "pi pi-fw pi-folder",
                  children: []
                },
            )
            sdk.backend.saveNote(noteKey,"",data,getProjectId(),selectedNode.value.key,true).then((result) => {console.log("SAVE SUB-FOLDER RESULT:",result)})

          }
        }
      }
    }
  })
  console.log(dialogRef)
}

const noteUpdate = function(newNote) {
  console.log("SAVED NOTE: ",newNote)
  sdk.backend.editNoteText(newNote.key,newNote.text, newNote.shortText).then((result) => {
    console.log("SAVE NOTE RESULT: ",result);
  });
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

</script>

<template>

  <div id="plugin--notesplusplus">

    <div class="tree-container" :class="{ treeShown: showTree, treeHide: !showTree}">
      <div  class="tree-collapse-button"  :class="{ collapsed: !showTree}" @click="collapse">
        <i v-if="showTree == true" class="pi pi-angle-double-left" :style="{'margin-right':'.5em'}"></i>
        <i v-else class="pi pi-angle-double-right" :style="{'margin-right':'.5em'}"></i>
      </div>
      <div  class="tree-content" id="tree-content" v-show="showTree">
        <Tree :pt="{pcFilterContainer:{root: 'border-gray-500 border-1'}, nodeLabel:{style:'width: 100%' }, nodeContent: ({context}) => ({
          onContextmenu: (event) => handleRightClick(event,context.node)
        })}" id="NoteTree" @contextmenu="handleRightClick($event, null)" @nodeSelect="nodeSelected" :value="nodes" class="w-full mw-100"
              :style="{'height':'100%', 'background':'var(--c-bg-subtle)'}" selectionMode="single"  :filter="true" filterMode="strict"
              filterBy='label,text' ref="tree">
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