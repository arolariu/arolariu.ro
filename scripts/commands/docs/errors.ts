/**
 * @fileoverview Typed failures of the `docs` command family.
 * @module scripts/commands/docs/errors
 *
 * @remarks
 * Every class carries a human-readable `message` (the legacy thrown message, verbatim) plus the
 * fields that identify what failed. The documentation assembler fails with these instead of
 * throwing; process and filesystem failures stay `ProcessError` and `PlatformError`.
 */

import {Schema} from "effect";

/** An extractor tier is missing or produced no documentation files. */
export class DocumentationOutputMissing extends Schema.TaggedError<DocumentationOutputMissing>()("DocumentationOutputMissing", {
  message: Schema.String,
  tier: Schema.String,
}) {}

/** Every discovered .NET project is referenced by another, so no build root can be chosen. */
export class DotnetBuildRootUnresolved extends Schema.TaggedError<DotnetBuildRootUnresolved>()("DotnetBuildRootUnresolved", {
  message: Schema.String,
}) {}
