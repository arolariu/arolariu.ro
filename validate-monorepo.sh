#!/bin/bash

# Monorepo Validation Script
# This script validates that the Nx monorepo setup is working correctly

echo "🧪 Validating Nx Monorepo Setup..."
echo ""

# Check if we're in the right directory
if [ ! -f "nx.json" ]; then
    echo "❌ Error: nx.json not found. Run this script from the repository root."
    exit 1
fi

echo "✅ Found nx.json configuration"

# Check if Nx is installed
if ! command -v npx &> /dev/null; then
    echo "❌ Error: npx not found. Please install Node.js and npm."
    exit 1
fi

echo "✅ Found npx command"

# Check if Nx can detect projects
PROJECT_COUNT=$(npx nx show projects 2>/dev/null | wc -l)
if [ "$PROJECT_COUNT" -eq 0 ]; then
    echo "❌ Error: No projects detected by Nx"
    exit 1
fi

echo "✅ Detected $PROJECT_COUNT projects:"
npx nx show projects | sed 's/^/  - /'

# Verify all expected projects exist
EXPECTED_PROJECTS=("components" "website" "api" "cv" "docs")
for project in "${EXPECTED_PROJECTS[@]}"; do
    if npx nx show projects | grep -q "^$project$"; then
        echo "✅ Project '$project' detected"
    else
        echo "❌ Error: Expected project '$project' not found"
        exit 1
    fi
done

# Check if project configurations exist
echo ""
echo "🔍 Validating project configurations..."
for project in "${EXPECTED_PROJECTS[@]}"; do
    # Try to find the project.json in the correct location
    if find . -name "project.json" -type f \( -path "*/sites/*" -o -path "*/packages/*" \) | xargs grep -l "\"name\": \"$project\"" > /dev/null 2>&1; then
        echo "✅ Project configuration for '$project' found"
    else
        echo "❌ Error: Project configuration for '$project' not found"
        exit 1
    fi
done

# Verify package.json scripts exist
echo ""
echo "🔍 Validating root package.json scripts..."
EXPECTED_SCRIPTS=("build" "build:components" "build:website" "dev" "test" "lint")
for script in "${EXPECTED_SCRIPTS[@]}"; do
    if grep -q "\"$script\":" package.json; then
        echo "✅ Script '$script' found in package.json"
    else
        echo "❌ Error: Expected script '$script' not found in package.json"
        exit 1
    fi
done

# Check if individual project files are preserved
echo ""
echo "🔍 Validating backward compatibility..."
INDIVIDUAL_PROJECTS=(
    "packages/components/package.json"
    "sites/arolariu.ro/package.json"
    "sites/cv.arolariu.ro/package.json"
)

for project_file in "${INDIVIDUAL_PROJECTS[@]}"; do
    if [ -f "$project_file" ]; then
        echo "✅ Individual project file '$project_file' preserved"
    else
        echo "❌ Error: Individual project file '$project_file' missing"
        exit 1
    fi
done

# Verify CI/CD workflows are intact
echo ""
echo "🔍 Validating CI/CD workflows..."
WORKFLOW_FILES=(".github/workflows/website-official-build.yml" ".github/workflows/api-official-trigger.yml" ".github/workflows/cv-official-trigger.yml")
for workflow in "${WORKFLOW_FILES[@]}"; do
    if [ -f "$workflow" ]; then
        echo "✅ Workflow '$workflow' found"
        # Check if working-directory is preserved
        if grep -q "working-directory:" "$workflow"; then
            echo "✅ Working directory configuration preserved in '$workflow'"
        else
            echo "⚠️  Warning: No working-directory found in '$workflow' (may be intentional)"
        fi
    else
        echo "❌ Error: Workflow '$workflow' missing"
        exit 1
    fi
done

echo ""
echo "🎉 All validations passed! The Nx monorepo setup is working correctly."
echo ""
echo "📋 Quick Start:"
echo "  npm run build           - Build all projects"
echo "  npm run build:website   - Build specific project"
echo "  npm run dev             - Start all dev servers"
echo "  npm run test            - Run all tests"
echo "  npx nx graph            - View dependency graph"
echo ""
echo "📚 For more information, see README-MONOREPO.md"