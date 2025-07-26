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

## 🚀 Unified CLI Commands

This monorepo provides a unified CLI interface for managing all projects from the root directory. All commands can be run from the repository root without needing to navigate between individual project directories.

### 📋 Quick Start

```bash
# Show all available commands
npm run help

# Install dependencies for all projects
npm run setup

# Build all projects
npm run build

# Clean all build artifacts
npm run clean
```

### 🏗️ Build Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Build all projects sequentially |
| `npm run build:parallel` | Instructions for parallel building |
| `npm run build:components` | Build React component library only |
| `npm run build:website` | Build Next.js website only |
| `npm run build:docs` | Build DocFX documentation only |
| `npm run build:api` | Build .NET API backend only |

### 🧹 Maintenance Commands

| Command | Description |
|---------|-------------|
| `npm run clean` | Clean all build artifacts across projects |
| `npm run setup` | Install dependencies for all projects |

### 🛠️ Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev:components` | Start Storybook development server |
| `npm run test` | Run tests across all projects |
| `npm run lint` | Lint all projects |
| `npm run format` | Format code across all projects |

### 📊 Utility Commands

| Command | Description |
|---------|-------------|
| `npm run status` | Show build status across all projects |
| `npm run help` | Display available commands |

### 📁 Project Structure

```
├── packages/
│   └── components/          # React component library (@arolariu/components)
├── sites/
│   ├── arolariu.ro/        # Next.js website (main platform)
│   ├── api.arolariu.ro/    # .NET API backend 
│   └── docs.arolariu.ro/   # DocFX documentation
├── package.json            # Root package.json with unified CLI
└── README.md              # This file
```

### 🔧 Prerequisites

- **Node.js** ≥ 20.0 (for website and components)
- **npm** (package manager)
- **.NET 9.0 SDK** (for API backend)
- **DocFX** (for documentation building)

### 💡 Individual Project Development

You can still work on individual projects by navigating to their directories:

```bash
# Work on components
cd packages/components
npm run storybook

# Work on website  
cd sites/arolariu.ro
npm run dev

# Work on API
cd sites/api.arolariu.ro
dotnet run

# Work on documentation
cd sites/docs.arolariu.ro
docfx serve
```

### 🔄 CI/CD Compatibility

All existing CI/CD workflows remain fully functional. The unified CLI is designed for local development convenience and doesn't affect production build processes.

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
