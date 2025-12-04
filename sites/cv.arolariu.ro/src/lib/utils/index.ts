/**
 * @fileoverview Utility functions barrel export for the CV site.
 * @module utils
 *
 * @remarks
 * Re-exports all utility functions from their respective modules.
 * Import from this index for cleaner imports:
 *
 * ```typescript
 * import { ok, error, downloadJSON, copyText } from "$lib/utils";
 * ```
 *
 * **Available Modules:**
 * - **copy**: Clipboard operations (`copyText`)
 * - **download**: File download utilities (`downloadText`, `downloadJSON`, `downloadBlob`)
 * - **result**: Functional error handling (`Result`, `ok`, `error`)
 *
 * @see {@link Result} for the core error handling type
 */

export {copyText} from "./copy";
export {downloadBlob, downloadJSON, downloadText} from "./download";
export {error, ok, type Result} from "./result";
