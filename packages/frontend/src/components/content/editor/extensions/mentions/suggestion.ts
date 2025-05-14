import { type Editor } from "@tiptap/core";
import { VueRenderer } from "@tiptap/vue-3";
import tippy, { type Instance, type Props } from "tippy.js";

//@ts-expect-error - Vue component import throws error here
import ReferenceList from "./List.vue";

import { type FrontendSDK } from "@/types";

interface SessionItem {
  id: string;
  label: string;
}

interface SuggestionProps {
  editor: Editor;
  clientRect?: (() => DOMRect | null) | null;
  event?: KeyboardEvent;
  range?: { from: number; to: number };
  command: (attrs: SessionItem) => void;
  items: SessionItem[];
  query: string;
}

export default function createSuggestion(sdk: FrontendSDK) {
  return {
    items: ({ query }: { query: string }) => {
      const sessions: SessionItem[] = sdk.replay
        .getSessions()
        .map((session) => {
          return {
            id: session.id,
            label: session.name,
          };
        });

      return sessions
        .sort((a, b) => parseInt(b.id) - parseInt(a.id))
        .filter((item) =>
          item.label.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 7);
    },

    render: () => {
      let component: VueRenderer;
      let popup: Instance<Props> | undefined = undefined;

      return {
        onStart: (props: SuggestionProps) => {
          component = new VueRenderer(ReferenceList, {
            props,
            editor: props.editor,
          });

          if (!props.clientRect) {
            return;
          }

          const getReference = () => {
            const rect = props.clientRect?.();
            return rect || new DOMRect(0, 0, 0, 0);
          };

          // @ts-expect-error - Couldn't get tippy types working
          popup = tippy(document.body, {
            getReferenceClientRect: getReference,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: "manual",
            placement: "bottom-start",
          });
        },

        onUpdate(props: SuggestionProps) {
          component.updateProps(props);

          if (!props.clientRect || !popup) {
            return;
          }

          const getReference = () => {
            const rect = props.clientRect?.();
            return rect || new DOMRect(0, 0, 0, 0);
          };

          popup.setProps({
            getReferenceClientRect: getReference,
          });
        },

        onKeyDown(props: { event: KeyboardEvent }) {
          if (props.event.key === "Escape" && popup) {
            popup.hide();
            return true;
          }

          return component.ref?.onKeyDown(props);
        },

        onExit() {
          if (popup) {
            popup.destroy();
          }
          component.destroy();
        },
      };
    },
  };
}
