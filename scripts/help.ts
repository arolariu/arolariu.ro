/** @format */

/**
 * Display help information for all available commands
 */
export async function main() {
  console.log(`
🚀 AROLARIU.RO Monorepo CLI

📋 Available Commands:

🏗️  Build Commands:
  yarn build             - Build all projects sequentially
  yarn build:parallel    - Build projects in parallel
  yarn build:components  - Build React component library
  yarn build:website     - Build Next.js website
  yarn build:docs        - Build DocFX documentation
  yarn build:api         - Build .NET API

🧹 Maintenance Commands:
  yarn clean             - Clean all build artifacts
  yarn setup             - Install all dependencies

🛠️  Development Commands:
  yarn dev:components    - Start Storybook development server
  yarn test              - Run all tests
  yarn test:scripts      - Test CLI scripts
  yarn lint              - Lint all projects
  yarn format            - Format all projects

📊 Utility Commands:
  yarn status            - Show build status across all projects
  yarn help              - Display this help

🎯 Workspace Commands:
  yarn workspace @arolariu/components storybook  - Run Storybook
  yarn workspace @arolariu/website build         - Build website only
  yarn workspaces list                           - List all workspaces
  yarn workspaces foreach run build             - Build all workspaces

💡 Prerequisites:
  - Node.js 24.0+ 
  - .NET 9.0 SDK (for API development)
  - Docker (for containerization)
  - Yarn 4.5+ (managed via Corepack)
`);
}

main();