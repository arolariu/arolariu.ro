/**
 * @fileoverview Embedding-worker host factory (Layer 1).
 * @module app/domains/invoices/_components/ai/hosts/embeddingHost
 */

import {createWorkerHost, type WorkerHost} from "@/workers";
import type {EmbeddingWorkerApi} from "../workers/embedding.api";

export function createEmbeddingHost(): WorkerHost<EmbeddingWorkerApi> {
  return createWorkerHost<EmbeddingWorkerApi>({
    name: "invoice-assistant-embedding",
    load: () => new Worker(new URL("../workers/embedding.worker.ts", import.meta.url), {type: "module"}),
    defaultCallTimeoutMs: 5_000,
    idleTimeoutMs: 5 * 60_000,
  });
}