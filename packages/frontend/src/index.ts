import { defineApp } from "./app";
import type { CaidoSDK } from "./types";

export const init = (sdk: CaidoSDK) => {
  sdk.backend.initProject()
  const app = defineApp(sdk);

  const root = document.createElement("div");
  Object.assign(root.style, {
    height: "100%",
    width: "100%",
  });

  app.mount(root);

  sdk.commands.register("Notes++",{
    name: "Navigate to Notes++",
    run: () => {
      sdk.navigation.goTo("/NotesPlusPlus")
    },
  })

  sdk.commandPalette.register("Notes++")

  sdk.shortcuts.register("Notes++",["⌃", "⇧", "N"])


  sdk.navigation.addPage("/NotesPlusPlus", {
    body: root,
  });

  sdk.sidebar.registerItem("Notes++", "/NotesPlusPlus");
};
