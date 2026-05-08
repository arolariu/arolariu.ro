/**
 * @fileoverview Tiny helper that wraps `MessageChannel` creation with named ports.
 * @module workers/host/createPortPair
 *
 * @remarks
 * Two-port channels are the building block of the worker bootstrap handshake.
 * Naming the halves explicitly (`parent` vs `transferable`) makes call sites
 * read top-down and makes it syntactically obvious which port the host must
 * `close()` on teardown (the `parent` half) and which one detaches
 * automatically after being transferred (the `transferable` half).
 */

/**
 * A `MessageChannel` split into named halves.
 *
 * Both ports refer to the same underlying channel; `parent` and `transferable`
 * are conventions only. The `parent` port is intended to remain on the host
 * side (typically with an `onmessage` handler attached); the `transferable`
 * port is intended to be transferred to a `Worker` via the second argument
 * to `worker.postMessage(_, [transferable])`.
 */
export type PortPair = Readonly<{
  /** The host-retained side of the channel. Close on teardown. */
  parent: MessagePort;
  /** The side intended to be transferred via `worker.postMessage(_, [transferable])`. */
  transferable: MessagePort;
}>;

/**
 * Build a `MessageChannel` and return its two ports under named labels.
 *
 * @returns A {@link PortPair} object whose `parent` and `transferable` fields
 *   are the two halves of a single `MessageChannel`.
 *
 * @example
 * ```ts
 * const rpc = createPortPair();
 * worker.postMessage({rpcPort: rpc.transferable}, [rpc.transferable]);
 * // Later, on teardown:
 * rpc.parent.close();
 * ```
 */
export function createPortPair(): PortPair {
  const channel = new MessageChannel();
  return {parent: channel.port1, transferable: channel.port2};
}
