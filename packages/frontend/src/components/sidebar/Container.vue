<script setup lang="ts">
import Card from "primevue/card";

import { ActionsContainer } from "./actions";
import { TreeContainer } from "./tree";
</script>

<template>
  <Card
    class="h-full"
    :pt="{
      body: { class: 'h-full' },
      content: { class: 'm-0 h-full flex flex-col gap-2' },
    }"
  >
    <template #content>
      <ActionsContainer />
      <TreeContainer />
    </template>
  </Card>
</template>
