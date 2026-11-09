/** Documentation build scope, selected explicitly rather than inferred from missing artifacts. */
export type DocsSiteMode = "full" | "site-only";

const referenceRoots = ["/internals/dotnet", "/reference/typescript", "/internals/experimental"] as const;

/**
 * Resolves the documentation-only development switch.
 * @param raw - The AROLARIU_DOCS_SITE_ONLY environment value.
 * @returns The selected mode; invalid explicit values fail configuration loading.
 */
export function readDocsSiteMode(raw: string | undefined): DocsSiteMode {
  if (raw === undefined || raw === "0") return "full";
  if (raw === "1") return "site-only";
  throw new Error("AROLARIU_DOCS_SITE_ONLY must be '0', '1', or unset.");
}

/**
 * Determines whether a destination is available in the selected documentation scope.
 * @param href - Local documentation path or external destination.
 * @param mode - Explicit documentation build scope.
 * @returns Whether navigation can expose this destination.
 */
export function includesDocumentationPath(href: string, mode: DocsSiteMode): boolean {
  if (mode === "full") return true;
  const path = href.replace(/[?#].*$/, "");
  return !referenceRoots.some((root) => path === root || path.startsWith(`${root}/`));
}
