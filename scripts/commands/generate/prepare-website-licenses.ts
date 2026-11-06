import {NodeRuntime, NodeServices} from "@effect/platform-node";
import {Effect, Layer} from "effect";
import {resolve} from "node:path";

import {EnvironmentLive} from "../../platform/Environment.ts";
import {outputLayer, SinkLive} from "../../platform/Output.ts";
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

if (import.meta.main) {
  NodeRuntime.runMain(
    prepareWebsiteLicenses(resolve(import.meta.dirname, "../../..")).pipe(
      Effect.provide(
        Layer.mergeAll(
          NodeServices.layer,
          EnvironmentLive,
          outputLayer({mode: "human", verbose: false, color: false, context: "website-prepare"}).pipe(Layer.provideMerge(SinkLive)),
        ),
      ),
    ),
  );
}
