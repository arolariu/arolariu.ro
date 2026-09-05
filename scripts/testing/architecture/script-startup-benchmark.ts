/**
 * @fileoverview Deterministic median timing helpers for script startup measurement.
 * @module scripts/testing/architecture/script-startup-benchmark
 *
 * @remarks
 * `scripts/testing/architecture/report-script-architecture.ts` uses these helpers to record
 * informational `--help` startup medians. Both the clock and the measured invocation are injected
 * so median selection stays deterministic and unit-testable without spawning any process; the AST
 * import-boundary tests, not these timings, remain the structural enforcement mechanism.
 */

/** One injectable repeated-invocation measurement request. */
interface InvocationMeasurementDefinition {
  /** How many timed invocations to perform; must be a positive safe integer. */
  readonly sampleCount: number;
  /** The invocation measured once per sample. */
  readonly invoke: () => void;
  /** Millisecond clock read immediately before and after every invocation. */
  readonly now: () => number;
}

/**
 * Selects the median of a set of millisecond timing samples.
 *
 * @param samples - At least one timing sample, in any order.
 * @returns The middle sample for an odd sample count, or the mean of the two middle samples for an even one.
 * @throws {Error} When no timing sample is supplied.
 */
export function calculateMedianMilliseconds(samples: readonly number[]): number {
  if (samples.length === 0) {
    throw new Error("At least one timing sample is required.");
  }

  const ordered = [...samples].toSorted((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  const upper = ordered[middle];
  if (upper === undefined) {
    throw new Error("Unable to select the median timing sample.");
  }
  if (ordered.length % 2 === 1) {
    return upper;
  }

  const lower = ordered[middle - 1];
  if (lower === undefined) {
    throw new Error("Unable to select the lower median timing sample.");
  }
  return (lower + upper) / 2;
}

/**
 * Measures one invocation repeatedly and reports the median elapsed duration.
 *
 * @param definition - Sample count plus the injected invocation and millisecond clock.
 * @returns The median measured duration, in milliseconds.
 * @throws {RangeError} When `sampleCount` is not a positive safe integer.
 */
export function measureInvocationMedianMilliseconds(definition: Readonly<InvocationMeasurementDefinition>): number {
  if (!Number.isSafeInteger(definition.sampleCount) || definition.sampleCount < 1) {
    throw new RangeError("sampleCount must be a positive safe integer.");
  }

  const samples = Array.from({length: definition.sampleCount}, () => {
    const startedAt = definition.now();
    definition.invoke();
    return definition.now() - startedAt;
  });

  return calculateMedianMilliseconds(samples);
}
