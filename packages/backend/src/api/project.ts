import type { SDK } from "caido:plugin";
import type { Result } from "shared";
import { error, ok } from "shared";

/**
 * Get the current project ID
 */
export async function getCurrentProjectId(
  sdk: SDK,
): Promise<Result<string | undefined>> {
  try {
    const project = await sdk.projects.getCurrent();
    return ok(project?.getId());
  } catch (err) {
    sdk.console.error(`Error getting current project ID: ${err}`);
    return error(err instanceof Error ? err.message : String(err));
  }
}
