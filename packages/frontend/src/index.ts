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

  sdk.navigation.addPage("/authmatrix", {
    body: root,
  });

  sdk.sidebar.registerItem("Authmatrix", "/authmatrix");
};
