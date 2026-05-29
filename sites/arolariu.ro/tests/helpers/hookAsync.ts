/**
 * @fileoverview Async helpers for React hook tests.
 * @module tests/helpers/hookAsync
 */

import {act} from "@testing-library/react";

type HookCallbackResult<TResult> = Readonly<{resolved: false}> | Readonly<{resolved: true; value: Awaited<TResult>}>;

/**
 * Invokes a hook callback inside React Testing Library's `act` boundary.
 *
 * @param callback - The hook callback invocation to execute.
 * @returns The resolved callback result.
 *
 * @remarks
 * Use this for public hook callbacks that already return a promise. It lets the
 * test await the behavior directly instead of polling for settled state with
 * `waitFor`.
 */
export async function invokeHookCallback<TResult>(callback: () => TResult | Promise<TResult>): Promise<Awaited<TResult>> {
  let callbackResult: HookCallbackResult<TResult> = {resolved: false};

  await act(async () => {
    callbackResult = {
      resolved: true,
      value: await callback(),
    };
  });

  if (!callbackResult.resolved) {
    throw new Error("Hook callback did not resolve.");
  }

  return callbackResult.value;
}
