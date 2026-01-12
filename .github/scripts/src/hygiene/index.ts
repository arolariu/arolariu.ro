/**
 * @fileoverview Hygiene check module entry point.
 * @module github/scripts/src/hygiene
 *
 * @remarks
 * This module provides a single import surface for hygiene check operations.
 * It re-exports the check runners, shared types, and PR comment builder.
 */

// Export types
export * from "./types.ts";

// Export check modules
export * from "./checks/index.ts";

// Export comment builder
export {HYGIENE_COMMENT_IDENTIFIER, buildHygieneComment, createHygieneReport} from "./commentBuilder.ts";
