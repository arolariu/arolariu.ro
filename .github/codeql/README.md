# CodeQL Security Analysis Configuration

This directory contains a CodeQL advanced-setup configuration file for the arolariu.ro monorepo.

## Overview

[CodeQL](https://codeql.github.com/) is GitHub's semantic code analysis engine that identifies security vulnerabilities and code quality
issues.

## How Analysis Runs

Code scanning runs through GitHub's CodeQL **default setup**, which is configured in the repository's code security settings rather than in
a tracked file. The settings own the enabled languages; recent default-setup analyses (analysis key
`dynamic/github-code-scanning/codeql:analyze`) cover C#, JavaScript/TypeScript, Python, and GitHub Actions.

No workflow under [`.github/workflows/`](../workflows/) runs CodeQL or references `codeql-config.yml`. Default setup does not read
repository configuration files, so this file currently has no effect. It applies only if an advanced-setup workflow passes it to
`github/codeql-action/init` through the `config-file` input.

## Configuration File

### `codeql-config.yml`

The file defines:

- **Query suites**: `security-extended` and `security-and-quality`; queries tagged `experimental` are excluded through `query-filters`
- **Paths to analyze**:

  | Area                   | Path                           |
  | ---------------------- | ------------------------------ |
  | Website                | `sites/arolariu.ro/src/**`     |
  | CV site                | `sites/cv.arolariu.ro/src/**`  |
  | API                    | `sites/api.arolariu.ro/src/**` |
  | Component library      | `packages/components/src/**`   |
  | Repository scripts     | `scripts/**`                   |
  | GitHub Actions scripts | `.github/scripts/**`           |

  Everything else, including `sites/status.arolariu.ro`, `sites/exp.arolariu.ro`, `sites/docs.arolariu.ro`, `tooling/`, and
  `.github/workflows/`, is outside `paths`.

- **Paths to ignore**: dependencies and build outputs, tests and coverage output, generated files, lockfiles, documentation (`**/docs/**`,
  `**/*.md`), `infra/**`, Storybook, and Playwright artifacts
- **Threat models**: `remote` (remote flow sources)
- **Languages**: none; the analysis that uses the file selects languages
- **Registries**: a commented-out placeholder for future custom query packs

## Viewing Results

Security findings are available in:

1. **Security Tab**: Navigate to `Security > Code scanning alerts` in the repository
2. **Pull Request Checks**: Results appear as check runs on PRs

## Query Suites

`codeql-config.yml` names these suites. They apply only when an advanced-setup analysis uses the file; default setup uses the query suite
selected in repository settings.

| Suite                  | Description                      |
| ---------------------- | -------------------------------- |
| `security-extended`    | Extended set of security queries |
| `security-and-quality` | Security + code quality queries  |

Queries tagged `experimental` are excluded through `query-filters`.

## Customization

### Adding New Languages

Under default setup, enable the language in the repository's code scanning settings. Under advanced setup:

1. Select the language in the analysis workflow (`codeql-config.yml` has no `languages` key)
2. Configure build steps if required (compiled languages)
3. Update `codeql-config.yml` paths

### Excluding False Positives

To exclude false positives:

1. Use inline comments: `// lgtm[rule-id]` or `// codeql[rule-id]`
2. With advanced setup, add query filters to `codeql-config.yml`
3. Dismiss alerts in the Security tab with justification

### Custom Queries

Custom query packs require advanced setup, because default setup does not read `codeql-config.yml`. To add custom queries:

1. Create a query pack in `.github/codeql/queries/`
2. Reference the pack in `codeql-config.yml`
3. Document the custom queries

## Best Practices

1. **Review all alerts**: Don't ignore security findings
2. **Fix high/critical first**: Prioritize by severity
3. **Document dismissals**: Explain why false positives are dismissed
4. **Keep dependencies updated**: Many vulnerabilities come from outdated packages
5. **Run locally**: Use VS Code CodeQL extension for local testing

## Resources

- [CodeQL Documentation](https://codeql.github.com/docs/)
- [CodeQL Query Reference](https://codeql.github.com/codeql-query-help/)
- [GitHub Code Scanning](https://docs.github.com/en/code-security/code-scanning)
- [Customizing Advanced Setup](https://docs.github.com/en/code-security/code-scanning/creating-an-advanced-setup-for-code-scanning/customizing-your-advanced-setup-for-code-scanning)
- [SARIF Format](https://docs.github.com/en/code-security/code-scanning/integrating-with-code-scanning/sarif-support-for-code-scanning)

## Troubleshooting

### Build Failures (C#)

If the C# analysis fails:

1. Ensure the analysis uses the .NET SDK version listed in the root [`AGENTS.md`](../../AGENTS.md#versions)
2. Check that all NuGet packages restore correctly
3. Verify the solution/project files are valid

### Missing Results

If expected results are missing:

1. Under default setup, check that the language is enabled in the repository's code scanning settings
2. Under advanced setup with this file, check that the path is included in `paths` and not matched by `paths-ignore`
3. Ensure the language is correctly detected

### Rate Limiting

For large codebases:

1. With advanced setup, use `paths` and `paths-ignore` to limit scope
2. Consider splitting analysis by project
