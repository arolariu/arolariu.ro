/**
 * Barrel exports for side-effect & helper utilities (Phase 0).
 * Central import surface: import { copyText, downloadJSON, exportPdf, printDocument, normalizeHttp, ok, err } from '@/lib/utils';
 *
 * @format
 */

export {copyText} from "./copy";
export {downloadText, downloadJSON, downloadBlob} from "./download";
export {ok, err} from "./result";
export type {Result} from "./result";
