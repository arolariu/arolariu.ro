import {includesDocumentationPath, type DocsSiteMode} from "./siteMode.ts";

/** One documentation landing destination. */
export interface DocumentationRow {
  readonly label: string;
  readonly href: string;
}

/** Stable landing sections and the keyboard cursor's flattened destination list. */
export interface DocumentationNavigation {
  readonly iWantTo: readonly DocumentationRow[];
  readonly startHere: readonly DocumentationRow[];
  readonly resources: readonly DocumentationRow[];
  readonly allRows: readonly DocumentationRow[];
}

const iWantTo: readonly DocumentationRow[] = [
  {label: "hit the api from code", href: "/internals/dotnet/arolariu.Backend.Core/"},
  {label: "understand the architecture", href: "/monorepo/rfc/domain-driven-design-architecture/"},
  {label: "use the component library", href: "/reference/typescript/components/"},
  {label: "add a new RFC", href: "/monorepo/rfc/"},
  {label: "configure telemetry", href: "/monorepo/backend/opentelemetry-guide/"},
  {label: "debug the config proxy", href: "/internals/experimental/config/loader/"},
];

const startHere: readonly DocumentationRow[] = [
  {label: "monorepo overview", href: "/monorepo/"},
  {label: ".net internals", href: "/internals/dotnet/"},
  {label: "typescript reference", href: "/reference/typescript/"},
  {label: "experimental (python)", href: "/internals/experimental/"},
];

const resources: readonly DocumentationRow[] = [
  {label: "rfcs", href: "/monorepo/rfc/"},
  {label: "backend guides", href: "/monorepo/backend/"},
  {label: "frontend guides", href: "/monorepo/frontend/"},
];

function createNavigation(mode: DocsSiteMode): DocumentationNavigation {
  const selectedIntents = iWantTo.filter((row) => includesDocumentationPath(row.href, mode));
  const selectedRoots = startHere.filter((row) => includesDocumentationPath(row.href, mode));
  const selectedResources = resources.filter((row) => includesDocumentationPath(row.href, mode));
  return {
    iWantTo: selectedIntents,
    startHere: selectedRoots,
    resources: selectedResources,
    allRows: [...selectedIntents, ...selectedRoots, ...selectedResources],
  };
}

const fullNavigation = createNavigation("full");
const siteOnlyNavigation = createNavigation("site-only");

/**
 * Returns stable navigation data for rendering and keyboard subscriptions.
 * @param mode - Explicit documentation scope.
 * @returns The scope's sections and matching cursor destinations.
 */
export function getDocumentationNavigation(mode: DocsSiteMode): DocumentationNavigation {
  return mode === "full" ? fullNavigation : siteOnlyNavigation;
}
