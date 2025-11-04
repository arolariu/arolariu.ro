# Hygiene Check Scripts

This directory contains shell scripts used by the `official-hygiene-check.yml` workflow.

## Scripts

### `check-format.sh`
Runs prettier formatting and checks for any changes.

**Outputs:**
- `format-needed`: `true` if files need formatting, `false` otherwise
- `files-needing-format`: Comma-separated list of files that need formatting

**Usage:**
```bash
./.github/scripts/hygiene/check-format.sh
```

### `check-lint.sh`
Runs linting and captures output.

**Outputs:**
- `lint-passed`: `true` if linting passed, `false` otherwise
- `lint-output`: Linting output (truncated to 50KB)

**Usage:**
```bash
./.github/scripts/hygiene/check-lint.sh
```

### `check-unit-tests.sh`
Runs unit tests across all projects.

**Outputs:**
- `result`: `success` if tests passed

**Usage:**
```bash
./.github/scripts/hygiene/check-unit-tests.sh
```

### `compute-extra-stats.sh`
Computes extended diff metrics including churn, net change, top extensions, and top directories.

**Arguments:**
- `$1`: Base branch (default: `origin/main`)
- `$2`: Target ref (default: `HEAD`)

**Outputs:**
- `top-ext-markdown`: Markdown table of top file extensions
- `top-dir-markdown`: Markdown table of top directories
- `churn`: Total lines added + deleted
- `net-change`: Total lines added - deleted

**Usage:**
```bash
./.github/scripts/hygiene/compute-extra-stats.sh "origin/main" "HEAD"
```

## Version Control

These scripts are version-controlled to:
- Track changes over time
- Enable easier review and testing
- Avoid inline script complexity in workflow files
- Improve maintainability
