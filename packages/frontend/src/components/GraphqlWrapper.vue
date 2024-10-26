<script lang="ts">
'use client'
import MarkdownNotes from "@/components/MarkdownNotes.vue";
import { ApolloProvider } from '@apollo/client'
import { client as graphqlClient } from '@/utils/graphqlClient';

export default {
  components: {MarkdownNotes, ApolloProvider },
  setup() {
    return { graphqlClient }
  }
}

</script>

<template>
  <ApolloProvider :client="graphqlClient">
    <MarkdownNotes />
  </ApolloProvider>
</template>