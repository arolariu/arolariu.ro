/**
 * @fileoverview Engine-neutral teardown registry contract, its failure record, and the default
 * last-registered-first-run implementation.
 * @module scripts/core/runtime/cleanup
 */

/** One cleanup callback that failed during {@link CleanupRegistry.drain}. */
export interface CleanupFailure {
  /** Label supplied when the failing cleanup was registered. */
  readonly label: string;
  /** Human-readable failure message. */
  readonly message: string;
  /** Original thrown or rejected value. */
  readonly cause: unknown;
}

/** Ordered registry of teardown callbacks a command must run before exiting. */
export interface CleanupRegistry {
  /**
   * Registers one labeled cleanup callback.
   *
   * @returns A function that unregisters this callback so it is skipped by a later
   * {@link CleanupRegistry.drain}, without affecting any other registered callback.
   */
  readonly register: (label: string, cleanup: () => void | Promise<void>) => () => void;
  /**
   * Runs every still-registered cleanup callback in last-registered-first-run (LIFO) order,
   * removing each callback from the registry as it runs, and collects every failure instead of
   * stopping at the first one.
   */
  readonly drain: () => Promise<readonly CleanupFailure[]>;
}

interface CleanupEntry {
  readonly label: string;
  readonly cleanup: () => void | Promise<void>;
  active: boolean;
}

/** Default {@link CleanupRegistry}: runs registered callbacks in last-registered-first-run order. */
export class LifoCleanupRegistry implements CleanupRegistry {
  readonly #entries: CleanupEntry[] = [];

  /** {@inheritDoc CleanupRegistry.register} */
  public register(label: string, cleanup: () => void | Promise<void>): () => void {
    const entry: CleanupEntry = {label, cleanup, active: true};
    this.#entries.push(entry);
    return (): void => {
      entry.active = false;
    };
  }

  /** {@inheritDoc CleanupRegistry.drain} */
  public async drain(): Promise<readonly CleanupFailure[]> {
    const failures: CleanupFailure[] = [];
    let entry = this.#entries.pop();
    while (entry !== undefined) {
      if (entry.active) {
        try {
          // Intentionally sequential: cleanup must run in strict LIFO order, one at a time.
          // eslint-disable-next-line no-await-in-loop
          await entry.cleanup();
        } catch (cause: unknown) {
          failures.push({
            label: entry.label,
            message: cause instanceof Error ? cause.message : String(cause),
            cause,
          });
        }
      }
      entry = this.#entries.pop();
    }
    return failures;
  }
}
