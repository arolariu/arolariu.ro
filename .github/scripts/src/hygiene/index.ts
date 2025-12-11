/**
 * @fileoverview Hygiene check module entry point
 * @module hygiene
 *
 * This module provides the unified entry point for all hygiene check operations.
 * It exports check modules, types, and the comment builder.
 */

// Export types
export * from "./types.ts";

// Export check modules
export * from "./checks/index.ts";

// Export comment builder
export {HYGIENE_COMMENT_IDENTIFIER, buildHygieneComment, createHygieneReport} from "./commentBuilder.ts";
