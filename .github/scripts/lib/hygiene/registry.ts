/**
 * @fileoverview Lightweight provider identities and setup policy, never implementations.
 * @module github/scripts/lib/hygiene/registry
 */
import type {Gate} from "./contracts.ts";

/** Stable workflow/check identities; changing one requires a workflow migration. */
export type ProviderId = "format" | "lint" | "test-typescript" | "test-dotnet" | "test-python" | "stats";
/** CI scripts and root tooling remain independently named suites. */
export type TypeScriptSuiteName = "scripts" | "tooling" | "website" | "components" | "cv" | "status";

/** Expensive setup capabilities a selected provider actually requires. */
export interface ProviderSetup {
  readonly rootNodeDependencies: boolean;
  readonly dotnet: boolean;
  readonly python: boolean;
  readonly buildComponents: boolean;
  readonly generateArtifacts: boolean;
}
/** Dependency-neutral provider metadata shared by plans, outcomes, and rendering. */
export interface ProviderDescriptor {
  readonly id: ProviderId;
  readonly name: string;
  readonly icon: string;
  readonly defaultGate: Gate;
  readonly presentationKind: "format" | "lint" | "test" | "stats";
  readonly setup: ProviderSetup;
}

/** Setup for explicit skips and resource-light statistics. */
export const NO_PROVIDER_SETUP: ProviderSetup = Object.freeze({
  rootNodeDependencies: false,
  dotnet: false,
  python: false,
  buildComponents: false,
  generateArtifacts: false,
});

/** Existing identities, labels, icons and gate thresholds in canonical order. */
const descriptors: readonly ProviderDescriptor[] = [
  {
    id: "format",
    name: "Prettier",
    icon: "🎨",
    defaultGate: {kind: "blocking", blockOn: "warning"},
    presentationKind: "format",
    setup: {...NO_PROVIDER_SETUP, rootNodeDependencies: true},
  },
  {
    id: "lint",
    name: "ESLint",
    icon: "🔍",
    defaultGate: {kind: "blocking", blockOn: "error"},
    presentationKind: "lint",
    setup: {...NO_PROVIDER_SETUP, rootNodeDependencies: true, buildComponents: true},
  },
  {
    id: "test-typescript",
    name: "TypeScript Unit Tests",
    icon: "🟦",
    defaultGate: {kind: "blocking", blockOn: "error"},
    presentationKind: "test",
    setup: {...NO_PROVIDER_SETUP, rootNodeDependencies: true, buildComponents: true, generateArtifacts: true},
  },
  {
    id: "test-dotnet",
    name: "DotNet Unit Tests",
    icon: "🟪",
    defaultGate: {kind: "blocking", blockOn: "error"},
    presentationKind: "test",
    setup: {...NO_PROVIDER_SETUP, rootNodeDependencies: true, dotnet: true, generateArtifacts: true},
  },
  {
    id: "test-python",
    name: "Python Unit Tests",
    icon: "🐍",
    defaultGate: {kind: "blocking", blockOn: "error"},
    presentationKind: "test",
    setup: {...NO_PROVIDER_SETUP, python: true},
  },
  {id: "stats", name: "Statistics", icon: "📊", defaultGate: {kind: "informational"}, presentationKind: "stats", setup: NO_PROVIDER_SETUP},
];

/** Frozen registry snapshot, safe to reuse across plans and report-only consumers. */
export const PROVIDER_DESCRIPTORS: readonly ProviderDescriptor[] = Object.freeze(
  descriptors.map((descriptor) =>
    Object.freeze({...descriptor, defaultGate: Object.freeze(descriptor.defaultGate), setup: Object.freeze(descriptor.setup)}),
  ),
);

/** Root-based suite ownership, independent of Nx's display/canonical project names. */
export const TYPESCRIPT_SUITE_PROJECTS: readonly Readonly<{name: TypeScriptSuiteName; root: string}>[] = Object.freeze([
  {name: "scripts", root: ".github/scripts"},
  {name: "tooling", root: "scripts"},
  {name: "website", root: "sites/arolariu.ro"},
  {name: "cv", root: "sites/cv.arolariu.ro"},
  {name: "status", root: "sites/status.arolariu.ro"},
  {name: "components", root: "packages/components"},
]);

/**
 * Lists every required provider identity in stable workflow order.
 * @returns The six registered identities, including planned skips.
 */
export function providerIds(): readonly ProviderId[] {
  return PROVIDER_DESCRIPTORS.map((provider) => provider.id);
}

/**
 * Resolves metadata without importing an executable provider.
 * @param id - Stable registered identity.
 * @returns The shared descriptor.
 * @throws TypeError for an unregistered runtime value.
 */
export function providerDescriptor(id: ProviderId): ProviderDescriptor {
  const value = PROVIDER_DESCRIPTORS.find((provider) => provider.id === id);
  if (!value) throw new TypeError("Unknown hygiene provider");
  return value;
}

/**
 * Decodes an untrusted identity against the closed registry.
 * @param value - Serialized provider identity.
 * @returns A registered identity.
 * @throws TypeError without echoing rejected data.
 */
export function decodeProviderId(value: unknown): ProviderId {
  const found = PROVIDER_DESCRIPTORS.find((provider) => provider.id === value);
  if (!found) throw new TypeError("Unknown hygiene provider");
  return found.id;
}
