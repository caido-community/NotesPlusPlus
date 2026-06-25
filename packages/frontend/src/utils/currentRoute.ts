import type { Routes } from "@caido/sdk-frontend";

import type { FrontendSDK } from "@/types";

/**
 * The current route, kept in sync via `sdk.navigation.onPageChange`.
 *
 * The SDK only exposes route changes as an event — there's no synchronous
 * "what page am I on right now" getter — so this module subscribes once
 * at plugin init and exposes the current value for anything that needs to
 * make a same-page-only decision outside of a `CommandContext` (which
 * doesn't carry page info either).
 */
let currentRoute: Routes | undefined;

/**
 * Subscribe to page changes once, at plugin init. Safe to call more than
 * once — only the first call actually subscribes.
 */
let initialized = false;
export function trackCurrentRoute(sdk: FrontendSDK): void {
  if (initialized) return;
  initialized = true;

  sdk.navigation.onPageChange((event) => {
    currentRoute = event.type === "Core" ? event.routeId : undefined;
  });
}

export function getCurrentRoute(): Routes | undefined {
  return currentRoute;
}

export function isOnReplayPage(): boolean {
  return currentRoute === "Replay";
}
