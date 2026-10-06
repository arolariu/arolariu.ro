/**
 * @fileoverview Typed failures of the setup command family.
 * @module scripts/commands/setup/errors
 *
 * @remarks
 * Process failures stay `ProcessError` and filesystem failures stay `PlatformError`; only the
 * failures setup itself classifies live here.
 */

import {Schema} from "effect";

/** A setup mutation failed for a reason that is neither a process nor a filesystem failure. */
export class SetupActionFailed extends Schema.TaggedError<SetupActionFailed>()("SetupActionFailed", {
  message: Schema.String,
  actionId: Schema.String,
}) {}

/** A setup phase precondition failed for a reason that is neither an action, a process, nor a filesystem failure. */
export class SetupPhaseFailed extends Schema.TaggedError<SetupPhaseFailed>()("SetupPhaseFailed", {
  message: Schema.String,
  phaseId: Schema.String,
}) {}
