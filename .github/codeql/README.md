# CodeQL Security Analysis Configuration

This directory contains the CodeQL configuration for the arolariu.ro monorepo.

## Overview

[CodeQL](https://codeql.github.com/) is GitHub's semantic code analysis engine that identifies security vulnerabilities and code quality issues. This configuration enables automated security scanning for the entire monorepo.

## Analyzed Languages

| Language | Source Paths | Build Required |
|----------|-------------|----------------|
| JavaScript/TypeScript | `sites/arolariu.ro/`, `sites/cv.arolariu.ro/`, `packages/components/` | No (interpreted) |
| C# / .NET | `sites/api.arolariu.ro/` | Yes (compiled) |

## Configuration Files

### `codeql-config.yml`

Main configuration file that defines:

- **Query suites**: `security-extended` and `security-and-quality` for comprehensive analysis
- **Paths to analyze**: Source directories for all projects
- **Paths to ignore**: Build outputs, tests, generated files, and dependencies
- **Threat models**: Remote flow sources for security analysis

### Workflow: `.github/workflows/official-codeql-analysis.yml`

The GitHub Actions workflow that runs CodeQL analysis:

- **Triggers**:
  - Push to `main` or `preview` branches
  - Pull requests targeting `main` or `preview`
  - Weekly scheduled scan (Sundays at 00:00 UTC)
  - Manual dispatch

- **Jobs**:
  - `analyze-javascript`: Scans JavaScript/TypeScript code
  - `analyze-csharp`: Builds and scans .NET code
  - `summary`: Generates analysis summary

## Viewing Results

Security findings are available in:

1. **Security Tab**: Navigate to `Security > Code scanning alerts` in the repository
2. **Pull Request Checks**: Results appear as check runs on PRs
3. **SARIF Files**: Uploaded as workflow artifacts

## Query Suites

| Suite | Description |
|-------|-------------|
| `security-extended` | Extended set of security queries |
| `security-and-quality` | Security + code quality queries |
| `code-scanning` | Default queries for code scanning |

## Customization

### Adding New Languages

To add support for additional languages:

1. Add the language to the workflow matrix
2. Configure build steps if required (compiled languages)
3. Update `codeql-config.yml` paths

### Excluding False Positives

To exclude false positives:

1. Use inline comments: `// lgtm[rule-id]` or `// codeql[rule-id]`
2. Add query filters to `codeql-config.yml`
3. Dismiss alerts in the Security tab with justification

### Custom Queries

To add custom queries:

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
- [SARIF Format](https://docs.github.com/en/code-security/code-scanning/integrating-with-code-scanning/sarif-support-for-code-scanning)

## Troubleshooting

### Build Failures (C#)

If the C# analysis fails:

1. Ensure .NET SDK version matches `DOTNET_VERSION` in workflow
2. Check that all NuGet packages restore correctly
3. Verify the solution/project files are valid

### Missing Results

If expected results are missing:

1. Check that the file path is included in `paths`
2. Verify the file is not in `paths-ignore`
3. Ensure the language is correctly detected

### Rate Limiting

For large codebases:

1. Use path filters to limit scope
2. Consider splitting analysis by project
3. Use `workflow_dispatch` for on-demand scans
