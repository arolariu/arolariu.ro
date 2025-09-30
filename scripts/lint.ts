import {ESLint, Linter} from "eslint";
import process from "node:process";
import pc from "picocolors";
import eslintConfig from "../eslint.config.ts";

type LintTarget = "all" | "packages" | "website" | "cv";

/**
 * Load ESLint configuration based on the lint target.
 * This filters the configurations defined in eslint.config.ts.
 * @param lintTarget The target to load the ESLint config for.
 * @returns The ESLint configuration for the specified target.
 */
function loadESLintConfig(lintTarget: LintTarget): Linter.Config<Linter.RulesRecord> | Linter.Config<Linter.RulesRecord>[] {
  switch (lintTarget) {
    case "all":
      return eslintConfig;
    case "packages":
      return eslintConfig.find((cfg) => cfg.name === "[@arolariu/packages]")!;
    case "website":
      return eslintConfig.find((cfg) => cfg.name === "[@arolariu/website]")!;
    case "cv":
      return eslintConfig.find((cfg) => cfg.name === "[@arolariu/cv]")!;
    default:
      throw new Error(`Unknown lint target: ${lintTarget}`);
  }
}

async function runESLint(config: Linter.Config<Linter.RulesRecord>) {
  const eslint = new ESLint({
    baseConfig: config,
    cache: false,
    errorOnUnmatchedPattern: true,
  });

  console.log(pc.cyan(`\n🔍 Using ESLint config: ${pc.bold(config.name || "unknown")}`));

  const rawPatterns = Array.isArray(config.files) ? config.files : [config.files];
  const stringPatterns = rawPatterns.filter((p): p is string => typeof p === "string");

  console.log(pc.gray("\n📂 Lint file paths:"));
  console.log(pc.gray(stringPatterns.map((p) => `   - ${p}`).join("\n")));

  console.log(pc.cyan("\n⚡ Running ESLint analysis..."));
  const results = await eslint.lintFiles(stringPatterns);
  const formatter = await eslint.loadFormatter("stylish");
  const resultText = formatter.format(results);

  if (resultText) {
    console.log(resultText);
  }

  const errorCount = results.reduce((sum, res) => sum + res.errorCount, 0);
  const warningCount = results.reduce((sum, res) => sum + res.warningCount, 0);

  if (errorCount > 0 || warningCount > 0) {
    if (errorCount > 0) {
      console.log(pc.red(`  ✗ ESLint found ${errorCount} error(s) and ${warningCount} warning(s)`));
    } else {
      console.log(pc.yellow(`  ⚠ ESLint found ${warningCount} warning(s)`));
    }
    return errorCount > 0 ? 1 : 0;
  }

  console.log(pc.green(`  ✓ No linting issues found for ${config.name}`));
  return 0;
}

/**
 * Run ESLint for the specified target.
 * @param lintTarget The target to lint.
 */
async function startESLint(lintTarget: LintTarget): Promise<number> {
  console.log(pc.bold(pc.magenta(`\n🔎 Running ESLint for: ${lintTarget}`)));
  let lintConfig = loadESLintConfig(lintTarget);
  let totalErrors = 0;

  if (lintTarget === "all") {
    console.log(pc.yellow("⏱️  Warning: Running lint on 'all' may take a while..."));
    for (const config of Array.isArray(lintConfig) ? lintConfig : [lintConfig]) {
      console.log(pc.gray("\n─────────────────────────────────────────────────"));
      const exitCode = await runESLint(config);
      if (exitCode !== 0) totalErrors++;
      console.log(pc.gray("─────────────────────────────────────────────────"));
    }
  } else {
    const config = lintConfig as Linter.Config<Linter.RulesRecord>;
    totalErrors = await runESLint(config);
  }

  return totalErrors;
}

export async function main(arg?: string): Promise<number> {
  console.log(pc.bold(pc.magenta("\n╔════════════════════════════════════════╗")));
  console.log(pc.bold(pc.magenta("║    arolariu.ro Code Linter Tool        ║")));
  console.log(pc.bold(pc.magenta("╚════════════════════════════════════════╝\n")));

  if (!arg) {
    console.error(pc.red("✗ Missing target argument"));
    console.log(pc.gray("\n💡 Usage: lint <all|packages|website|cv>"));
    console.log(pc.gray("   - all:      Lint all targets"));
    console.log(pc.gray("   - packages: Lint component packages"));
    console.log(pc.gray("   - website:  Lint main website"));
    console.log(pc.gray("   - cv:       Lint CV site\n"));
    return 1;
  }

  try {
    let exitCode = 0;

    switch (arg) {
      case "all":
        exitCode = await startESLint("all");
        break;
      case "packages":
        exitCode = await startESLint("packages");
        break;
      case "website":
        exitCode = await startESLint("website");
        break;
      case "cv":
        exitCode = await startESLint("cv");
        break;
      default:
        console.error(pc.red(`✗ Invalid target: "${arg}"`));
        console.log(pc.gray("\n💡 Valid targets: all, packages, website, cv\n"));
        return 1;
    }

    if (exitCode === 0) {
      console.log(pc.bold(pc.green("\n✅ Linting completed successfully!\n")));
    } else {
      console.log(pc.bold(pc.red("\n❌ Linting completed with errors\n")));
    }

    return exitCode;
  } catch (error) {
    console.error(pc.bold(pc.red("\n❌ Linting failed with errors:")), error);
    return 1;
  }
}

if (import.meta.main) {
  const arg = process.argv[2];
  main(arg)
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
