<script setup lang="ts">
import MarkdownNotes from "@/components/MarkdownNotes.vue";
// import CIcon from "@coreui/icons-vue";
// import {cilChevronDoubleLeft, cilChevronDoubleRight, cilPencil, cilX} from "@coreui/icons";
import {computed, ref} from "vue";
import Tree from 'primevue/tree';
import { PrimeIcons } from '@primevue/core/api';
import InputText from 'primevue/inputtext';
import {getProjectId} from "@/utils/index.js";
import {useSDK} from "@/plugins/sdk";
import ContextMenu from 'primevue/contextmenu';
import Dialog from 'primevue/dialog';
import {uuid} from "@primevue/core";

let showTree = ref(true);
let menu = ref()
let iconType = PrimeIcons.ANGLE_DOUBLE_LEFT;
function collapse() {
  console.log("Collapse");
  showTree.value = !showTree.value;
  if( showTree.value ) {
    iconType = PrimeIcons.ANGLE_DOUBLE_LEFT;
  } else {
    iconType = PrimeIcons.ANGLE_DOUBLE_RIGHT;
  }
}

const sdk = useSDK();

const notes =  sdk.backend.getNotesByProject(getProjectId()).then((data) => {
  console.log("PROJECT NOTES: "+data);
}).catch((err) => {
  console.log("ERROR FETCHING NOTES: "+err);
})

const nodes = ref([])

function modifyNodeByKey(nodes, targetKey, operation) {
  if (!Array.isArray(nodes)) return nodes;

  // Clone the array to maintain immutability
  return nodes.reduce((acc, node) => {
    // If this is the target node, apply the operation
    if (node.key === targetKey) {
      const result = operation(node);
      // If operation returns null/undefined, skip this node (delete)
      // Otherwise use the modified node
      return result ? [...acc, result] : acc;
    }

    // If node has children, recursively process them
    if (node.children) {
      const modifiedNode = {
        ...node,
        children: modifyNodeByKey(node.children, targetKey, operation)
      };
      return [...acc, modifiedNode];
    }

    // Keep node unchanged
    return [...acc, node];
  }, []);
}

// Usage examples:

// Delete operation
function deleteNode() {
  return null; // Returning null/undefined removes the node
}

// Edit operation (example: updating multiple properties)
function editNodeProperties(updates) {
  return (node) => ({
    ...node,
    ...updates
  });
}

function searchNodeForKey(obj, key) {
  console.log(obj, obj.key, key)
  if (obj.key === key) {
    return obj;
  }

  if ("children" in obj) {
    console.log(obj, obj.children);
    for( let i=0; i<obj.children.length; i++ ) {
      const result = searchNodeForKey(obj.children[i], key);
      if (result !== null) {
        console.log("FOUND:",result);
        return result;
      }
    }
  }

  return null;
}

function searchNodesForKey(key) {
  for( let i=0; i<nodes.value.length; i++ ) {
    const result = searchNodeForKey(nodes.value[i], key);
    if (result !== null) {
      return result;
    }
  }
  return null;
}


const remove = (node) => {
  // Implement your remove logic here
  console.log(`Remove node: ${node.id}`);
};


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

const NotesCreationDialogVisible = ref(false);


const contextMenuItems = computed(() => {
  let items = [{
    label: "New Folder",
    command: () => {
      console.log(selectedNode.value)
      creatingNewNoteOrFolder.value = 0;
      NotesCreationDialogVisible.value = true
    }
  },
    {
      label: "New Note",
      command: () => {
        console.log(selectedNode.value)
        creatingNewNoteOrFolder.value = 1;
        NotesCreationDialogVisible.value = true

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

          }

        },
    )
  } else {
    // right click on note
    items = []
    items.push(
        {
          label: "Delete Note",
          command: () => {
            console.log("DELETE NOTE:",selectedNode.value)
            nodes.value = modifyNodeByKey(nodes.value,selectedNode.value.key,deleteNode)
          }

        },
        {
          label: "Edit Note Name",
          command: () => {
            console.log("EDIT NOTE:",selectedNode.value)

          }
        }
    )
  }
  return items;
})


const newNoteNameValue = ref(null)

const computedNoteDialogHeader = computed(() => {
  return creatingNewNoteOrFolder.value ? "New Note Name" : "New Folder Name"
})

const CreateNewNoteOrFolder = function () {
  NotesCreationDialogVisible.value = false
  console.log("New " + (creatingNewNoteOrFolder.value ? "note" : "folder"), newNoteNameValue.value)
  if(creatingNewNoteOrFolder.value) {
    nodes.value.push(
            {
              key:uuid(),
              data: newNoteNameValue.value,
              label: newNoteNameValue.value,
              icon: "pi pi-fw pi-file",
              selectable: true,
            }
    )
  } else {
    nodes.value.push(
        {
          key:uuid(),
          label: newNoteNameValue.value,
          data: newNoteNameValue.value,
          icon: "pi pi-fw pi-folder",
          children: [
            {
              key:uuid(),
              data: "Test",
              label: "Test",
              icon: "pi pi-fw pi-file",
              selectable: true,
            }
          ]
        },
    )
  }
  newNoteNameValue.value = ""
}



</script>

<template>

  <div id="plugin--notesplusplus">

    <div class="tree-container" :class="{ treeShown: showTree, treeHide: !showTree}">
      <div  class="tree-collapse-button"  :class="{ collapsed: !showTree}" @click="collapse">
        <i v-if="showTree.value" class="pi pi-angle-double-left"></i>
        <i v-else class="pi pi-angle-double-right"></i>
      </div>
      <div  class="tree-content" id="tree-content" v-show="showTree">
        <Tree :pt="{pcFilterContainer:{root: 'border-gray-500 border-1'} }" id="NoteTree" @contextmenu="handleRightClick($event, null)" @nodeSelect="nodeSelected" :value="nodes" class="w-full mw-100" :style="{'height':'100%', 'background':'var(--c-bg-subtle)'}" selectionMode="single"  :filter="true" filterMode="strict" >
          <template #default="slotProps">
            <div  @contextmenu="handleRightClick($event, slotProps.node)">
            <span>{{ slotProps.node.data }}</span>
            </div>
          </template>
        </Tree>
      </div>
    </div>
    <div id="markdown-view">
      <MarkdownNotes/>
    </div>
    <ContextMenu ref="menu" :model="contextMenuItems" append-to="self">
<!--      <template #item="{ item, props }">-->

<!--      </template>-->
    </ContextMenu>
    <Dialog v-model:visible="NotesCreationDialogVisible" modal :header="computedNoteDialogHeader" :style="{ width: '25rem', background:'var(--c-bg-subtle)' }" append-to="self">

      <div class="flex items-center gap-4 mb-4 p-primary-color">
        <InputText id="NoteOrFolderName" v-model="newNoteNameValue" class="flex-auto p-text-color" autocomplete="off" />
      </div>
      <div class="flex justify-end gap-2">
        <Button type="button" label="Cancel" severity="secondary" @click="NotesCreationDialogVisible = false">Cancel</Button>
        <Button type="button" label="Save" @click="CreateNewNoteOrFolder">Save</Button>
      </div>
    </Dialog>
  </div>
</template>

<style scoped>
@import 'primeicons/primeicons.css';

#markdown-view {
  width: 100%;
}

:root {
  --p-inputtext-filled-background: gray;
}

.hoverEdit:hover {
  color: green;
}

.hoverDelete:hover {
  color: red;
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