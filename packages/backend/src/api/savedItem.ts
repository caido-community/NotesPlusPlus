import type { SDK } from "caido:plugin";
import type { ResolvedSavedItem, Result, SavedItem } from "shared";
import { error, ok } from "shared";

import {
  deleteSavedItemSchema,
  getSavedItemSchema,
  saveDraftRequestSchema,
  saveRequestSchema,
  saveResponseSchema,
} from "../schemas/savedItem";
import { ensureProjectDirectory } from "../utils/fileSystem";
import {
  deleteSavedItemRow,
  getSavedItemRow,
  insertSavedItem,
} from "../utils/savedItemsDb";

/**
 * Save a reference to a request by its Caido request ID.
 *
 * `sourceKind` distinguishes:
 * - "history": came from Search / HTTP History / Sitemap, which all share
 *   the same underlying Request rows and IDs.
 * - "replay": came from a Replay pane, after the request was actually sent.
 *   This is a real, separate Request row (source REPLAY) — not the same
 *   request as whatever the session may have been cloned from.
 *
 * `replaySessionId` / `sessionLabel` are only meaningful when saved from a
 * Replay pane: they capture which session this was, and that session's
 * name *at save time*, so the frontend can later check whether the live
 * session still represents the same request (same name) before deciding
 * to reopen it instead of creating a fresh one from the static snapshot.
 */
export async function saveRequest(
  sdk: SDK,
  requestId: string,
  sourceKind: "history" | "replay",
  label?: string,
  replaySessionId?: string,
  sessionLabel?: string,
): Promise<Result<SavedItem>> {
  try {
    saveRequestSchema.parse({
      requestId,
      sourceKind,
      label,
      replaySessionId,
      sessionLabel,
    });

    // The RPC bridge serializes a skipped `undefined` positional arg as
    // JSON `null` whenever a later arg is still passed (arrays can't have
    // holes) — normalize back to `undefined` here so nothing downstream
    // has to care about the difference.
    const normalizedLabel = label ?? undefined;
    const normalizedReplaySessionId = replaySessionId ?? undefined;
    const normalizedSessionLabel = sessionLabel ?? undefined;

    const projectIDResult = await ensureProjectDirectory(sdk);
    if (projectIDResult.kind === "Error") {
      return error(projectIDResult.error);
    }

    const item = await insertSavedItem(sdk, {
      kind: "request",
      refId: requestId,
      sourceKind,
      label: normalizedLabel,
      replaySessionId: normalizedReplaySessionId,
      sessionLabel: normalizedSessionLabel,
      projectId: projectIDResult.value,
    });

    return ok(item);
  } catch (err) {
    sdk.console.error(`Error saving request: ${err}`);
    return error(err instanceof Error ? err.message : String(err));
  }
}

/**
 * Save a reference to a response by its Caido response ID.
 *
 * A response pane always corresponds to a request that has already been
 * sent, so unlike an unsent Replay draft, both the request and the response
 * already have real, permanent IDs by the time this is called.
 *
 * `requestId` is the ID of the request this response belongs to. A
 * Response has no path back to its parent Request in Caido's GraphQL
 * schema, so we capture it here, at save-time, while we still have it.
 */
export async function saveResponse(
  sdk: SDK,
  responseId: string,
  requestId: string,
  sourceKind: "history" | "replay",
  label?: string,
): Promise<Result<SavedItem>> {
  try {
    saveResponseSchema.parse({ responseId, requestId, sourceKind, label });

    const normalizedLabel = label ?? undefined;

    const projectIDResult = await ensureProjectDirectory(sdk);
    if (projectIDResult.kind === "Error") {
      return error(projectIDResult.error);
    }

    const item = await insertSavedItem(sdk, {
      kind: "response",
      refId: responseId,
      parentRequestId: requestId,
      sourceKind,
      label: normalizedLabel,
      projectId: projectIDResult.value,
    });

    return ok(item);
  } catch (err) {
    sdk.console.error(`Error saving response: ${err}`);
    return error(err instanceof Error ? err.message : String(err));
  }
}

/**
 * Save an unsent Replay draft directly, by its raw HTTP text and
 * connection info — there is no Request.id yet (Caido has never created
 * a row for it), so unlike `saveRequest`, this stores the content itself
 * rather than a reference to re-fetch later.
 *
 * `replaySessionId` lets double-click prefer reopening the session this
 * draft lives in, if it's still open — there's no separate name-matching
 * needed here the way a sent request has, since the session IS the
 * draft; there's nothing else it could have diverged from.
 */
