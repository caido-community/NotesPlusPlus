<script setup lang="ts">
import {ref, inject, onMounted} from "vue";
import InputText from "primevue/inputtext";

const dialogRef = inject("dialogRef");

onMounted(() => {
  console.log("DIALOG BUILT")

});

const newNoteNameValue = ref(dialogRef.value.data.currentName)


const CreateNewNoteOrFolder = (data) => {
  dialogRef.value.close(data);
};

</script>

<template>
  <div>
    <div class="flex items-center gap-4 mb-4 p-primary-color">
      <InputText id="NoteOrFolderName" v-model="newNoteNameValue" class="flex-auto p-text-color" autocomplete="off" />
    </div>
    <div class="flex justify-end gap-2">
      <Button type="button" label="Cancel" severity="secondary" @click="CreateNewNoteOrFolder(null)">Cancel</Button>
      <Button type="button" label="Save" @click="CreateNewNoteOrFolder(newNoteNameValue)">Save</Button>
    </div>
  </div>
</template>

<style scoped>

</style>