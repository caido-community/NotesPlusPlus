import { Mention } from "@tiptap/extension-mention";

import { type FrontendSDK } from "@/types";

interface SessionItem {
  id: string;
  label: string;
}

/**
 * The `@`-trigger for inserting a saved Replay request into a note.
 *
 * This reuses the existing session list/dropdown (`suggestion.ts` /
 * `List.vue`) — picking a session from that list was never the buggy
 * part. What changes here is what happens *after* picking one: instead of
 * inserting a node that re-resolves the session live every time the note
 * is opened (the old, buggy behavior), this saves a static snapshot of
 * the session's active entry's request — the same mechanism as
 * right-click "Save Request to Note" — and inserts a `savedItemMention`
 * block for it.
 *
 * `savedItemMention` is `group: "block"` (it renders a ~300px embedded
 * HTTP editor), so it can't be inserted inline at the `@` trigger
 * position the way TipTap's default `Mention` command does for genuine
 * inline mentions (which mixes the inserted node with a trailing text
 * node in the same call). Instead, the `@query` text is deleted and the
 * block is inserted right after the block the cursor was in.
 */
export const createSessionTriggerMention = (sdk: FrontendSDK) => {
  return Mention.extend({
    name: "sessionTrigger",

    // This node is never actually rendered — `command` below always
    // deletes the trigger text before any default insertion would run,
    // replacing it with a `savedItemMention` block instead. The schema
    // still needs *some* attrs/renderHTML to satisfy Mention's base
    // requirements, but in practice these never reach the DOM.
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
                let result = null;
                if (!entry.requestId) {
                  if (
                    typeof sessionResponse?.replaySession?.activeEntry
                      ?.connection?.host == "string"
                  ) {
                    result = await sdk.backend.saveDraftRequest(
                      atob(sessionResponse.replaySession.activeEntry.raw),
                      sessionResponse.replaySession.activeEntry.connection
                        .host,
                      sessionResponse.replaySession.activeEntry.connection
                        .port,
                      sessionResponse?.replaySession.activeEntry.connection
                        .isTLS,
                      item.label,
                      item.id,
                    );
                  } else {
                    sdk.window.showToast(
                      "This session has no request to save yet",
                      { variant: "warning" },
                    );
                    return;
                  }
                } else {
                  result = await sdk.backend.saveRequest(
                    entry.requestId,
                    "replay",
                    undefined,
                    item.id,
                    item.label,
                  );
                }

                if (result.kind === "Error") {
                  sdk.window.showToast(
                    `Error saving request: ${result.error}`,
                    { variant: "error" },
                  );
                  return;
                }

                // Insert right after the block the cursor is currently
                // in (using its *actual* resolved depth, not a hardcoded
                // one, so this still works inside nested structures like
                // list items) — savedItemMention is block-level and
                // can't be mixed into inline content the way the default
                // Mention command inserts things.
                const { $from } = editor.state.selection;
                const insertPos = $from.end($from.depth) + 1;

                editor
                  .chain()
                  .focus()
                  .insertContentAt(insertPos, {
                    type: "savedItemMention",
                    attrs: { id: result.value.id, label: item.label },
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
