/**
 * @fileoverview Slot-extractor host factory (Layer 2).
 * @module app/domains/invoices/_components/ai/hosts/slotExtractorHost
 */

import {createWorkerHost, type WorkerHost} from "@/workers";
import type {SlotExtractorWorkerApi} from "../workers/slotExtractor.api";

export function createSlotExtractorHost(): WorkerHost<SlotExtractorWorkerApi> {
  return createWorkerHost<SlotExtractorWorkerApi>({
    name: "invoice-assistant-slot-extractor",
    load: () => new Worker(new URL("../workers/slot-extractor.worker.ts", import.meta.url), {type: "module"}),
    defaultCallTimeoutMs: 30_000,
    idleTimeoutMs: 10 * 60_000,
  });
}