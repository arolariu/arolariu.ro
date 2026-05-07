/**
 * @fileoverview Worker entry — exposes the slot-extractor implementation over Comlink.
 * @module app/domains/invoices/_components/ai/workers/slot-extractor.worker
 */

import {expose} from "@/workers/runtime";
import {createSlotExtractorImpl} from "./slotExtractor.implementation";

expose(createSlotExtractorImpl());