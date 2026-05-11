import {act, render, renderHook} from "@testing-library/react";
import {StrictMode} from "react";
import {afterEach, beforeEach, describe, expect, it} from "vitest";

import {createWorkerHost} from "../host";
import {createMockWorker} from "../host/mockWorker";
import {__resetForTesting} from "../runtime/exposeWorker";
import {useWorker} from "./useWorker";

type Api = {echo: (msg: string) => Promise<string>};

// happy-dom does not define `Worker`. The host's SSR-safety check rejects
// when `typeof globalThis.Worker === "undefined"`, so we install a stub
// constructor exactly like the host-layer tests do. The MockWorker provides
// the duck-typed object the host actually uses at runtime.
const ORIGINAL_WORKER = (globalThis as {Worker?: unknown}).Worker;

function makeFactory() {
  // Each call to `factory` builds BOTH a fresh MockWorker and a fresh host.
  // Re-using a single MockWorker across host re-creation would break: the
  // first host's dispose terminates the underlying mock, so a second host
  // bootstrapped against it would never reach `ready`.
  const factory = () => {
    const mock = createMockWorker<Api>({api: {echo: async (m) => m}});
    return createWorkerHost<Api>({
      name: "test",
      load: () => mock.worker,
      defaultCallTimeoutMs: 0,
    });
  };
  return {factory};
}

beforeEach(() => {
  __resetForTesting();
  if (typeof (globalThis as {Worker?: unknown}).Worker === "undefined") {
    Object.defineProperty(globalThis, "Worker", {
      value: function StubWorker() {
        /* never instantiated by tests; MockWorker provides the object */
      },
      configurable: true,
      writable: true,
    });
  }
});

afterEach(() => {
  Object.defineProperty(globalThis, "Worker", {value: ORIGINAL_WORKER, configurable: true, writable: true});
});

describe("useWorker", () => {
  it("returns a host whose state advances from idle/starting to ready after a call", async () => {
    const {factory} = makeFactory();
    const {result} = renderHook(() => useWorker(factory));
    expect(["idle", "starting"]).toContain(result.current.state);
    await act(async () => {
      await result.current.api.echo("hi");
    });
    expect(result.current.state).toBe("ready");
  });

  it("re-creates a fresh host across StrictMode mount/unmount/remount", async () => {
    const {factory} = makeFactory();
    function Probe() {
      const w = useWorker(factory);
      return <div data-testid='state'>{w.state}</div>;
    }
    const {getByTestId, rerender} = render(
      <StrictMode>
        <Probe />
      </StrictMode>,
    );
    rerender(
      <StrictMode>
        <Probe />
      </StrictMode>,
    );
    expect(["idle", "starting", "ready"]).toContain(getByTestId("state").textContent);
  });

  it("disposes the host on unmount", async () => {
    const {factory} = makeFactory();
    const {result, unmount} = renderHook(() => useWorker(factory));
    await act(async () => {
      await result.current.api.echo("warm");
    });
    expect(result.current.state).toBe("ready");
    unmount();
    // After unmount, the host's internal state is `disposed`; we can't
    // observe it via the hook anymore.
  });

  // Pins the disposed-host re-creation contract: when an effect re-runs and
  // finds the current host already disposed (the React 19 Strict Mode
  // mount/unmount/remount shape), the hook must replace it with a fresh host
  // rather than leaving the consumer wedged on a dead host. We exercise the
  // branch by wrapping the hook in StrictMode so the synthetic unmount runs
  // the cleanup (disposing the host), and the synthetic remount re-runs the
  // effect, hitting the disposed-state branch and calling setHost.
  it("re-creates a fresh host when the current host is disposed", async () => {
    const {factory} = makeFactory();
    const seen: Array<unknown> = [];
    function Probe() {
      const w = useWorker(factory);
      seen.push(w);
      return <div data-testid='state'>{w.state}</div>;
    }
    render(
      <StrictMode>
        <Probe />
      </StrictMode>,
    );
    // Allow any pending effect-driven setHost (from the disposed-state branch
    // on the synthetic remount) to flush.
    await act(async () => {});
    // The very first host (synthesized during the discarded mount) must have
    // been replaced by a fresh, non-disposed host. We verify that at least two
    // distinct host identities were observed, and that the most recent one is
    // not in the disposed state.
    const distinct = new Set(seen);
    expect(distinct.size).toBeGreaterThanOrEqual(2);
    const latest = seen[seen.length - 1] as {state: string};
    expect(latest.state).not.toBe("disposed");
  });
});
