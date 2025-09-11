<div align="center">

<img width="400" src="readme/logo.png" alt="arolariu.ro logo">

# AROLARIU.RO Monorepo

![GitHub commit activity](https://img.shields.io/github/commit-activity/y/arolariu/arolariu.ro?style=for-the-badge)
![GitHub language count](https://img.shields.io/github/languages/count/arolariu/arolariu.ro?style=for-the-badge)
![GitHub repo size](https://img.shields.io/github/repo-size/arolariu/arolariu.ro?style=for-the-badge)

![GitHub followers](https://img.shields.io/github/followers/arolariu?style=for-the-badge)
![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/arolariu/arolariu.ro?style=for-the-badge)
![Lines of code](https://aschey.tech/tokei/github/arolariu/arolariu.ro?style=for-the-badge&label=Lines%20of%20Code)

![Qualys SSL/TLS Grade](http://img.shields.io/badge/Qualys%20SSL%2FTLS%20Grade-A%2B-brightgreen.svg?style=for-the-badge)
![Mozilla HTTP Observatory Grade](https://img.shields.io/mozilla-observatory/grade/arolariu.ro?style=for-the-badge&label=MDN%20Security%20Score)

</div>

## Platform screenshots

![Screenshot of the main website](./readme/desktop-platform.png)

## Table of Contents

- [AROLARIU.RO Monorepo](#arolariuro-monorepo)
  - [Platform screenshots](#platform-screenshots)
  - [Table of Contents](#table-of-contents)
    - [What is this repository?](#what-is-this-repository)
  - [Setup Guide](#setup-guide)
    - [Quick Start](#quick-start)
    - [Nx Workflow Diagrams](#nx-workflow-diagrams)
      - [Build Command Flow](#build-command-flow)
      - [Development Command Flow](#development-command-flow)
      - [Test Command Flow](#test-command-flow)
    - [Project Structure](#project-structure)
    - [Advanced Nx Commands](#advanced-nx-commands)
    - [High Level Infrastructure overview (using Bicep Visualizer)](#high-level-infrastructure-overview-using-bicep-visualizer)
    - [Current CI/CD status](#current-cicd-status)
    - [Repository Statistics](#repository-statistics)
      - [Repository activity](#repository-activity)
      - [Repository contributors](#repository-contributors)

### What is this repository?

The `arolariu.ro` repository contains the open-source code for different services and workers that are running under the domain umbrella. The repository is organized as a monorepo, and it contains the following services:

- [Next.JS Production Platform](https://arolariu.ro) - is the main point of contact and the primary entry point for users.
- [Next.JS Development Platform](https://dev.arolariu.ro) - is the development platform for the main website.
- [ASP.NET (LTS) Public API](https://api.arolariu.ro) - acts as the main backend; it is able to serve REST, GraphQL, and gRPC requests.

## Setup Guide

This repository uses [Nx](https://nx.dev) as a monorepo tool to manage all projects from a unified CLI interface. This provides streamlined build, test, and development workflows across the entire codebase.

### Quick Start

```bash
# Install dependencies at root level
npm install

# Build all projects
npm run build

# Build specific projects
npm run build:website      # Main website (Next.js)
npm run build:components   # React component library
npm run build:api         # Backend API (.NET)
npm run build:cv          # CV site (SvelteKit)
npm run build:docs        # Documentation (DocFX)

# Development servers
npm run dev:website       # Start website dev server
npm run dev:components    # Start component storybook
npm run dev:api          # Start API dev server
npm run dev:cv           # Start CV dev server
npm run dev:docs         # Start docs dev server

# Testing & maintenance
npm run test             # Run all tests
npm run lint             # Lint all projects
npm run format           # Format all projects
```

### Nx Workflow Diagrams

#### Build Command Flow
```mermaid
graph TD
    A[npm run build] --> B[nx run-many --target=build --all]
    B --> C[Components Build]
    B --> D[CV Build]
    B --> E[API Build]
    B --> F[Docs Build]
    B --> G[Website Build]
    
    C --> G
    E --> F
    
    C --> H[Component Library Output]
    D --> I[CV Site Output]
    E --> J[API Binaries]
    F --> K[Documentation Site]
    G --> L[Website Output]
    
    style C fill:#e1f5fe
    style D fill:#e1f5fe
    style E fill:#fff3e0
    style F fill:#fff3e0
    style G fill:#e8f5e8
```

#### Development Command Flow
```mermaid
graph TD
    A[npm run dev] --> B[nx run-many --target=dev --all --parallel]
    B --> C[Components Storybook]
    B --> D[CV Dev Server]
    B --> E[API Dev Server]
    B --> F[Docs Dev Server]
    B --> G[Website Dev Server]
    
    C --> H[localhost:6006]
    D --> I[localhost:3001]
    E --> J[localhost:5000]
    F --> K[localhost:8080]
    G --> L[localhost:3000]
    
    style C fill:#e1f5fe
    style D fill:#e1f5fe
    style E fill:#fff3e0
    style F fill:#fff3e0
    style G fill:#e8f5e8
```

#### Test Command Flow
```mermaid
graph TD
    A[npm run test] --> B[nx run-many --target=test --all]
    B --> C[Components Tests]
    B --> D[CV Tests]
    B --> E[API Tests]
    B --> F[Website Tests]
    
    C --> G[Jest + React Testing Library]
    D --> H[Vitest + SvelteKit Testing]
    E --> I[.NET xUnit Tests]
    F --> J[Jest + Playwright E2E]
    
    G --> K[Component Test Results]
    H --> L[CV Test Results]
    I --> M[API Test Results]
    J --> N[Website Test Results]
    
    style C fill:#e1f5fe
    style D fill:#e1f5fe
    style E fill:#fff3e0
    style F fill:#e8f5e8
```

### Project Structure

```
arolariu.ro/
├── packages/
│   └── components/          # React component library
├── sites/
│   ├── arolariu.ro/        # Main website (Next.js)
│   ├── api.arolariu.ro/    # Backend API (.NET)
│   ├── cv.arolariu.ro/     # CV site (SvelteKit)
│   └── docs.arolariu.ro/   # Documentation (DocFX)
├── package.json            # Root workspace configuration
└── nx.json                 # Nx workspace configuration
```

### Advanced Nx Commands

```bash
# Show project dependency graph
npx nx graph

# Run commands only on affected projects
npx nx affected --target=build
npx nx affected --target=test

# Run specific commands
npx nx run website:build
npx nx run components:storybook
npx nx run api:dev

# Show project details
npx nx show project website
npx nx show projects --affected
```

### High Level Infrastructure overview (using Bicep Visualizer)

![High Level Infrastructure overview](./design/high-level-infra.png)

The infrastructure is deployed using Azure Bicep, and it is organized in a way that allows for easy management and scaling. The main components of the infrastructure are:

- **Azure Front Door** - acts as the main entry point for the platform, and it is able to route traffic to different services based on the request.
- **Azure App Service** - is used to host the main website and the API.
- **Azure CDN** - is used to cache and serve static content to users.
- **Azure Key Vault** - is used to store and manage secrets and certificates.
- **Azure Application Insights** - is used to monitor and track the performance of the services.
- **Azure SQL Database** - is used to store and manage the data for the API.
- **Azure Storage Account** - is used to store and manage the static files for the website.
- **Azure Monitor** - is used to monitor and track the performance of the services.
- **Azure App Configuration** - is used to store and manage the configuration settings for the services.
- **Azure Cosmos DB** - is used to store and manage the data for the API.

---

### Current CI/CD status

| Service              | Build Status                                                                                                                                                                                                                                          | Release Status                                                                                                                                                                                                                                                 |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Main Platform (DEV)  | [![website-official-build](https://github.com/arolariu/arolariu.ro/actions/workflows/website-official-build.yml/badge.svg?branch=preview&event=push)](https://github.com/arolariu/arolariu.ro/actions/workflows/website-official-build.yml)           | [![website-official-release](https://github.com/arolariu/arolariu.ro/actions/workflows/website-official-release.yml/badge.svg?branch=preview&event=workflow_dispatch)](https://github.com/arolariu/arolariu.ro/actions/workflows/website-official-release.yml) |
| Main Platform (PROD) | [![website-official-build](https://github.com/arolariu/arolariu.ro/actions/workflows/website-official-build.yml/badge.svg?branch=main&event=workflow_dispatch)](https://github.com/arolariu/arolariu.ro/actions/workflows/website-official-build.yml) | [![website-official-release](https://github.com/arolariu/arolariu.ro/actions/workflows/website-official-release.yml/badge.svg?branch=main&event=workflow_dispatch)](https://github.com/arolariu/arolariu.ro/actions/workflows/website-official-release.yml)    |
| API Platform (PROD)  | [![api-official-trigger](https://github.com/arolariu/arolariu.ro/actions/workflows/api-official-trigger.yml/badge.svg?branch=main&event=workflow_dispatch)](https://github.com/arolariu/arolariu.ro/actions/workflows/api-official-trigger.yml)       | [![api-official-trigger](https://github.com/arolariu/arolariu.ro/actions/workflows/api-official-trigger.yml/badge.svg?branch=main&event=workflow_dispatch)](https://github.com/arolariu/arolariu.ro/actions/workflows/api-official-trigger.yml)                |

> [!NOTE]
> The `PROD` environment is the production environment, and the `DEV` environment is the development environment.

---

### Repository Statistics

A lot of the information presented here is generated using the [Repography](https://repography.com) service.
The service is able to generate a lot of different badges and graphs based on the GitHub repository's activity.

The data is updated every 24 hours, and it is based on the latest available information from the GitHub API.

Time interval: [![Time period](https://images.repography.com/39125298/arolariu/arolariu.ro/recent-activity/1W5aIW8QnZQEotvdsf5oU2sHQhOpMgx1tUWkfXzX7bA/9AUN7WfNEj1mtVRPP4BM4177J7FzSpcQrJSkX4mIKbY_badge.svg)](https://repography.com)

#### Repository activity

[![Timeline graph](https://images.repography.com/39125298/arolariu/arolariu.ro/recent-activity/1W5aIW8QnZQEotvdsf5oU2sHQhOpMgx1tUWkfXzX7bA/9AUN7WfNEj1mtVRPP4BM4177J7FzSpcQrJSkX4mIKbY_timeline.svg)](https://github.com/arolariu/arolariu.ro/commits)

[![Issue status graph](https://images.repography.com/39125298/arolariu/arolariu.ro/recent-activity/1W5aIW8QnZQEotvdsf5oU2sHQhOpMgx1tUWkfXzX7bA/9AUN7WfNEj1mtVRPP4BM4177J7FzSpcQrJSkX4mIKbY_issues.svg)](https://github.com/arolariu/arolariu.ro/issues)

[![Pull request status graph](https://images.repography.com/39125298/arolariu/arolariu.ro/recent-activity/1W5aIW8QnZQEotvdsf5oU2sHQhOpMgx1tUWkfXzX7bA/9AUN7WfNEj1mtVRPP4BM4177J7FzSpcQrJSkX4mIKbY_prs.svg)](https://github.com/arolariu/arolariu.ro/pulls)

[![Trending topics](https://images.repography.com/39125298/arolariu/arolariu.ro/recent-activity/1W5aIW8QnZQEotvdsf5oU2sHQhOpMgx1tUWkfXzX7bA/9AUN7WfNEj1mtVRPP4BM4177J7FzSpcQrJSkX4mIKbY_words.svg)](https://github.com/arolariu/arolariu.ro/commits)

[![Top contributors](https://images.repography.com/39125298/arolariu/arolariu.ro/recent-activity/1W5aIW8QnZQEotvdsf5oU2sHQhOpMgx1tUWkfXzX7bA/9AUN7WfNEj1mtVRPP4BM4177J7FzSpcQrJSkX4mIKbY_users.svg)](https://github.com/arolariu/arolariu.ro/graphs/contributors)

[![Activity map](https://images.repography.com/39125298/arolariu/arolariu.ro/recent-activity/1W5aIW8QnZQEotvdsf5oU2sHQhOpMgx1tUWkfXzX7bA/9AUN7WfNEj1mtVRPP4BM4177J7FzSpcQrJSkX4mIKbY_map.svg)](https://github.com/arolariu/arolariu.ro/commits)

#### Repository contributors

Here is a list that contains the top contributors to the repository.

[![Top contributors](https://images.repography.com/39125298/arolariu/arolariu.ro/top-contributors/1W5aIW8QnZQEotvdsf5oU2sHQhOpMgx1tUWkfXzX7bA/9AUN7WfNEj1mtVRPP4BM4177J7FzSpcQrJSkX4mIKbY_table.svg)](https://github.com/arolariu/arolariu.ro/graphs/contributors)
