/**
 * @fileoverview Async helpers for React hook tests.
 * @module tests/helpers/hookAsync
 */

import {act, type RenderHookResult} from "@testing-library/react";

type HookCallbackResult<TResult> = Readonly<{status: "pending"}> | Readonly<{status: "resolved"; value: TResult}>;

function readHookCallbackResult<TResult>(callbackResult: HookCallbackResult<TResult>): TResult {
  if (callbackResult.status !== "resolved") {
    throw new Error("Hook callback did not run inside act.");
  }

  return callbackResult.value;
}

/**
 * Invokes a hook callback inside React Testing Library's `act` boundary.
 *
 * @param hook - The rendered hook result from renderHook.
 * @param callback - The hook callback invocation to execute.
 * @returns The resolved callback result.
 *
 * @remarks
 * Use this for public hook callbacks that already return a promise. It lets the
 * test await the behavior directly instead of polling for settled state with
 * `waitFor`.
 *
 * Callback errors are propagated naturally through the `act` boundary.
 */
export async function invokeHookCallback<THookResult, TResult>(
  hook: RenderHookResult<THookResult, unknown>,
  callback: (current: THookResult) => Promise<TResult> | TResult,
): Promise<TResult> {
  let callbackResult: HookCallbackResult<TResult> = {status: "pending"};

  await act(async () => {
    callbackResult = {
      status: "resolved",
      value: await callback(hook.result.current),
    };
  });

  return readHookCallbackResult<TResult>(callbackResult);
}
