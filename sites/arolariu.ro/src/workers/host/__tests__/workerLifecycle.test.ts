import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {createWorkerLifecycle, type WorkerHostState} from "../workerLifecycle";

describe("createWorkerLifecycle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe("initial state", () => {
    it("starts as 'idle'", () => {
      const lifecycle = createWorkerLifecycle({idleTimeoutMs: 1000});
      expect(lifecycle.state).toBe("idle");
    });
  });

  describe("transitions", () => {
    it("transitions idle → starting → ready on bootBegin/bootComplete", () => {
      const lifecycle = createWorkerLifecycle({idleTimeoutMs: 0});
      lifecycle.bootBegin();
      expect(lifecycle.state).toBe("starting");
      lifecycle.bootComplete();
      expect(lifecycle.state).toBe("ready");
    });

    it("transitions ready → dead on crash", () => {
      const lifecycle = createWorkerLifecycle({idleTimeoutMs: 0});
      lifecycle.bootBegin();
      lifecycle.bootComplete();
      lifecycle.crash();
      expect(lifecycle.state).toBe("dead");
    });

    it("transitions any state → disposed on dispose", () => {
      const lifecycle = createWorkerLifecycle({idleTimeoutMs: 0});
      lifecycle.dispose();
      expect(lifecycle.state).toBe("disposed");
    });

    it("dispose is idempotent", () => {
      const lifecycle = createWorkerLifecycle({idleTimeoutMs: 0});
      lifecycle.dispose();
      lifecycle.dispose();
      expect(lifecycle.state).toBe("disposed");
    });
  });

  describe("idle timer", () => {
    it("does not fire while in-flight count is > 0", () => {
      const onIdle = vi.fn();
      const lifecycle = createWorkerLifecycle({idleTimeoutMs: 1000, onIdle});
      lifecycle.bootBegin();
      lifecycle.bootComplete();
      lifecycle.beginCall();
      vi.advanceTimersByTime(2000);
      expect(onIdle).not.toHaveBeenCalled();
    });

    it("fires after idleTimeoutMs of zero in-flight calls", () => {
      const onIdle = vi.fn();
      const lifecycle = createWorkerLifecycle({idleTimeoutMs: 1000, onIdle});
      lifecycle.bootBegin();
      lifecycle.bootComplete();
      lifecycle.beginCall();
      lifecycle.endCall();
      vi.advanceTimersByTime(999);
      expect(onIdle).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(onIdle).toHaveBeenCalledOnce();
    });

    it("clears the timer when a new call begins", () => {
      const onIdle = vi.fn();
      const lifecycle = createWorkerLifecycle({idleTimeoutMs: 1000, onIdle});
      lifecycle.bootBegin();
      lifecycle.bootComplete();
      lifecycle.beginCall();
      lifecycle.endCall();
      vi.advanceTimersByTime(500);
      lifecycle.beginCall();
      vi.advanceTimersByTime(2000);
      expect(onIdle).not.toHaveBeenCalled();
    });

    it("does not schedule when idleTimeoutMs is 0", () => {
      const onIdle = vi.fn();
      const lifecycle = createWorkerLifecycle({idleTimeoutMs: 0, onIdle});
      lifecycle.bootBegin();
      lifecycle.bootComplete();
      lifecycle.beginCall();
      lifecycle.endCall();
      vi.advanceTimersByTime(60_000);
      expect(onIdle).not.toHaveBeenCalled();
    });

    it("does not schedule when idleTimeoutMs is Infinity", () => {
      const onIdle = vi.fn();
      const lifecycle = createWorkerLifecycle({idleTimeoutMs: Infinity, onIdle});
      lifecycle.bootBegin();
      lifecycle.bootComplete();
      lifecycle.beginCall();
      lifecycle.endCall();
      vi.advanceTimersByTime(60_000);
      expect(onIdle).not.toHaveBeenCalled();
    });
  });

  describe("subscribe", () => {
    it("notifies subscribers on every state change", () => {
      const lifecycle = createWorkerLifecycle({idleTimeoutMs: 0});
      const states: WorkerHostState[] = [];
      lifecycle.subscribe((s) => states.push(s));
      lifecycle.bootBegin();
      lifecycle.bootComplete();
      lifecycle.crash();
      expect(states).toEqual(["starting", "ready", "dead"]);
    });

    it("returns an unsubscribe function", () => {
      const lifecycle = createWorkerLifecycle({idleTimeoutMs: 0});
      const fn = vi.fn();
      const unsubscribe = lifecycle.subscribe(fn);
      lifecycle.bootBegin();
      expect(fn).toHaveBeenCalledOnce();
      unsubscribe();
      lifecycle.bootComplete();
      expect(fn).toHaveBeenCalledOnce();
    });
  });

  describe("inflight tracking", () => {
    it("increments and decrements correctly", () => {
      const lifecycle = createWorkerLifecycle({idleTimeoutMs: 1000});
      lifecycle.bootBegin();
      lifecycle.bootComplete();
      expect(lifecycle.inFlight).toBe(0);
      lifecycle.beginCall();
      expect(lifecycle.inFlight).toBe(1);
      lifecycle.beginCall();
      expect(lifecycle.inFlight).toBe(2);
      lifecycle.endCall();
      expect(lifecycle.inFlight).toBe(1);
      lifecycle.endCall();
      expect(lifecycle.inFlight).toBe(0);
    });

    it("never goes negative on extra endCall (defensive)", () => {
      const lifecycle = createWorkerLifecycle({idleTimeoutMs: 1000});
      lifecycle.endCall();
      expect(lifecycle.inFlight).toBe(0);
    });
  });
});
