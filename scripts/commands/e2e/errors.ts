/**
 * @fileoverview Typed failures of the `test e2e` Newman runner.
 * @module scripts/commands/e2e/errors
 *
 * @remarks
 * Every class carries a human-readable `message` plus the fields that identify what failed. No
 * field is ever built from a `ProcessError` message or command line, because the Newman command
 * line carries the auth token: process output reaches `evidence` only after redaction.
 */

import {Schema} from "effect";

/**
 * Newman could not run for, or did not succeed for, one target.
 *
 * @remarks
 * Raised for a missing collection, environment file, or required auth token, for a Newman run that
 * did not exit with code `0`, and for report cleanup that failed after Newman succeeded. A report
 * cleanup failure that follows a Newman failure is appended to that failure's `evidence`.
 */
export class NewmanFailed extends Schema.TaggedError<NewmanFailed>()("NewmanFailed", {
  message: Schema.String,
  target: Schema.String,
  exitCode: Schema.optional(Schema.Number),
  evidence: Schema.Array(Schema.String),
}) {}

/** One Newman report could not be read, parsed, or rewritten during report cleanup. */
export class NewmanReportFailed extends Schema.TaggedError<NewmanReportFailed>()("NewmanReportFailed", {
  message: Schema.String,
  path: Schema.String,
}) {}
