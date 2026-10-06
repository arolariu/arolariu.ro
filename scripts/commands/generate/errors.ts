/**
 * @fileoverview Typed failures of the `generate` command family.
 * @module scripts/commands/generate/errors
 *
 * @remarks
 * Every class carries a human-readable `message` plus the fields that identify what failed. The
 * leaf generators (`env`, `i18n`, `gql`) and the artifact generator fail with these instead of
 * throwing; the orchestrator maps them to the command exit contract.
 */

import {Schema} from "effect";

/** The exp build-time configuration request failed or returned no `config` object. */
export class ExpConfigurationUnavailable extends Schema.TaggedError<ExpConfigurationUnavailable>()("ExpConfigurationUnavailable", {
  message: Schema.String,
  status: Schema.optional(Schema.Number),
}) {}

/** Required environment values are missing and were not provided. */
export class MissingEnvironmentValues extends Schema.TaggedError<MissingEnvironmentValues>()("MissingEnvironmentValues", {
  message: Schema.String,
  keys: Schema.Array(Schema.String),
}) {}

/** A locale file could not be loaded, compared, or synchronized with the English source. */
export class TranslationSyncFailed extends Schema.TaggedError<TranslationSyncFailed>()("TranslationSyncFailed", {
  message: Schema.String,
  locale: Schema.String,
}) {}

/** A taxonomy source was unavailable and no validated cached artifact exists. */
export class TaxonomySourceUnavailable extends Schema.TaggedError<TaxonomySourceUnavailable>()("TaxonomySourceUnavailable", {
  message: Schema.String,
  taxonomy: Schema.String,
}) {}

/** One generated artifact could not be produced. */
export class ArtifactGenerationFailed extends Schema.TaggedError<ArtifactGenerationFailed>()("ArtifactGenerationFailed", {
  message: Schema.String,
  artifact: Schema.String,
}) {}
