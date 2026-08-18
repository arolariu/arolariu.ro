/**
 * @fileoverview Deterministic policy for invoice-scan Azure Blob locations.
 * @module lib/azure/storageLocationPolicy
 *
 * @remarks
 * Mirrors the backend invoice-scan location policy without performing DNS,
 * redirects, or network requests. The policy accepts only the configured
 * service root's `invoices` container and permits HTTP solely for an explicit
 * loopback Azurite root.
 */

/** The only container allowed to hold invoice scans. */
const INVOICE_SCAN_CONTAINER = "invoices";

type StorageLocationPolicyInput = Readonly<{
  /** Candidate invoice-scan location, optionally including a SAS query string. */
  readonly location: string;
  /** Configured Azure Blob service root. */
  readonly storageServiceRoot: string;
  /** Configured Azure Storage account name. */
  readonly storageAccountName: string;
}>;

/**
 * Resolves the configured account name from a validated Azure service root.
 *
 * @param storageServiceRoot - Configured HTTPS Blob root or loopback Azurite root.
 * @returns The account name, or `null` when the root cannot identify one.
 */
export function getStorageAccountName(storageServiceRoot: string): string | null {
  try {
    const serviceRoot = new URL(storageServiceRoot);
    if (serviceRoot.protocol === "https:" && hasOnlyServiceRootPath(serviceRoot)) {
      return serviceRoot.hostname.split(".")[0] ?? null;
    }

    if (serviceRoot.protocol === "http:" && isLoopbackHost(serviceRoot.hostname)) {
      return serviceRoot.pathname.split("/").filter(Boolean)[0] ?? null;
    }
  } catch {
    return null;
  }

  return null;
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" || hostname === "::1";
}

function hasOnlyServiceRootPath(url: URL): boolean {
  return url.pathname === "/" || url.pathname === "";
}

function isConfiguredAzuriteRoot(url: URL, storageAccountName: string): boolean {
  return isLoopbackHost(url.hostname) && (url.pathname === `/${storageAccountName}` || url.pathname === `/${storageAccountName}/`);
}

function containsEncodedSeparator(segment: string): boolean {
  return /%2f|%5c/iu.test(segment);
}

function hasSafeBlobPath(encodedBlobPath: string): boolean {
  if (encodedBlobPath === "" || encodedBlobPath.includes("\\")) {
    return false;
  }

  return encodedBlobPath.split("/").every((segment) => {
    if (segment === "" || containsEncodedSeparator(segment)) {
      return false;
    }

    try {
      const decoded = decodeURIComponent(segment);
      return decoded !== "" && decoded !== "." && decoded !== ".." && !decoded.includes("/") && !decoded.includes("\\");
    } catch {
      return false;
    }
  });
}

/**
 * Determines whether a scan location is under the configured Blob service root.
 *
 * @param input - Candidate location and the configured storage service identity.
 * @returns Whether the location is an approved `invoices` blob location.
 */
export function isApprovedInvoiceScanLocation({location, storageServiceRoot, storageAccountName}: StorageLocationPolicyInput): boolean {
  if (storageAccountName.trim() === "") {
    return false;
  }

  if (/(?:^|\/)(?:\.{1,2}|%2e(?:%2e|\.)?|\.%2e)(?:\/|$)/iu.test(location)) {
    return false;
  }

  let candidate: URL;
  let serviceRoot: URL;
  try {
    candidate = new URL(location);
    serviceRoot = new URL(storageServiceRoot);
  } catch {
    return false;
  }

  if (
    candidate.username !== ""
    || candidate.password !== ""
    || candidate.hash !== ""
    || serviceRoot.username !== ""
    || serviceRoot.password !== ""
    || serviceRoot.search !== ""
    || serviceRoot.hash !== ""
    || candidate.protocol !== serviceRoot.protocol
    || candidate.hostname !== serviceRoot.hostname
    || candidate.port !== serviceRoot.port
  ) {
    return false;
  }

  const isProductionRoot =
    serviceRoot.protocol === "https:" && hasOnlyServiceRootPath(serviceRoot) && serviceRoot.hostname.startsWith(`${storageAccountName}.`);
  const isAzuriteRoot = serviceRoot.protocol === "http:" && isConfiguredAzuriteRoot(serviceRoot, storageAccountName);

  if (!isProductionRoot && !isAzuriteRoot) {
    return false;
  }

  const containerPrefix = isAzuriteRoot ? `/${storageAccountName}/${INVOICE_SCAN_CONTAINER}/` : `/${INVOICE_SCAN_CONTAINER}/`;

  return candidate.pathname.startsWith(containerPrefix) && hasSafeBlobPath(candidate.pathname.slice(containerPrefix.length));
}
