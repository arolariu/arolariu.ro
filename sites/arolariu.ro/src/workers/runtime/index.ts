/**
 * @fileoverview Worker-side helpers, imported from inside `*.worker.ts` files.
 * @module workers/runtime
 */

export {expose, getBootstrapCapabilities, getEventPort} from "./exposeWorker";
export {emitEvent} from "./emitEvent";
