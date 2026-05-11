"use client";

/**
 * @fileoverview Public React-hook layer for the Web Worker foundation.
 * Consumers import from `@/workers/react`.
 * @module workers/react
 */

import "../client-only";

export {createWorkerHook} from "./createWorkerHook";
export {useWorker} from "./useWorker";
export {useWorkerEvent} from "./useWorkerEvent";
