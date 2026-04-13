import { mergeAttributes, Node } from "@tiptap/core";

import { emitter } from "@/utils/eventBus";
import {
  getReminderDisplayState,
  type ReminderDisplayState,
} from "@/utils/reminderStates";

const STATE_CHECK_INTERVAL_MS = 15_000;

const styleId = "reminder-node-style";
if (!document.getElementById(styleId)) {
  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    .reminder-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 1px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      line-height: 1.6;
      vertical-align: baseline;
      cursor: default;
      user-select: none;
      white-space: nowrap;
      transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
    }
    .reminder-chip:hover {
      filter: brightness(1.15);
    }
    .reminder-chip__icon {
      font-size: 10px;
      flex-shrink: 0;
    }
    .reminder-chip__close {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      cursor: pointer;
      padding: 0 2px;
      margin-left: 2px;
      font-size: 9px;
      opacity: 0;
      color: inherit;
      transition: opacity 0.15s ease;
    }
    .reminder-chip__close:hover,
    .reminder-chip__close:focus-visible {
      opacity: 1;
    }
    .reminder-chip--cancellable:hover .reminder-chip__close,
    .reminder-chip--cancellable:focus-within .reminder-chip__close {
      opacity: 0.6;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Tailwind classes per state. These elements live inside the editor
 * (descendant of #plugin--notesplusplus) so prefix-wrapped utilities apply.
 */
const stateStyles: Record<ReminderDisplayState, string> = {
  upcoming: "bg-primary-500/15 text-primary-400 border border-primary-500/30",
  due: "bg-orange-500/15 text-orange-400 border border-orange-500/30",
  missed: "bg-orange-500/15 text-orange-400 border border-orange-500/30",
  dismissed:
    "bg-green-500/10 text-green-500 border border-green-500/20 line-through",
};

const stateIcons: Record<ReminderDisplayState, string> = {
  upcoming: "fas fa-clock",
  due: "fas fa-bell",
  missed: "fas fa-exclamation-circle",
  dismissed: "fas fa-check-circle",
};

function formatReminderDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const timeStr = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  if (isToday) return `Today ${timeStr}`;
  if (isTomorrow) return `Tomorrow ${timeStr}`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export const ReminderNode = Node.create({
  name: "reminderNode",
  group: "inline",
  inline: true,
  atom: true,

  addStorage() {
    return {
      isContentReplacement: false,
    };
  },

  addAttributes() {
    return {
      id: { default: "" },
      reminderAt: { default: "" },
      context: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-reminder-node]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes({ "data-reminder-node": "" }, HTMLAttributes),
    ];
  },

  addNodeView() {
    return (nodeViewProps) => {
      const { id: reminderId, reminderAt, context } = nodeViewProps.node.attrs;

      const container = document.createElement("span");
      container.contentEditable = "false";
      container.title = context ? `Reminder: ${context as string}` : "Reminder";

      const icon = document.createElement("i");
      container.appendChild(icon);

      const label = document.createElement("span");
      label.textContent = formatReminderDate(reminderAt as string);
      container.appendChild(label);

      let cancelledViaButton = false;

      const closeBtn = document.createElement("button");
      closeBtn.className = "reminder-chip__close";
      closeBtn.title = "Cancel reminder";
      closeBtn.setAttribute("aria-label", "Cancel reminder");
      closeBtn.innerHTML = '<i class="fas fa-times"></i>';
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        cancelledViaButton = true;
        emitter.emit("cancelReminder", { id: reminderId as string });
        const pos = nodeViewProps.getPos();
        if (typeof pos === "number") {
          nodeViewProps.editor.commands.deleteRange({
            from: pos,
            to: pos + nodeViewProps.node.nodeSize,
          });
        }
      });
      container.appendChild(closeBtn);

      let currentState: ReminderDisplayState | "" = "";

      function applyState() {
        const state = getReminderDisplayState(
          reminderId as string,
          reminderAt as string,
        );
        if (state === currentState) return;
        currentState = state;
        const cancellable =
          state === "upcoming" ? " reminder-chip--cancellable" : "";
        container.className = `reminder-chip${cancellable} ${stateStyles[state]}`;
        icon.className = `reminder-chip__icon ${stateIcons[state]}`;
      }

      applyState();
      const intervalId = setInterval(applyState, STATE_CHECK_INTERVAL_MS);

      const handleStateChange = (data: {
        id: string;
        state: "dismissed" | "missed";
      }) => {
        if (data.id === reminderId) applyState();
      };
      emitter.on("reminderStateChanged", handleStateChange);

      return {
        dom: container,
        destroy: () => {
          clearInterval(intervalId);
          emitter.off("reminderStateChanged", handleStateChange);

          const { editor } = nodeViewProps;
          const storage = editor.storage.reminderNode;
          const isUserDeletion =
            !cancelledViaButton &&
            !editor.isDestroyed &&
            !storage?.isContentReplacement;

          if (isUserDeletion) {
            emitter.emit("cancelReminder", { id: reminderId as string });
          }
        },
      };
    };
  },
});
