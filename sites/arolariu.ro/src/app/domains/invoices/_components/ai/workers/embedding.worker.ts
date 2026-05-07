/**
 * @fileoverview Worker entry — exposes the embedding implementation over Comlink.
 * @module app/domains/invoices/_components/ai/workers/embedding.worker
 */

import {expose} from "@/workers/runtime";
import {createEmbeddingImpl} from "./embedding.implementation";

expose(createEmbeddingImpl());