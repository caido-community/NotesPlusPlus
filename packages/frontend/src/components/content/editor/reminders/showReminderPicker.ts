import { createApp, h } from "vue";

import ReminderPicker from "./ReminderPicker.vue";

export function showReminderPicker(
  position: { x: number; y: number },
  onConfirm: (date: Date) => void,
): void {
  const container = document.createElement("div");
  container.id = "reminder-picker-container";
  document.body.appendChild(container);

  const cleanup = () => {
    app.unmount();
    container.remove();
  };

  const app = createApp({
    render: () =>
      h(ReminderPicker, {
        position,
        onConfirm: (date: Date) => {
          onConfirm(date);
          cleanup();
        },
        onCancel: () => {
          cleanup();
        },
      }),
  });

  app.mount(container);
}
