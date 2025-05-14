import { Classic } from "@caido/primevue";
import { createPinia } from "pinia";
import PrimeVue from "primevue/config";
import { createApp } from "vue";
import { SDKPlugin } from "./plugins/sdk";
import "./styles/index.css";
import type { FrontendSDK } from "./types";
import App from "./views/App.vue";

import {
  sendReplaySessionToNote,
  sendSelectedTextToNote,
  showNoteModal,
} from "@/actions/actions";
import { emitter } from "@/utils/eventBus";
import { convertMarkdownToTipTap } from "@/utils/markdownToJSON";
import { NoteContent } from "shared";

export const init = (sdk: FrontendSDK) => {
  const pinia = createPinia();
  const app = createApp(App);

  app.use(PrimeVue, {
    unstyled: true,
    pt: Classic,
  });

  app.use(SDKPlugin, sdk);
  app.use(pinia);

  const root = document.createElement("div");
  Object.assign(root.style, {
    height: "100%",
    width: "100%",
  });

  root.id = `plugin--notesplusplus`;

  app.mount(root);

  sdk.commands.register("notesplusplus:floating-modal", {
    name: "Write Note",
    group: "Notes++",
    run: () => showNoteModal(sdk),
  });

  sdk.commands.register("notesplusplus:send-selected-text", {
    name: "Send Selected Text",
    group: "Notes++",
    run: () => sendSelectedTextToNote(sdk),
  });

  sdk.commands.register("notesplusplus:send-replay-session", {
    name: "Send Replay Session",
    group: "Notes++",
    run: () => sendReplaySessionToNote(sdk),
  });

  sdk.commandPalette.register("notesplusplus:floating-modal");
  sdk.commandPalette.register("notesplusplus:send-selected-text");
  sdk.commandPalette.register("notesplusplus:send-replay-session");

  sdk.menu.registerItem({
    type: "Request",
    commandId: "notesplusplus:send-replay-session",
    leadingIcon: "fas fa-file-alt",
  });

  sdk.menu.registerItem({
    type: "Request",
    commandId: "notesplusplus:send-selected-text",
    leadingIcon: "fas fa-file-alt",
  });

  sdk.shortcuts.register("notesplusplus:floating-modal", ["cmd", "shift", "N"]);
  sdk.shortcuts.register("notesplusplus:send-selected-text", [
    "ctrl",
    "shift",
    "R",
  ]);

  sdk.navigation.addPage("/notes", {
    body: root,
    onEnter: () => {
      emitter.emit("refreshEditors");
      checkLegacyNotes(sdk);
    },
  });

  sdk.sidebar.registerItem("Notes++", "/notes", {
    icon: "fas fa-file-alt",
  });

  emitter.on("confirmMigration", (notes) => {
    migrateNotes(sdk, notes);
  });
};

async function checkLegacyNotes(sdk: FrontendSDK) {
  try {
    const result = await sdk.backend.getLegacyNotes();
    if (result.kind === "Success" && result.value.length > 0) {
      emitter.emit("showMigrationDialog", result.value);
    }
  } catch (error) {
    console.error("Error checking for legacy notes:", error);
  }
}

async function migrateNotes(
  sdk: FrontendSDK,
  notes: { path: string; content: string }[],
) {
  try {
    let affected = 0;
    for (const note of notes) {
      const json = convertMarkdownToTipTap(note.content) as NoteContent;
      await sdk.backend.migrateNote(note.path, json);
      affected++;
    }
    if (affected > 0) {
      emitter.emit("refreshTree", affected);
    }
  } catch (error) {
    console.error("Error migrating legacy notes:", error);
  }
}