export async function saveDraftRequest(
  sdk: SDK,
  raw: string,
  host: string,
  port: number,
  isTls: boolean,
  label?: string,
  replaySessionId?: string,
): Promise<Result<SavedItem>> {
  try {
    saveDraftRequestSchema.parse({
      raw,
      host,
      port,
      isTls,
      label,
      replaySessionId,
    });

    // Same RPC-bridge normalization as saveRequest: a skipped `undefined`
    // can arrive as JSON `null` when a later positional arg is present.
    const normalizedLabel = label ?? undefined;
    const normalizedReplaySessionId = replaySessionId ?? undefined;

    const projectIDResult = await ensureProjectDirectory(sdk);
    if (projectIDResult.kind === "Error") {
      return error(projectIDResult.error);
    }

    const item = await insertSavedItem(sdk, {
      kind: "request",
      refId: "",
      sourceKind: "draft",
      draftRaw: raw,
      draftHost: host,
      draftPort: port,
      draftIsTls: isTls,
      label: normalizedLabel,
      replaySessionId: normalizedReplaySessionId,
      projectId: projectIDResult.value,
    });

    return ok(item);
  } catch (err) {
    sdk.console.error(`Error saving draft request: ${err}`);
    return error(err instanceof Error ? err.message : String(err));
  }
}

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
 * Resolve a saved item back to its live raw HTTP content.
 *
 * We never persist the raw bytes ourselves — only the ID — so this always
 * fetches fresh from Caido. If the original request/response no longer
 * exists (e.g. project history was cleared), `found: false` is returned so
 * the frontend can render a "no longer available" placeholder instead of
 * erroring out.
 *
 * The backend's graphql SDK only exposes a raw `execute(query, variables)`
 * call (unlike the frontend SDK, which has pre-generated convenience
 * methods like `request({id})`) — so we write the queries by hand here.
 */
export async function getSavedItem(
  sdk: SDK,
  id: string,
): Promise<Result<ResolvedSavedItem>> {
  try {
    getSavedItemSchema.parse({ id });

    const savedItem = await getSavedItemRow(sdk, id);
    if (!savedItem) {
      return error(`Saved item not found: ${id}`);
    }

    if (savedItem.kind === "request") {
      if (savedItem.sourceKind === "draft") {
        // Never sent, so there's no Request.id to fetch — the raw text
        // and connection info were stored directly at save time.
        if (
          savedItem.draftRaw === undefined ||
          savedItem.draftHost === undefined ||
          savedItem.draftPort === undefined ||
          savedItem.draftIsTls === undefined
        ) {
          sdk.console.error(
            `Saved draft ${savedItem.id} is missing required draft fields`,
          );
          return ok({ found: false });
        }

        return ok({
          found: true,
          kind: "request",
          sourceKind: "draft",
          raw: savedItem.draftRaw,
          draftConnection: {
            host: savedItem.draftHost,
            port: savedItem.draftPort,
            isTls: savedItem.draftIsTls,
          },
          replaySessionId: savedItem.replaySessionId,
          label: savedItem.label,
        });
      }

      const response = await sdk.graphql.execute<{
        request: { raw: string } | undefined;
      }>(REQUEST_RAW_QUERY, { id: savedItem.refId });

      if (response.errors?.length) {
        sdk.console.error(
          `GraphQL error fetching request ${savedItem.refId}: ${response.errors.map((e) => e.message).join(", ")}`,
        );
      }

      if (!response.data?.request) {
        return ok({ found: false });
      }

      return ok({
        found: true,
        kind: "request",
        sourceKind: savedItem.sourceKind,
        raw: response.data.request.raw,
        requestId: savedItem.refId,
        replaySessionId: savedItem.replaySessionId,
        sessionLabel: savedItem.sessionLabel,
        label: savedItem.label,
      });
    }

    if (!savedItem.parentRequestId) {
      // Defensive: a response saved before this field existed, or saved
      // through some path that didn't capture it. Without the parent
      // request ID we can't support replay for this item.
      sdk.console.error(
        `Saved response ${savedItem.id} is missing its parent request ID`,
      );
    }

    const response = await sdk.graphql.execute<{
      response: { raw: string } | undefined;
    }>(RESPONSE_RAW_QUERY, { id: savedItem.refId });

    if (response.errors?.length) {
      sdk.console.error(
        `GraphQL error fetching response ${savedItem.refId}: ${response.errors.map((e) => e.message).join(", ")}`,
      );
    }

    if (!response.data?.response) {
      return ok({ found: false });
    }

    return ok({
      found: true,
      kind: "response",
      sourceKind: savedItem.sourceKind,
      raw: response.data.response.raw,
      requestId: savedItem.parentRequestId ?? "",
      label: savedItem.label,
    });
  } catch (err) {
    sdk.console.error(`Error resolving saved item: ${err}`);
    return error(err instanceof Error ? err.message : String(err));
  }
}

/**
 * Delete a saved item reference (does not affect the underlying
 * request/response in Caido's own history).
 */
export async function deleteSavedItem(
  sdk: SDK,
  id: string,
): Promise<Result<boolean>> {
  try {
    deleteSavedItemSchema.parse({ id });

    const deleted = await deleteSavedItemRow(sdk, id);
    if (!deleted) {
      return error(`Saved item not found: ${id}`);
    }

    return ok(true);
  } catch (err) {
    sdk.console.error(`Error deleting saved item: ${err}`);
    return error(err instanceof Error ? err.message : String(err));
  }
}
