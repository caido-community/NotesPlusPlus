<script setup lang="ts">
import MarkdownNotes from "@/components/MarkdownNotes.vue";
import {computed, ref} from "vue";
import Tree from 'primevue/tree';
import {getProjectId} from "@/utils/index.js";
import {useSDK} from "@/plugins/sdk";
import ContextMenu from 'primevue/contextmenu';
import DynamicDialog from "primevue/dynamicdialog";
import {uuid} from "@primevue/core";
import ConfirmDialog from 'primevue/confirmdialog';
import {useConfirm} from "primevue/useconfirm";
import { useDialog } from 'primevue/usedialog';
import CreateNoteOrFolderDialog from "@/components/CreateNoteOrFolderDialog.vue";
import EditNoteNameDialog from "@/components/EditNoteNameDialog.vue";

const sdk = useSDK();
const dialog = useDialog();
let showTree = ref(true);
let menu = ref()
const nodes = ref([])

function collapse() {
  console.log("Collapse");
  showTree.value = !showTree.value;
}


const notes =  sdk.backend.getNotesByProject(getProjectId()).then((data) => {
  console.log("PROJECT NOTES: "+data);
}).catch((err) => {
  console.log("ERROR FETCHING NOTES: "+err);
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

// Delete operation
function deleteNode() {
  return null;
}

const nodeSelected = function(node) {
  console.log(node)
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
      nodes.value = modifyNodeByKey(nodes.value,selectedNode.value.key,deleteNode)
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
      nodes.value = modifyNodeByKey(nodes.value,selectedNode.value.key,deleteNode)
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
        if(creatingNewNoteOrFolder.value) {
          if( selectedNode.value == null ) {
            nodes.value.push(
                {
                  key:uuid(),
                  data:data,
                  label:data,
                  icon: "pi pi-fw pi-file",
                  selectable: true,
                }
            )
          } else {
            selectedNode.value.children.push({
              key:uuid(),
              data:data,
              label:data,
              icon: "pi pi-fw pi-file",
              selectable: true,
            })
          }

        } else {
          if( selectedNode.value == null ) {

            nodes.value.push(
                {
                  key: uuid(),
                  label:data,
                  data:data,
                  icon: "pi pi-fw pi-folder",
                  children: []
                },
            )
          } else {
            selectedNode.value.children.push(
                {
                  key: uuid(),
                  label:data,
                  data:data,
                  icon: "pi pi-fw pi-folder",
                  children: []
                },
            )
          }
        }
      }
    }
  })
  console.log(dialogRef)
}


</script>

<template>

  <div id="plugin--notesplusplus">

    <div class="tree-container" :class="{ treeShown: showTree, treeHide: !showTree}">
      <div  class="tree-collapse-button"  :class="{ collapsed: !showTree}" @click="collapse">
        <i v-if="showTree == true" class="pi pi-angle-double-left"></i>
        <i v-else class="pi pi-angle-double-right"></i>
      </div>
      <div  class="tree-content" id="tree-content" v-show="showTree">
        <Tree :pt="{pcFilterContainer:{root: 'border-gray-500 border-1'}, nodeLabel:{style:'width: 100%' }, nodeContent: ({context}) => ({
          onContextmenu: (event) => handleRightClick(event,context.node)
        })}" id="NoteTree" @contextmenu="handleRightClick($event, null)" @nodeSelect="nodeSelected" :value="nodes" class="w-full mw-100" :style="{'height':'100%', 'background':'var(--c-bg-subtle)'}" selectionMode="single"  :filter="true" filterMode="strict" >
        </Tree>
      </div>
    </div>
    <div id="markdown-view">
      <MarkdownNotes/>
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
  //min-width: 300px; /* Adjust as needed */
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
  //background-color: #007bff; /* Adjust color as needed */
  cursor: pointer;
  border-top-left-radius: 4px;
  border-bottom-left-radius: 4px;
  transition: right 0.3s ease;
}

.tree-collapse-button.collapsed {
  right: 0; /* Adjust based on the button's width */
}
</style>