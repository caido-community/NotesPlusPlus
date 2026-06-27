import { Mention } from "@tiptap/extension-mention";
import type { SavedItem } from "shared";

import { type FrontendSDK } from "@/types";

interface SessionItem {
  id: string;
  label: string;
}

/**
 * The `@`-trigger for inserting a saved Replay request into a note.
 *
 * Reuses the existing session list/dropdown (`suggestion.ts` /
 * `List.vue`); picking a session saves a static snapshot of its active
 * entry and inserts a `savedItemMention` block, rather than a node that
 * re-resolves the session live every time the note opens.
 *
 * `savedItemMention` is `group: "block"`, so it can't be inserted inline
 * the way TipTap's default `Mention` command does — the `@query` text is
 * deleted and the block is inserted right after the current block.
 */
export const createSessionTriggerMention = (sdk: FrontendSDK) => {
  return Mention.extend({
    name: "sessionTrigger",

    // Never actually rendered — `command` below always deletes the
    // trigger text and inserts a `savedItemMention` instead.
    addAttributes() {
      return {
        id: { default: "" },
        label: { default: "" },
      };
    },

    addOptions() {
      const parent = this.parent?.();
      return {
        ...parent,
        suggestion: {
          ...parent?.suggestion,
          command: ({ editor, range, props }) => {
            const item = props as SessionItem;

            // Remove the "@query" text immediately so the editor doesn't
            // sit with a half-typed trigger while the save (async) runs.
            editor.chain().focus().deleteRange(range).run();

            void (async () => {
              try {
                const sessionResponse = await sdk.graphql.replaySessionEntries({
                  id: item.id,
                });
                const activeEntryId =
                  sessionResponse?.replaySession?.activeEntry?.id;

                if (!activeEntryId) {
                  sdk.window.showToast("Replay session is not available", {
                    variant: "warning",
                  });
                  return;
                }
                const entry = sdk.replay.getEntry(activeEntryId);
                let savedItem: SavedItem;
                if (!entry.requestId) {
                  if (
                    typeof sessionResponse?.replaySession?.activeEntry
                      ?.connection?.host == "string"
                  ) {
                    savedItem = {
                      kind: "request",
                      refId: "",
                      sourceKind: "draft",
                      draftRaw: atob(
                        sessionResponse.replaySession.activeEntry.raw,
                      ),
                      draftHost:
                        sessionResponse.replaySession.activeEntry.connection
                          .host,
                      draftPort:
                        sessionResponse.replaySession.activeEntry.connection
                          .port,
                      draftIsTls:
                        sessionResponse.replaySession.activeEntry.connection
                          .isTLS,
                      label: item.label,
                      replaySessionId: item.id,
                    };
                  } else {
                    sdk.window.showToast(
                      "This session has no request to save yet",
                      { variant: "warning" },
                    );
                    return;
                  }
                } else {
                  savedItem = {
                    kind: "request",
                    refId: entry.requestId,
                    sourceKind: "replay",
                    replaySessionId: item.id,
                    sessionLabel: item.label,
                    label: item.label,
                  };
                }

                // Insert right after the current block — savedItemMention
                // is block-level and can't be mixed into inline content.
                const { $from } = editor.state.selection;
                const insertPos = $from.end($from.depth) + 1;

                editor
                  .chain()
                  .focus()
                  .insertContentAt(insertPos, {
                    type: "savedItemMention",
                    attrs: { ...savedItem },
                  })
                  .run();
              } catch (err) {
                console.error("Error saving replay request from @:", err);
                sdk.window.showToast("Couldn't save this request", {
                  variant: "error",
                });
              }
            })();
          },
        },
      };
    },
  });
};
