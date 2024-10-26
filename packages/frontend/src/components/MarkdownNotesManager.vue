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

const nodes = ref([
  // {
  //   key:"key1",
  //   label: "folder1",
  //   data: "folder1",
  //   icon: PrimeIcons.FOLDER,
  //   children: [
  //     {
  //       key:"key1.1",
  //       data: "doc1",
  //       label: "doc1",
  //       icon: PrimeIcons.FILE,
  //       selectable: true,
  //     }
  //   ]
  // },
  // {
  //   key:"key2",
  //   label: "folder2",
  //   icon: PrimeIcons.FOLDER,
  //   data: "folder2",
  //   children: [
  //     {
  //       key:"key2.1",
  //       data: "doc2",
  //       label: "doc2",
  //       icon: PrimeIcons.FILE,
  //       selectable: true,
  //     }
  //   ]
  // }
])

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


const startEdit = (nodeToEdit) => {
  let foundNodeToEdit = searchNodesForKey(nodeToEdit.key)
  if( foundNodeToEdit != null ) {
    foundNodeToEdit.type = "editing";
  }
  console.log(foundNodeToEdit);
};

const finishEdit = (nodeInEditMode) => {
  let foundNodeToEdit = searchNodesForKey(nodeInEditMode.key)
  if( foundNodeToEdit != null ) {
    foundNodeToEdit.data = nodeInEditMode.data;
    delete foundNodeToEdit.type;
  }
};

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


const items = ref([
  {
    label: "New Folder",
    command: () => {
      console.log(selectedNode)
      creatingNewNoteOrFolder.value = 0;
      NotesCreationDialogVisible.value = true
    }

  },
  {
    label: "New Note",
    command: () => {
      console.log(selectedNode)
      creatingNewNoteOrFolder.value = 1;
      NotesCreationDialogVisible.value = true

    }
  }
])

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
              //icon: PrimeIcons.FILE,
              selectable: true,
            }
    )
  } else {
    nodes.value.push(
        {
          key:uuid(),
          label: newNoteNameValue.value,
          data: newNoteNameValue.value,
          //icon: PrimeIcons.FOLDER,
          children: [
            {
              key:uuid(),
              data: "Test",
              label: "Test",
              //icon: PrimeIcons.FILE,
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
    <div id="wrapper">
    <ContextMenu ref="menu" :model="items" />
    <div class="tree-container" :class="{ treeShown: showTree, treeHide: !showTree}">
      <div  class="tree-collapse-button"  :class="{ collapsed: !showTree}" @click="collapse">
<!--        <CIcon :icon="iconType" :style="{'&#45;&#45;ci-primary-color': 'white'}"/>-->
        <i v-if="showTree.value" class="pi pi-angle-double-left"></i>
        <i v-else class="pi pi-angle-double-right"></i>
      </div>
      <div  class="tree-content" id="tree-content" v-show="showTree">
        <Tree :pt="{pcFilterContainer:{root: 'border-gray-500 border-1'} }" id="NoteTree" @contextmenu="handleRightClick($event, null)" @nodeSelect="nodeSelected" :value="nodes" class="w-full mw-100" :style="{'height':'100%', 'background':'var(--c-bg-subtle)'}" selectionMode="single"  :filter="true" filterMode="strict" >
          <template #default="slotProps">
            <div  @contextmenu="handleRightClick($event, slotProps.node)">
            <i v-if="slotProps.node.children" class="pi pi-folder mr-2"></i>
            <i v-else class="pi pi-file mr-2"></i>
            <span> {{ slotProps.node.data }} </span>
            </div>
          </template>
          <template #editing="slotProps">
            <InputText :style="{'background-color': 'rgb(37, 39, 45)'}" v-model="slotProps.node.data" type="text" @keyup.enter="finishEdit(slotProps.node)" @blur="finishEdit(slotProps.node)"/>
          </template>
        </Tree>
      </div>
    </div>
    <div id="markdown-view">
      <MarkdownNotes/>
    </div>
    <Dialog v-model:visible="NotesCreationDialogVisible" modal :header="computedNoteDialogHeader" :style="{ width: '25rem', background:'var(--c-bg-subtle)' }">

      <div class="flex items-center gap-4 mb-4 p-primary-color">
        <InputText id="NoteOrFolderName" v-model="newNoteNameValue" class="flex-auto p-text-color" autocomplete="off" />
      </div>
      <div class="flex justify-end gap-2">
        <Button type="button" label="Cancel" severity="secondary" @click="NotesCreationDialogVisible = false">Cancel</Button>
        <Button type="button" label="Save" @click="CreateNewNoteOrFolder">Save</Button>
      </div>
    </Dialog>
    </div>
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


#wrapper {
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