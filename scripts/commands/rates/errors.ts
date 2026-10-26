/**
 * @fileoverview Typed failures of the `rates` command family.
 * @module scripts/commands/rates/errors
 *
 * @remarks
 * Every class carries a human-readable `message` plus the fields that identify what failed. The
 * exchange-rate updater fails with these instead of throwing; `updateExchangeRates` records a
 * per-year {@link ExchangeRateApiFailed} and maps an {@link ExchangeRateInputInvalid} to a usage
 * failure (exit `2`).
 */

import {Schema} from "effect";

/** A Frankfurter request returned a non-2xx status or a body that is not a rates document. */
export class ExchangeRateApiFailed extends Schema.TaggedError<ExchangeRateApiFailed>()("ExchangeRateApiFailed", {
  message: Schema.String,
  status: Schema.optional(Schema.Number),
}) {}

/** A year bound or year range is outside the supported, ordered, current-year-bounded range. */
export class ExchangeRateInputInvalid extends Schema.TaggedError<ExchangeRateInputInvalid>()("ExchangeRateInputInvalid", {
  message: Schema.String,
}) {}
