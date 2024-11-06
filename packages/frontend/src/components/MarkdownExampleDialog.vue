<script setup lang="ts">
import {ref, inject, onMounted, computed} from "vue";
import {marked} from "marked";

const dialogRef = inject("dialogRef");

onMounted(() => {
  console.log("DIALOG BUILT")

});

const exampleMarkdown = ref("_MARKDOWN TEST_")
const renderedMarkdown = computed(() => {
    return marked(exampleMarkdown.value)
});

</script>

<template>
  <div style="width:100%;height:100%;">
    <div style="display: flex;height: 100%;width: 100%;">
      <div class="flex-auto" style="flex: 1 1 auto; position: relative;">
      <textarea
          style="width: 100%; height: 100%; padding: 1em; resize: none"
          v-model="exampleMarkdown"
          class="bg-surface-700"
      />
      </div>
      <div class="flex-auto overflow-auto p-4 markdown-body" style="max-width: 50%; min-width: 50%; border: 0.5rem groove">
        <div class="bg-surface-700" v-html="renderedMarkdown"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>

</style>