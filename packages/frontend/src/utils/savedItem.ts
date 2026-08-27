import type { SavedItem } from "shared";

import { type FrontendSDK } from "@/types";
import { decodeEntryRaw } from "@/utils/httpEncoding";
import { createDraftSavedItem, createSavedItem } from "@/utils/noteUtils";

/**
 * Snapshots a Replay session's active entry. Sent requests are stored by
 * ID, unsent drafts by their raw content. Returns undefined when there is
 * nothing to save.
 */
export async function captureReplaySession(
  sdk: FrontendSDK,
  sessionId: string,
  label?: string,
): Promise<SavedItem | undefined> {
  const sessionResponse = await sdk.graphql.replaySessionEntries({
    id: sessionId,
  });

  const activeEntry = sessionResponse?.replaySession?.activeEntry;
  if (!activeEntry?.id) return undefined;

  const session = sdk.replay.getSessions().find((s) => s.id === sessionId);
  const entry = sdk.replay.getEntry(activeEntry.id);

  if (entry.requestId) {
    return createSavedItem({
      kind: "request",
      refId: entry.requestId,
      sourceKind: "replay",
      session,
      label,
    });
  }

  const connection = activeEntry.connection;
  const raw = decodeEntryRaw(activeEntry);
  if (typeof connection?.host !== "string" || raw === "") return undefined;

  return createDraftSavedItem({
    request: {
      raw,
      host: connection.host,
      port: connection.port,
      isTls: connection.isTLS,
      path: label,
    },
    session,
  });
}

/** Snapshots the request or response of the Replay session on screen. */
export async function captureCurrentReplay(
  sdk: FrontendSDK,
  kind: SavedItem["kind"] = "request",
): Promise<SavedItem | undefined> {
  const session = sdk.replay.getCurrentSession();
  if (!session) return undefined;

  if (kind === "request") {
    return captureReplaySession(sdk, session.id);
  }

  const sessionResponse = await sdk.graphql.replaySessionEntries({
    id: session.id,
  });
  const activeEntry = sessionResponse?.replaySession?.activeEntry;
  if (!activeEntry?.id) return undefined;

  const responseId = activeEntry.request?.response?.id;
  const requestId =
    activeEntry.request?.id ?? sdk.replay.getEntry(activeEntry.id).requestId;
  if (!responseId || !requestId) return undefined;

  return createSavedItem({
    kind: "response",
    refId: responseId,
    parentRequestId: requestId,
    sourceKind: "replay",
    session,
    label: activeEntry.request?.path,
  });
}
