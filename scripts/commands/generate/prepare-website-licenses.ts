import type {Effect} from "effect";

import {FrontendLicenseGenerator, type FrontendLicenseRequirements} from "./artifacts.ts";
import type {ArtifactGenerationFailed} from "./errors.ts";

/**
 * Generates only this website's attribution document from its installed dependencies.
 * @param repositoryRoot - Checkout containing the website and its installed workspace dependencies.
 * @returns The generated website attribution path, without generating another service's artifacts.
 */
export function prepareWebsiteLicenses(
  repositoryRoot: string,
): Effect.Effect<readonly string[], ArtifactGenerationFailed, FrontendLicenseRequirements> {
  return new FrontendLicenseGenerator(repositoryRoot).generate();
}
