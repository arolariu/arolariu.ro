import {globSync} from "node:fs";
import {createVitest, parseCLI} from "vitest/node";
import {createAuthoredBranchCheck} from "./authored-branches.ts";
import {statusCoverageScope} from "./scope.ts";

const {
  filter,
  options: {reporter, ...options},
} = parseCLI(["vitest", "run", ...process.argv.slice(2)]);
const complete =
  filter.length === 0
  && !options.testNamePattern
  && !options.project?.length
  && !options.changed
  && !options.related?.length
  && !options.shard
  && !options.exclude?.length
  && options.coverage?.enabled !== false;
const gate = complete
  ? createAuthoredBranchCheck(globSync(statusCoverageScope.include, {exclude: statusCoverageScope.exclude}))
  : undefined;
let rawCoverage: unknown;

const vitest = await createVitest(
  {...options, passWithNoTests: false},
  {
    ...(gate === undefined ? {} : {plugins: [gate.capture]}),
    test: {
      reporters: [
        ...(reporter ?? ["default"]),
        {
          onCoverage(coverage: unknown) {
            rawCoverage = coverage;
          },
        },
      ],
    },
  },
);

try {
  await vitest.start(filter);
  if (gate && Number(process.exitCode ?? 0) === 0) {
    if (rawCoverage === undefined) throw new Error("Expected fresh coverage from the complete Status unit run.");
    const {covered, total, compilerOnly} = gate.count(rawCoverage);
    console.info(
      `Authored Status branches: ${((100 * covered) / total).toFixed(2)}% (${covered}/${total}; ${compilerOnly} compiler-only decisions omitted)`,
    );
    if (100 * covered < 95 * total) {
      console.error("Authored Status branch coverage is below 95%.");
      process.exitCode = 1;
    }
  }
} finally {
  await vitest.close();
}
