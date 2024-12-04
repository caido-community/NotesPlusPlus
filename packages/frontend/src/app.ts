import { createApp, provide, h } from "vue";
import "../styles/alert.css"
import "./styles/style.css";
import { SDKPlugin } from "./plugins/sdk";
import type { CaidoSDK } from "./types";
import {client} from "@/utils/graphqlClient";
import MarkdownNotesManager from "@/components/MarkdownNotesManager.vue";
import {PrimeVue} from "@primevue/core";
import { Classic } from "@caido/primevue";
import 'primeicons/primeicons.css';
import ConfirmationService from 'primevue/confirmationservice';
import DialogService from 'primevue/dialogservice';
import Tooltip from 'primevue/tooltip';
import {configureMarked} from "@/utils/marked";

export const defineApp = (sdk: CaidoSDK) => {
  const app = createApp({
    setup() {
      provide(client)
    },
    render: () => h(MarkdownNotesManager),
  });

  sdk.backend.createRootNoteFolder();
  configureMarked(sdk);
  app.use(ConfirmationService);
  app.directive('tooltip', Tooltip);
  app.use(DialogService);
  app.use(SDKPlugin, sdk);
  app.use(PrimeVue, {
    unstyled: true,
    pt: Classic,
  });
  return app;
};
