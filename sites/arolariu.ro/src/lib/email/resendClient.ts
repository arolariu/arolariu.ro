// eslint-disable-next-line n/no-extraneous-import -- server-only is a Next.js build-time marker
import "server-only";

import {Resend} from "resend";

import {fetchResendApiKey} from "@/lib/config/configProxy";

/**
 * @fileoverview Process-wide memoised Resend client.
 * @module lib/email/resendClient
 *
 * @remarks
 * The Resend SDK constructor itself is cheap, but {@link fetchResendApiKey}
 * resolves the API key from Azure Key Vault (or the local config proxy in
 * development) which is **not** something we want on the hot path of every
 * send. Caching the constructed client at module scope amortises both
 * costs across warm Node.js runtime invocations.
 *
 * In Next.js App Router with the Node.js runtime (which this app uses
 * everywhere — see `instrumentation.server.ts`), module state persists
 * across requests served by the same warm function instance. Cold starts
 * get a fresh `null` cache and re-fetch.
 *
 * Two concurrent first-callers during a cold start race the same
 * `fetchResendApiKey()` call. The `inflight` Promise dedupes them — the
 * second caller awaits the first caller's Promise instead of starting
 * its own fetch.
 */

let cached: Resend | null = null;
let inflight: Promise<Resend> | null = null;

/**
 * Get the memoised Resend client, constructing it on first call.
 *
 * @returns The shared {@link Resend} instance for this Node.js runtime.
 * @throws If `RESEND_API_KEY` is not configured at the time of first call.
 *
 * @example
 * ```ts
 * const resend = await getResendClient();
 * await resend.emails.send({...});
 * ```
 */
export async function getResendClient(): Promise<Resend> {
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = (async () => {
    const apiKey = await fetchResendApiKey();
    if (!apiKey) throw new Error("Resend API key not configured");
    cached = new Resend(apiKey);
    return cached;
  })();
  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

/**
 * Test-only: clear the cached singleton.
 *
 * Production code MUST NOT call this — invalidating the cache mid-request
 * defeats the memoisation and re-incurs the `fetchResendApiKey` cost.
 *
 * @internal
 */
export function __resetResendClient(): void {
  cached = null;
  inflight = null;
}
