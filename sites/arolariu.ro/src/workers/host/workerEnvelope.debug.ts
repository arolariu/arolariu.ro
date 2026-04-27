import type {WorkerCapabilities} from "./workerCapabilities";

export const WORKER_PROTOCOL_VERSION = 1 as const;

export function validateBootstrapDebug(message: unknown): boolean {
  console.log("1. typeof message !== object:", typeof message !== "object");
  console.log("   message === null:", message === null);
  
  if (typeof message !== "object" || message === null) {
    console.log("FAIL: not object");
    return false;
  }
  
  const m = message as Record<string, unknown>;
  console.log("2. m.kind:", m.kind, "!== bootstrap:", m.kind !== "bootstrap");
  if (m.kind !== "bootstrap") {
    console.log("FAIL: wrong kind");
    return false;
  }
  
  console.log("3. m.version:", m.version, "!== WORKER_PROTOCOL_VERSION:", m.version !== WORKER_PROTOCOL_VERSION);
  if (m.version !== WORKER_PROTOCOL_VERSION) {
    console.log("FAIL: version mismatch");
    return false;
  }
  
  console.log("4. m.rpcPort:", m.rpcPort, "instanceof MessagePort:", m.rpcPort instanceof MessagePort);
  if (!(m.rpcPort instanceof MessagePort)) {
    console.log("FAIL: rpcPort not MessagePort");
    return false;
  }
  
  console.log("5. m.eventPort:", m.eventPort, "instanceof MessagePort:", m.eventPort instanceof MessagePort);
  if (!(m.eventPort instanceof MessagePort)) {
    console.log("FAIL: eventPort not MessagePort");
    return false;
  }
  
  console.log("6. m.capabilities:", m.capabilities, "typeof:", typeof m.capabilities);
  if (typeof m.capabilities !== "object" || m.capabilities === null) {
    console.log("FAIL: capabilities not object");
    return false;
  }
  
  console.log("PASS: all checks");
  return true;
}
