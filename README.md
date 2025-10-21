<div align="center">

<img width="400" src="readme/logo.png" alt="arolariu.ro logo">

# 🚀 AROLARIU.RO Monorepo

### A Modern, Production-Grade Full-Stack Platform

<br/>

<!-- Activity & Engagement Stats -->
<div align="center">

![GitHub commit activity](https://img.shields.io/github/commit-activity/m/arolariu/arolariu.ro?style=for-the-badge&logo=github&label=Monthly%20Commits&color=blue)
![GitHub last commit](https://img.shields.io/github/last-commit/arolariu/arolariu.ro?style=for-the-badge&logo=git&label=Last%20Commit)
![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/arolariu/arolariu.ro/official-website-build.yml?style=for-the-badge&logo=githubactions&label=Build)

</div>

<!-- Code Quality & Size Stats -->
<div align="center">

![Lines of code](https://aschey.tech/tokei/github/arolariu/arolariu.ro?style=for-the-badge&label=Lines%20of%20Code&color=orange)
![GitHub code size](https://img.shields.io/github/languages/code-size/arolariu/arolariu.ro?style=for-the-badge&logo=files&color=yellow)
![GitHub repo size](https://img.shields.io/github/repo-size/arolariu/arolariu.ro?style=for-the-badge&logo=database&label=Repo%20Size)
![GitHub language count](https://img.shields.io/github/languages/count/arolariu/arolariu.ro?style=for-the-badge&logo=typescript&label=Languages)

</div>

<!-- Security & Performance Stats -->
<div align="center">

![Qualys SSL/TLS Grade](http://img.shields.io/badge/SSL%2FTLS-A%2B-brightgreen.svg?style=for-the-badge&logo=letsencrypt&logoColor=white)
![Mozilla HTTP Observatory Grade](https://img.shields.io/mozilla-observatory/grade/arolariu.ro?style=for-the-badge&logo=mozilla&label=Security%20Score)
![Uptime](https://img.shields.io/badge/Uptime-99.9%25-success?style=for-the-badge&logo=statuspage&logoColor=white)

</div>

<!-- Technology Stack Badges -->
<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16.0-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![.NET](https://img.shields.io/badge/.NET-10.0-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)
![Azure](https://img.shields.io/badge/Azure-Cloud-0078D4?style=for-the-badge&logo=microsoftazure&logoColor=white)

</div>

<!-- Social & Community Stats -->
<div align="center">

![GitHub followers](https://img.shields.io/github/followers/arolariu?style=for-the-badge&logo=github&label=Followers)
![GitHub stars](https://img.shields.io/github/stars/arolariu/arolariu.ro?style=for-the-badge&logo=starship&color=yellow&label=Stars)
![GitHub forks](https://img.shields.io/github/forks/arolariu/arolariu.ro?style=for-the-badge&logo=git&label=Forks)
![GitHub watchers](https://img.shields.io/github/watchers/arolariu/arolariu.ro?style=for-the-badge&logo=eyes&label=Watchers)

</div>

<br/>

---

</div>

## 📸 Platform Preview

<div align="center">
<img src="./readme/desktop-platform.png" alt="Platform Screenshot" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

*Production-ready platform with modern UI/UX*

</div>

---

## 📋 Table of Contents

- [🚀 AROLARIU.RO Monorepo](#-arolariuro-monorepo)
    - [A Modern, Production-Grade Full-Stack Platform](#a-modern-production-grade-full-stack-platform)
  - [📸 Platform Preview](#-platform-preview)
  - [📋 Table of Contents](#-table-of-contents)
  - [🎯 What is This Repository?](#-what-is-this-repository)
    - [🌐 Live Services](#-live-services)
    - [✨ Key Features](#-key-features)
  - [⚡ Setup Guide](#-setup-guide)
    - [Quick Start](#quick-start)
    - [Project Structure](#project-structure)
    - [Advanced Nx Commands](#advanced-nx-commands)
  - [🏗️ Infrastructure Overview](#️-infrastructure-overview)
    - [☁️ Azure Components](#️-azure-components)
    - [🎯 Key Infrastructure Features](#-key-infrastructure-features)
  - [🔄 CI/CD Pipeline Status](#-cicd-pipeline-status)
    - [🌐 Website Pipelines](#-website-pipelines)
    - [⚙️ API Pipelines](#️-api-pipelines)
    - [🎯 Pipeline Features](#-pipeline-features)
  - [📊 Repository Statistics](#-repository-statistics)
    - [Activity Metrics](#activity-metrics)
      - [📅 Commit Timeline](#-commit-timeline)
      - [🐛 Issue Activity](#-issue-activity)
      - [🔀 Pull Request Activity](#-pull-request-activity)
      - [💬 Trending Topics](#-trending-topics)
      - [👥 Recent Contributors](#-recent-contributors)
      - [🗺️ Development Heatmap](#️-development-heatmap)
    - [Top Contributors](#top-contributors)
    - [🌟 Star History](#-star-history)
    - [💖 Support This Project](#-support-this-project)

---

## 🎯 What is This Repository?

The **arolariu.ro** monorepo is a comprehensive full-stack platform built with modern technologies and best practices. It showcases enterprise-grade architecture, clean code principles, and production-ready deployment strategies.

### 🌐 Live Services

| Service | URL | Technology | Purpose |
|---------|-----|------------|---------|
| 🎨 **Production Platform** | [arolariu.ro](https://arolariu.ro) | Next.js 16 + React 19 | Main website and user interface |
| 🔧 **Development Platform** | [dev.arolariu.ro](https://dev.arolariu.ro) | Next.js 16 + React 19 | Development environment |
| 🚀 **Public API** | [api.arolariu.ro](https://api.arolariu.ro) | .NET 10 (LTS) | REST, GraphQL & gRPC backend |
| 📄 **CV/Resume** | [cv.arolariu.ro](https://cv.arolariu.ro) | SvelteKit 2 | Personal CV website |
| 📚 **Documentation** | [docs.arolariu.ro](https://docs.arolariu.ro) | DocFX | Technical documentation |

### ✨ Key Features

- 🏛️ **Domain-Driven Design** - Clean architecture with well-defined bounded contexts
- 📊 **OpenTelemetry Integration** - Full observability with distributed tracing
- 🔒 **Enterprise Security** - SSL/TLS A+ rating, comprehensive security headers
- ⚡ **High Performance** - Optimized for speed with CDN, caching, and SSR/SSG
- 🧪 **Comprehensive Testing** - Unit, integration, and E2E tests with high coverage
- 🔄 **CI/CD Automation** - Automated builds, tests, and deployments
- 📦 **Nx Monorepo** - Efficient workspace management and build optimization

## ⚡ Setup Guide

> 🚀 **Powered by [Nx](https://nx.dev)** - Enterprise-grade monorepo tooling for streamlined development workflows

### Quick Start

<details open>
<summary><b>📦 Installation & Build Commands</b></summary>

```bash
# 1️⃣ Install dependencies (root level)
npm install

# 2️⃣ Build all projects
npm run build

# 3️⃣ Build specific projects
npm run build:website      # 🌐 Main website (Next.js)
npm run build:components   # 🧩 React component library
npm run build:api         # ⚙️ Backend API (.NET)
npm run build:cv          # 📄 CV site (SvelteKit)
npm run build:docs        # 📚 Documentation (DocFX)
```

</details>

<details open>
<summary><b>🔥 Development Commands</b></summary>

```bash
# Start development servers
npm run dev:website       # 🌐 Website → http://localhost:3000
npm run dev:components    # 🧩 Storybook → http://localhost:6006
npm run dev:api          # ⚙️ API → http://localhost:5000
npm run dev:cv           # 📄 CV → http://localhost:4173
npm run dev:docs         # 📚 Docs → http://localhost:8080
```

</details>

<details>
<summary><b>🧪 Testing & Quality Commands</b></summary>

```bash
npm run test             # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage reports
npm run lint             # Lint all projects
npm run format           # Format code with Prettier
```

</details>

### Project Structure

```plaintext
arolariu.ro/                    # 🏠 Monorepo root
├── 📦 packages/
│   └── components/            # 🧩 Shared React component library
│       ├── src/              # Component source code
│       ├── stories/          # Storybook stories
│       └── package.json
│
├── 🌐 sites/
│   ├── arolariu.ro/          # 🎨 Main Next.js website
│   │   ├── src/
│   │   │   ├── app/          # Next.js App Router
│   │   │   ├── components/   # UI components
│   │   │   ├── hooks/        # Custom React hooks
│   │   │   └── lib/          # Utilities
│   │   └── package.json
│   │
│   ├── api.arolariu.ro/      # ⚙️ .NET Backend API
│   │   ├── src/
│   │   │   └── Domain/       # DDD domains
│   │   │       ├── General/
│   │   │       ├── Invoices/
│   │   │       └── Auth/
│   │   └── tests/
│   │
│   ├── cv.arolariu.ro/       # 📄 SvelteKit CV
│   ├── docs.arolariu.ro/     # 📚 DocFX Documentation
│   └── ...
│
├── 🏗️ infra/
│   └── Azure/
│       └── Bicep/            # Infrastructure as Code
│
├── 📜 scripts/               # Build & utility scripts
├── 🔧 nx.json               # Nx workspace config
└── 📦 package.json          # Root dependencies

```

### Advanced Nx Commands

<details>
<summary><b>🎯 Optimization & Analysis</b></summary>

```bash
# 📊 Visualize project dependency graph
npx nx graph

# 🎯 Run tasks only on affected projects
npx nx affected --target=build
npx nx affected --target=test
npx nx affected --target=lint

# 🔍 Show project details
npx nx show project website
npx nx show projects --affected

# 🚀 Run specific project commands
npx nx run website:build
npx nx run components:storybook
npx nx run api:dev
```

</details>

## 🏗️ Infrastructure Overview

<div align="center">

![Infrastructure Architecture](./design/high-level-infra.png)

*Azure Cloud Architecture - Deployed using Infrastructure as Code (Bicep)*

</div>

### ☁️ Azure Components

| Component | Purpose | Technology |
|-----------|---------|------------|
| 🌐 **Azure Front Door** | Global entry point & traffic routing | CDN + WAF |
| 🖥️ **Azure App Service** | Host website & API containers | Docker + Linux |
| 📦 **Azure CDN** | Static content delivery & caching | Edge locations |
| 🔐 **Azure Key Vault** | Secrets & certificate management | HSM-backed |
| 📊 **Application Insights** | APM & distributed tracing | OpenTelemetry |
| 🗄️ **Azure SQL Database** | Relational data storage | PaaS SQL |
| 🌍 **Azure Cosmos DB** | NoSQL document database | Multi-region |
| 💾 **Azure Storage** | Blob storage for static files | ZRS redundancy |
| 🎛️ **App Configuration** | Feature flags & settings | Managed service |
| 📈 **Azure Monitor** | Metrics, logs & alerting | Full observability |

### 🎯 Key Infrastructure Features

- ✅ **High Availability** - Multi-region deployment with automatic failover
- ✅ **Auto-scaling** - Dynamic resource allocation based on demand
- ✅ **Zero-downtime Deployments** - Blue-green deployment strategy
- ✅ **Infrastructure as Code** - Fully automated provisioning with Bicep
- ✅ **Security Hardening** - Private endpoints, managed identities, SSL/TLS A+
- ✅ **Observability** - Comprehensive logging, metrics, and distributed tracing

---

## 🔄 CI/CD Pipeline Status

<div align="center">

### 🌐 Website Pipelines

</div>

| Environment | Branch | Build | Release | Deployment |
|-------------|--------|-------|---------|------------|
| 🟢 **Production** | `main` | [![Build](https://github.com/arolariu/arolariu.ro/actions/workflows/official-website-build.yml/badge.svg?branch=main)](https://github.com/arolariu/arolariu.ro/actions/workflows/official-website-build.yml) | [![Release](https://github.com/arolariu/arolariu.ro/actions/workflows/official-website-release.yml/badge.svg?branch=main)](https://github.com/arolariu/arolariu.ro/actions/workflows/official-website-release.yml) | [arolariu.ro](https://arolariu.ro) |
| 🟡 **Development** | `preview` | [![Build](https://github.com/arolariu/arolariu.ro/actions/workflows/official-website-build.yml/badge.svg?branch=preview)](https://github.com/arolariu/arolariu.ro/actions/workflows/official-website-build.yml) | [![Release](https://github.com/arolariu/arolariu.ro/actions/workflows/official-website-release.yml/badge.svg?branch=preview)](https://github.com/arolariu/arolariu.ro/actions/workflows/official-website-release.yml) | [dev.arolariu.ro](https://dev.arolariu.ro) |

<div align="center">

### ⚙️ API Pipelines

</div>

| Environment | Branch | Build & Deploy | Endpoint |
|-------------|--------|----------------|----------|
| 🟢 **Production** | `main` | [![API](https://github.com/arolariu/arolariu.ro/actions/workflows/official-api-trigger.yml/badge.svg?branch=main)](https://github.com/arolariu/arolariu.ro/actions/workflows/official-api-trigger.yml) | [api.arolariu.ro](https://api.arolariu.ro) |

### 🎯 Pipeline Features

- ✅ **Automated Testing** - Unit, integration & E2E tests on every commit
- ✅ **Code Quality Gates** - ESLint, Prettier, SonarQube analysis
- ✅ **Security Scanning** - Dependency vulnerability checks
- ✅ **Docker Containerization** - Multi-stage builds with layer caching
- ✅ **Blue-Green Deployments** - Zero-downtime releases
- ✅ **Automatic Rollbacks** - Health check failures trigger rollback
- ✅ **Environment Promotion** - Preview → Production workflow

---

## 📊 Repository Statistics

> 📈 **Powered by [Repography](https://repography.com)** - Advanced analytics updated every 24 hours from GitHub API

<div align="center">

[![Time period](https://images.repography.com/39125298/arolariu/arolariu.ro/recent-activity/1W5aIW8QnZQEotvdsf5oU2sHQhOpMgx1tUWkfXzX7bA/9AUN7WfNEj1mtVRPP4BM4177J7FzSpcQrJSkX4mIKbY_badge.svg)](https://repography.com)

</div>

### Activity Metrics

<div align="center">

#### 📅 Commit Timeline

[![Timeline graph](https://images.repography.com/39125298/arolariu/arolariu.ro/recent-activity/1W5aIW8QnZQEotvdsf5oU2sHQhOpMgx1tUWkfXzX7bA/9AUN7WfNEj1mtVRPP4BM4177J7FzSpcQrJSkX4mIKbY_timeline.svg)](https://github.com/arolariu/arolariu.ro/commits)

</div>

<div align="center">

#### 🐛 Issue Activity

[![Issue status graph](https://images.repography.com/39125298/arolariu/arolariu.ro/recent-activity/1W5aIW8QnZQEotvdsf5oU2sHQhOpMgx1tUWkfXzX7bA/9AUN7WfNEj1mtVRPP4BM4177J7FzSpcQrJSkX4mIKbY_issues.svg)](https://github.com/arolariu/arolariu.ro/issues)

</div>

<div align="center">

#### 🔀 Pull Request Activity

[![Pull request status graph](https://images.repography.com/39125298/arolariu/arolariu.ro/recent-activity/1W5aIW8QnZQEotvdsf5oU2sHQhOpMgx1tUWkfXzX7bA/9AUN7WfNEj1mtVRPP4BM4177J7FzSpcQrJSkX4mIKbY_prs.svg)](https://github.com/arolariu/arolariu.ro/pulls)

</div>

<div align="center">

#### 💬 Trending Topics

[![Trending topics](https://images.repography.com/39125298/arolariu/arolariu.ro/recent-activity/1W5aIW8QnZQEotvdsf5oU2sHQhOpMgx1tUWkfXzX7bA/9AUN7WfNEj1mtVRPP4BM4177J7FzSpcQrJSkX4mIKbY_words.svg)](https://github.com/arolariu/arolariu.ro/commits)

</div>

<div align="center">

#### 👥 Recent Contributors

[![Top contributors](https://images.repography.com/39125298/arolariu/arolariu.ro/recent-activity/1W5aIW8QnZQEotvdsf5oU2sHQhOpMgx1tUWkfXzX7bA/9AUN7WfNEj1mtVRPP4BM4177J7FzSpcQrJSkX4mIKbY_users.svg)](https://github.com/arolariu/arolariu.ro/graphs/contributors)

</div>

<div align="center">

#### 🗺️ Development Heatmap

[![Activity map](https://images.repography.com/39125298/arolariu/arolariu.ro/recent-activity/1W5aIW8QnZQEotvdsf5oU2sHQhOpMgx1tUWkfXzX7bA/9AUN7WfNEj1mtVRPP4BM4177J7FzSpcQrJSkX4mIKbY_map.svg)](https://github.com/arolariu/arolariu.ro/commits)

</div>

---

### Top Contributors

<div align="center">

[![Top contributors](https://images.repography.com/39125298/arolariu/arolariu.ro/top-contributors/1W5aIW8QnZQEotvdsf5oU2sHQhOpMgx1tUWkfXzX7bA/9AUN7WfNEj1mtVRPP4BM4177J7FzSpcQrJSkX4mIKbY_table.svg)](https://github.com/arolariu/arolariu.ro/graphs/contributors)

</div>

---

<div align="center">

### 🌟 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=arolariu/arolariu.ro&type=Date)](https://star-history.com/#arolariu/arolariu.ro&Date)

</div>

---

<div align="center">

### 💖 Support This Project

If you find this project useful, please consider giving it a ⭐ star on GitHub!

[![GitHub stars](https://img.shields.io/github/stars/arolariu/arolariu.ro?style=social)](https://github.com/arolariu/arolariu.ro/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/arolariu/arolariu.ro?style=social)](https://github.com/arolariu/arolariu.ro/network/members)
[![GitHub watchers](https://img.shields.io/github/watchers/arolariu/arolariu.ro?style=social)](https://github.com/arolariu/arolariu.ro/watchers)

**[⬆ Back to Top](#-arolariuro-monorepo)**

</div>
