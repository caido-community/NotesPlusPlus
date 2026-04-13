import type { Pinia } from "pinia";
import { createApp } from "vue";

import ReminderNotificationManager from "./ReminderNotificationManager.vue";

import { SDKPlugin } from "@/plugins/sdk";
import type { FrontendSDK } from "@/types";

/**
 * Mount the global reminder notification manager at document.body.
 * Runs independently of the Notes++ page so toasts appear on any Caido page.
 */
export function mountReminderNotifications(
  sdk: FrontendSDK,
  pinia: Pinia,
): void {
  const container = document.createElement("div");
  container.id = "notesplusplus-reminder-notifications";
  document.body.appendChild(container);

  const app = createApp(ReminderNotificationManager);
  app.use(SDKPlugin, sdk);
  app.use(pinia);
  app.mount(container);
}
