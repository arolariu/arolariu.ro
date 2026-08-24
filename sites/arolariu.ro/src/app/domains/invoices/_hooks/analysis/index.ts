/**
 * @fileoverview Barrel export for analysis-focused React hooks.
 * @module app/domains/invoices/_hooks/analysis
 *
 * @remarks
 * Re-exports hooks that submit invoice or merchant entities to the backend
 * asynchronous analysis pipeline. Importing from this barrel decouples
 * components from individual hook file paths.
 *
 * @example
 * ```tsx
 * import {useAnalysisSubmission} from "@/app/domains/invoices/_hooks/analysis";
 * ```
 */

export {ANALYSIS_REFRESH_DELAY_MS, useAnalysisSubmission} from "./useAnalysisSubmission";
export type {AnalysisSubmissionStatus, UseAnalysisSubmissionOptions, UseAnalysisSubmissionResult} from "./useAnalysisSubmission";
