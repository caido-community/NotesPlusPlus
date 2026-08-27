import type { SDK } from "caido:plugin";
import type { ResolvedSavedItem, Result, SavedItem } from "shared";
import { error, ok } from "shared";

import { getSavedItemSchema } from "../schemas/savedItem";

const REQUEST_RAW_QUERY = `
  query GetRequestRaw($id: ID!) {
    request(id: $id) {
      raw
    }
  }
`;

const RESPONSE_RAW_QUERY = `
  query GetResponseRaw($id: ID!) {
    response(id: $id) {
      raw
    }
  }
`;

/**
 * Resolves a saved item (read from the note's own JSON content) back to
 * its live raw HTTP content. For "history"/"replay" items, only the ID
 * is stored, so this always fetches fresh from Caido; `found: false` is
 * returned if the original request/response no longer exists.
 */
export async function getSavedItem(
  sdk: SDK,
  item: SavedItem,
): Promise<Result<ResolvedSavedItem>> {
  try {
    getSavedItemSchema.parse({ item });

    if (item.kind === "request") {
      if (item.sourceKind === "draft") {
        // Never sent, so there's no Request.id to fetch — the raw text
        // and connection info were stored directly in the note.
        if (
          item.draftRaw === undefined ||
          item.draftHost === undefined ||
          item.draftPort === undefined ||
          item.draftIsTls === undefined
        ) {
          sdk.console.error("Saved draft is missing required draft fields");
          return ok({ found: false });
        }

        return ok({
          found: true,
          kind: "request",
          sourceKind: "draft",
          raw: item.draftRaw,
          draftConnection: {
            host: item.draftHost,
            port: item.draftPort,
            isTls: item.draftIsTls,
          },
          replaySessionId: item.replaySessionId,
          sessionLabel: item.sessionLabel,
          label: item.label,
        });
      }

      const response = await sdk.graphql.execute<{
        request: { raw: string } | undefined;
      }>(REQUEST_RAW_QUERY, { id: item.refId });

      if (response.errors?.length) {
        sdk.console.error(
          `GraphQL error fetching request ${item.refId}: ${response.errors.map((e) => e.message).join(", ")}`,
        );
      }

      if (!response.data?.request) {
        return ok({ found: false });
      }

      return ok({
        found: true,
        kind: "request",
        sourceKind: item.sourceKind,
        raw: response.data.request.raw,
        requestId: item.refId,
        replaySessionId: item.replaySessionId,
        sessionLabel: item.sessionLabel,
        label: item.label,
      });
    }

    if (!item.parentRequestId) {
      // Defensive: a response saved before this field existed, or saved
      // through some path that didn't capture it. Without the parent
      // request ID we can't support replay for this item.
      sdk.console.error("Saved response is missing its parent request ID");
    }

    const response = await sdk.graphql.execute<{
      response: { raw: string } | undefined;
    }>(RESPONSE_RAW_QUERY, { id: item.refId });

    if (response.errors?.length) {
      sdk.console.error(
        `GraphQL error fetching response ${item.refId}: ${response.errors.map((e) => e.message).join(", ")}`,
      );
    }

    if (!response.data?.response) {
      return ok({ found: false });
    }

    return ok({
      found: true,
      kind: "response",
      sourceKind: item.sourceKind,
      raw: response.data.response.raw,
      ...(item.parentRequestId ? { requestId: item.parentRequestId } : {}),
      label: item.label,
    });
  } catch (err) {
    sdk.console.error(`Error resolving saved item: ${err}`);
    return error(err instanceof Error ? err.message : String(err));
  }
}
