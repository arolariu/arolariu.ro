/**
 * @fileoverview Build-time marker that fails the Next.js build if any
 * server component imports the `@/workers` module tree. The barrel
 * re-imports this file so the marker propagates to every consumer.
 * @module workers/client-only
 */

// eslint-disable-next-line n/no-extraneous-import -- Next.js build-time marker, not a runtime dep
import "client-only";
