/** @format */

/**
 * Display help information for all available commands
 */
export async function main() {
  console.log(`
📋 Available Commands:

🏗️  Build Commands:
  yarn build          - Build all projects sequentially
  yarn build:parallel - Build projects in parallel
  yarn build:components - Build React component library
  yarn build:website  - Build Next.js website
  yarn build:docs     - Build DocFX documentation
  yarn build:api      - Build .NET API

🧹 Maintenance Commands:
  yarn clean          - Clean all build artifacts
  yarn setup          - Install all dependencies

🛠️  Development Commands:
  yarn dev:components - Start Storybook development server
  yarn test           - Run all tests
  yarn lint           - Lint all projects
  yarn format         - Format all projects

📊 Utility Commands:
  yarn status         - Show build status across all projects
  yarn help           - Display this help
`);
}

main();