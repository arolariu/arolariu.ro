import {describe, expect, it} from "vitest";

import {createPortPair} from "./createPortPair";

describe("createPortPair", () => {
  it("returns two distinct port-shaped objects under parent/transferable labels", () => {
    const pair = createPortPair();
    // Duck-type rather than toBeInstanceOf(MessagePort) — jsdom's MessagePort
    // does not interoperate with Vitest's deep-equality instanceOf check
    // (RangeError: Maximum call stack size exceeded).
    expect(typeof pair.parent.postMessage).toBe("function");
    expect(typeof pair.transferable.postMessage).toBe("function");
    expect(typeof pair.parent.close).toBe("function");
    expect(typeof pair.transferable.close).toBe("function");
    expect(pair.parent).not.toBe(pair.transferable);
  });

  it("creates ports that communicate bidirectionally (same underlying channel)", async () => {
    const pair = createPortPair();
    const received = new Promise<unknown>((resolve) => {
      pair.parent.onmessage = (e) => resolve(e.data);
    });
    pair.transferable.postMessage("hello");
    expect(await received).toBe("hello");
  });

  it("returns a fresh channel on each call (ports are not shared across calls)", async () => {
    const a = createPortPair();
    const b = createPortPair();
    let aReceived = "";
    let bReceived = "";
    a.parent.onmessage = (e) => (aReceived = String(e.data));
    b.parent.onmessage = (e) => (bReceived = String(e.data));
    a.transferable.postMessage("from-a");
    b.transferable.postMessage("from-b");
    // Yield once so the messages dispatch.
    await new Promise<void>((res) => setTimeout(res, 0));
    expect(aReceived).toBe("from-a");
    expect(bReceived).toBe("from-b");
  });
});
