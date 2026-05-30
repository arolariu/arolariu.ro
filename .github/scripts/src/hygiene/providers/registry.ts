/**
 * @fileoverview Provider registry -- the single source of truth for installed providers.
 * @module github/scripts/src/hygiene/providers/registry
 *
 * @remarks
 * Adding a new check: import it here and append to REGISTRY. That is it.
 */

import type {CheckProvider} from "../domain/provider.ts";
import {formatProvider} from "./formatProvider.ts";
import {lintProvider} from "./lintProvider.ts";
import {statsProvider} from "./statsProvider.ts";
import {testProvider} from "./testProvider.ts";

export const REGISTRY: readonly CheckProvider<unknown>[] = [
  formatProvider as CheckProvider<unknown>,
  lintProvider as CheckProvider<unknown>,
  testProvider as CheckProvider<unknown>,
  statsProvider as CheckProvider<unknown>,
];

export function getProviderById(id: string): CheckProvider<unknown> | undefined {
  return REGISTRY.find((p) => p.id === id);
}

export function providerIds(): readonly string[] {
  return REGISTRY.map((p) => p.id);
}
