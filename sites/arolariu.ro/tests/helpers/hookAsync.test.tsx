import {renderHook} from "@testing-library/react";
import {useState} from "react";
import {describe, expect, it} from "vitest";

import {invokeHookCallback} from "./hookAsync";

function useAsyncCallback(): () => Promise<string> {
  return async () => "completed";
}

function useSyncCallback(): () => string {
  return () => "sync result";
}

function useStatefulCallback(): {count: number; increment: () => void} {
  const [count, setCount] = useState(0);
  return {
    count,
    increment: () => setCount((c) => c + 1),
  };
}

function useErrorCallback(): () => Promise<never> {
  return async () => {
    throw new Error("Test error");
  };
}

function useVoidCallback(): () => void {
  return () => {
    // No return value
  };
}

function useUndefinedCallback(): () => undefined {
  return () => undefined;
}

describe("hook async helpers", () => {
  it("returns values produced by async hook callbacks", async () => {
    const hook = renderHook(() => useAsyncCallback());

    const result = await invokeHookCallback(hook, (current) => current());

    expect(result).toBe("completed");
  });

  it("returns values produced by sync hook callbacks", async () => {
    const hook = renderHook(() => useSyncCallback());

    const result = await invokeHookCallback(hook, (current) => current());

    expect(result).toBe("sync result");
  });

  it("flushes hook state mutations inside act boundary", async () => {
    const hook = renderHook(() => useStatefulCallback());

    expect(hook.result.current.count).toBe(0);

    await invokeHookCallback(hook, (current) => current.increment());

    expect(hook.result.current.count).toBe(1);
  });

  it("propagates errors from callbacks", async () => {
    const hook = renderHook(() => useErrorCallback());

    await expect(invokeHookCallback(hook, (current) => current())).rejects.toThrow("Test error");
  });

  it("returns void callback results without throwing", async () => {
    const hook = renderHook(() => useVoidCallback());

    const result = await invokeHookCallback(hook, (current) => current());

    expect(result).toBeUndefined();
  });

  it("returns undefined callback results without throwing", async () => {
    const hook = renderHook(() => useUndefinedCallback());

    const result = await invokeHookCallback(hook, (current) => current());

    expect(result).toBeUndefined();
  });
});
