import { type Result } from "shared";

import { type FrontendSDK } from "@/types";

export async function handleBackendCall<T>(
  promise: Promise<Result<T>>,
  sdk: FrontendSDK,
) {
  const result = await promise;

  if (result.kind === "Error") {
    sdk?.window.showToast(result.error, {
      variant: "error",
    });
    throw new Error(result.error);
  }

  return result.value;
}
