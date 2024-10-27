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

export const defineApp = (sdk: CaidoSDK) => {
  const app = createApp({
    setup() {
      provide(client)
    },
    render: () => h(MarkdownNotesManager),
  });
  app.use(ConfirmationService);
  app.use(DialogService);
  app.use(SDKPlugin, sdk);
  app.use(PrimeVue, {
    unstyled: true,
    pt: Classic,
  });
  return app;
};
