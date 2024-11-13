<script setup lang="ts">


import {ref} from "vue";
import {computedAsync} from "@vueuse/core";
import {marked} from "@/utils/marked";

const exampleMarkdown = ref(
    `
  # Text Formatting

To make text **bold**, wrap it in double asterisks like this: \`**bold**\`

To make text *italic*, wrap it in single asterisks like this: \`*italic*\`

For ***bold and italic***, use three asterisks: \`***bold and italic***\`

To ~~strike through~~ text, use double tildes like this: \`~~strike through~~\`

---

# Headers

Create headers by starting a line with one or more # symbols:


# Header 1
## Header 2
### Header 3
#### Header 4
##### Header 5
###### Header 6


---

# Lists

For bullet points, start lines with asterisks:
* Like this (\`* Like this\`)
* And this (\`* And this\`)
  * Indent with two spaces for sub-bullets
  * Like these ones

For numbered lists, use numbers:
1. First item (\`1. First item\`)
2. Second item (\`2. Second item\`)
   1. Sub-items work here too
   2. Just indent with three spaces

---

# Links and Images

Create a link by putting [text in square brackets](https://example.com) followed by (the URL in parentheses):
\`[text in square brackets](https://example.com)\`

Images work the same way but start with an exclamation mark:
\`![alt text](image-url.jpg)\`

---

# Code

For \`inline code\`, wrap text in backticks: \`\` \`inline code\` \`\`

For code blocks, wrap the code in triple backticks:

\`\`\`
Like this!
Multiple lines work.
No formatting *happens* here.
\`\`\`

Syntax Highlighting is also supported:

\`\`\`java
public static void main(String[] args) {
    int i = 1;
}
\`\`\`


---

# Quotes

> Create quotes by starting lines with >
>
> Use a blank quoted line to separate paragraphs
>
> > They can even be nested
>

---

# Tables

Create tables using pipes and dashes:

| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |

The raw markdown looks like this:
\`\`\`
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |
\`\`\`

---

# Task Lists

- [x] Completed task (\`- [x] Completed task\`)
- [ ] Incomplete task (\`- [ ] Incomplete task\`)
- [ ] Another task

---

# Horizontal Lines

Create a horizontal line with three or more dashes:

---

The line above was created with: \`---\`

---

# Escaping Characters

If you need to use a markdown character as plain text, use a backslash before it:

\\*This isn't italic\\* (\`\\*This isn't italic\\*\`)

\\# This isn't a header (\`\\# This isn't a header\`)

---

# Custom Notes++ Features

### Replay Linking

You can link to replays with the following format \`@[<replay_name>] \`:

Like so: @[1]

---

### Pasting inline images

Simply copy an image to your clipboard and paste it into the markdown note. Notes++ will convert it to an image for you.

---
  `
)

const renderedMarkdown = computedAsync(async () => {
  return marked(exampleMarkdown.value)
});

</script>

<template>
  <div style="height: 100%;width: 100%;text-align: center">

    <div style="width: 80%;margin:auto;padding-bottom: 5em;">
      <h1> Welcome to Notes++ </h1>
      <br>
      This plugin provides rich note capabilities with the power of Markdown!
      Below you'll see an example of what is capable within a note.
      <br>
      <br>
      To get started, right click on the Tree to the left to create a new note or folder!
    </div>
    <div style="width:80%;height:80%;margin:auto;">
      <div style="display: flex;height: 100%;width: 100%;">
        <div class="flex-auto" style="flex: 1 1 auto; position: relative;">
      <textarea
          style="width: 100%; height: 100%; padding: 1em; resize: none"
          v-model="exampleMarkdown"
          class="bg-surface-700"
          disabled
      />
        </div>
        <div class="flex-auto overflow-auto p-4 markdown-body" style="max-width: 50%; min-width: 50%; border: 0.5rem groove">
          <div id="markdownView" v-html="renderedMarkdown"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>

</style>