/**
 * @fileoverview Process-local memoized inspection session over one fixed provider map.
 * @module scripts/inspection/session
 */

import type {InspectionOutcome, InspectionProviders, InspectionSession} from "./types.ts";

/**
 * Creates a process-local {@link InspectionSession} that memoizes each provider's outcome by key.
 *
 * Memoization is backed by one heterogeneous `Map<keyof TFacts, Promise<InspectionOutcome<unknown>>>`:
 * a single `Map` cannot carry a distinct value type per key, so each entry's payload type is erased to
 * `InspectionOutcome<unknown>`. The two narrow `as` casts below restore the exact `InspectionOutcome<TFacts[Key]>`
 * for the key being read or written; this is safe only because `inspect` is the sole writer and the sole
 * reader of a given key's entry, and every write for `key` is produced by `providers[key]`.
 *
 * The promise for an in-flight or already-settled provider call is cached before that call completes, so
 * concurrent and later callers for the same key observe and share the exact same promise. A provider
 * rejection (including a synchronous throw, which the `async` wrapper below converts into a rejection) is
 * never cached as a resolved outcome: the rejecting entry evicts itself from the map so a later `inspect`
 * call retries, but only if the map still holds that exact promise for the key -- if `invalidate` already
 * removed it and a new call already cached a replacement promise for the same key, the stale rejection
 * leaves that replacement untouched.
 *
 * @param providers - Fixed map of one {@link InspectionProvider} per fact key.
 * @returns A session exposing memoized `inspect` and key-scoped `invalidate`.
 */
export function createInspectionSession<TFacts extends object>(
  providers: InspectionProviders<TFacts>,
): InspectionSession<TFacts> {
  const cache = new Map<keyof TFacts, Promise<InspectionOutcome<unknown>>>();

  function inspect<Key extends keyof TFacts>(key: Key): Promise<InspectionOutcome<TFacts[Key]>> {
    const cachedForKey = cache.get(key);
    if (cachedForKey !== undefined) {
      return cachedForKey as Promise<InspectionOutcome<TFacts[Key]>>;
    }

    const provider = providers[key];
    let pendingForKey: Promise<InspectionOutcome<unknown>>;
    pendingForKey = (async () => provider())().catch((error: unknown) => {
      if (cache.get(key) === pendingForKey) {
        cache.delete(key);
      }
      throw error;
    });

    cache.set(key, pendingForKey);
    return pendingForKey as Promise<InspectionOutcome<TFacts[Key]>>;
  }

  function invalidate(...keys: readonly (keyof TFacts)[]): void {
    for (const key of keys) {
      cache.delete(key);
    }
  }

  return {inspect, invalidate};
}
