<!-- Back to top anchor -->
<a id="readme-top"></a>

<!-- PROJECT BANNER -->
<div align="center">

<!-- Animated header with gradient background simulation using table -->
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="readme/logo.png">
  <source media="(prefers-color-scheme: light)" srcset="readme/logo.png">
  <img width="400" src="readme/logo.png" alt="arolariu.ro logo">
</picture>

<br/>
<br/>

# ✨ AROLARIU.RO Monorepo

### 🏆 A Modern, Production-Grade Full-Stack Platform

<br/>

<!-- Quick action links -->
<p align="center">
  <a href="https://arolariu.ro"><strong>🌐 View Live Site »</strong></a>
  &nbsp;&nbsp;·&nbsp;&nbsp;
  <a href="https://api.arolariu.ro/swagger"><strong>📡 Explore API »</strong></a>
  &nbsp;&nbsp;·&nbsp;&nbsp;
  <a href="https://docs.arolariu.ro"><strong>📚 Read Docs »</strong></a>
</p>

<p align="center">
  <a href="https://github.com/arolariu/arolariu.ro/issues/new?labels=bug&template=bug-report.md">🐛 Report Bug</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/arolariu/arolariu.ro/issues/new?labels=enhancement&template=feature-request.md">💡 Request Feature</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/arolariu/arolariu.ro/discussions">💬 Discussions</a>
</p>

<br/>

<!-- Primary Status Badges -->
[![Build Status][build-shield]][build-url]
[![License][license-shield]][license-url]
[![Contributors][contributors-shield]][contributors-url]
[![Issues][issues-shield]][issues-url]
[![PRs Welcome][prs-shield]][prs-url]

<!-- Metrics Badges Row -->
<br/>

![Lines of code](https://aschey.tech/tokei/github/arolariu/arolariu.ro?style=flat-square&label=Lines%20of%20Code&color=orange)
![GitHub commit activity](https://img.shields.io/github/commit-activity/m/arolariu/arolariu.ro?style=flat-square&logo=github&label=Commits/Month)
![GitHub last commit](https://img.shields.io/github/last-commit/arolariu/arolariu.ro?style=flat-square&logo=git&label=Last%20Commit)
![GitHub repo size](https://img.shields.io/github/repo-size/arolariu/arolariu.ro?style=flat-square&logo=database&label=Repo%20Size)

<!-- Quality & Security Badges -->
<br/>

![Qualys SSL/TLS Grade](http://img.shields.io/badge/SSL%2FTLS-A%2B-brightgreen.svg?style=flat-square&logo=letsencrypt&logoColor=white)
![Mozilla HTTP Observatory Grade](https://img.shields.io/mozilla-observatory/grade/arolariu.ro?style=flat-square&logo=mozilla&label=Security)
![Uptime](https://img.shields.io/badge/Uptime-99.9%25-success?style=flat-square&logo=statuspage&logoColor=white)
![Lighthouse Performance](https://img.shields.io/badge/Lighthouse-95%2B-success?style=flat-square&logo=lighthouse&logoColor=white)

<br/>

---

### 🛠️ Built With

<p align="center">
  <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-16.0-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js"/></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React"/></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/></a>
  <a href="https://dotnet.microsoft.com"><img src="https://img.shields.io/badge/.NET-10.0-512BD4?style=for-the-badge&logo=dotnet&logoColor=white" alt=".NET"/></a>
</p>

<p align="center">
  <a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/Tailwind-4.1-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS"/></a>
  <a href="https://azure.microsoft.com"><img src="https://img.shields.io/badge/Azure-Cloud-0078D4?style=for-the-badge&logo=microsoftazure&logoColor=white" alt="Azure"/></a>
  <a href="https://nx.dev"><img src="https://img.shields.io/badge/Nx-Monorepo-143055?style=for-the-badge&logo=nx&logoColor=white" alt="Nx"/></a>
  <a href="https://www.docker.com"><img src="https://img.shields.io/badge/Docker-Container-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker"/></a>
</p>

---

</div>

<!-- PLATFORM PREVIEW -->
## 📸 Platform Preview

<div align="center">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./readme/desktop-platform.png">
  <source media="(prefers-color-scheme: light)" srcset="./readme/desktop-platform.png">
  <img src="./readme/desktop-platform.png" alt="Platform Screenshot" width="90%" style="border-radius: 12px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);">
</picture>

<br/>
<br/>

*🎨 Production-ready platform featuring modern UI/UX with dark mode support*

</div>

---

<!-- TABLE OF CONTENTS -->
## 📋 Table of Contents

<details open>
<summary><b>Click to expand/collapse</b></summary>

- [✨ AROLARIU.RO Monorepo](#-arolariuro-monorepo)
    - [🏆 A Modern, Production-Grade Full-Stack Platform](#-a-modern-production-grade-full-stack-platform)
    - [🛠️ Built With](#️-built-with)
  - [📸 Platform Preview](#-platform-preview)
  - [📋 Table of Contents](#-table-of-contents)
  - [🎯 About The Project](#-about-the-project)
    - [🌐 Live Services](#-live-services)
    - [✨ Key Features](#-key-features)
  - [🚀 Getting Started](#-getting-started)
    - [Prerequisites](#prerequisites)
    - [Quick Start](#quick-start)
    - [Development Commands](#development-commands)
  - [📂 Project Structure](#-project-structure)
  - [🏗️ Architecture](#️-architecture)
    - [High-Level Overview](#high-level-overview)
    - [Azure Infrastructure](#azure-infrastructure)
  - [🔄 CI/CD Pipeline](#-cicd-pipeline)
    - [🌐 Website Pipelines](#-website-pipelines)
    - [⚙️ API Pipeline](#️-api-pipeline)
  - [🗺️ Roadmap](#️-roadmap)
  - [🤖 AI-Powered Development](#-ai-powered-development)
  - [📊 Repository Analytics](#-repository-analytics)
  - [🤝 Contributing](#-contributing)
    - [👥 Top Contributors](#-top-contributors)
  - [📜 License](#-license)
  - [📞 Contact](#-contact)
  - [🙏 Acknowledgments](#-acknowledgments)
    - [💖 Support This Project](#-support-this-project)

</details>

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

<!-- ABOUT THE PROJECT -->
## 🎯 About The Project

The **arolariu.ro** monorepo is a comprehensive full-stack platform built with cutting-edge technologies and enterprise-grade best practices. It demonstrates modern software architecture patterns including:

- 🏛️ **Domain-Driven Design (DDD)** with well-defined bounded contexts
- 📦 **Modular Monolith** architecture for scalable backend services
- ⚡ **React Server Components** for optimal frontend performance
- 🔒 **Zero Trust Security** with managed identities and RBAC
- 📊 **Full Observability** with OpenTelemetry distributed tracing

> [!TIP]
> **New to this project?** Start with the [Getting Started](#-getting-started) section, then explore the [Architecture](#️-architecture) to understand the system design.

### 🌐 Live Services

<div align="center">

| Service | Status | URL | Technology | Purpose |
|:-------:|:------:|:---:|:----------:|:-------:|
| 🎨 **Production** | ![Status](https://img.shields.io/badge/status-live-success?style=flat-square) | [arolariu.ro](https://arolariu.ro) | Next.js 16 + React 19 | Main platform |
| 🔧 **Development** | ![Status](https://img.shields.io/badge/status-live-success?style=flat-square) | [dev.arolariu.ro](https://dev.arolariu.ro) | Next.js 16 + React 19 | Preview environment |
| 🚀 **API** | ![Status](https://img.shields.io/badge/status-live-success?style=flat-square) | [api.arolariu.ro](https://api.arolariu.ro) | .NET 10 (LTS) | REST, GraphQL & gRPC |
| 📄 **CV/Resume** | ![Status](https://img.shields.io/badge/status-live-success?style=flat-square) | [cv.arolariu.ro](https://cv.arolariu.ro) | SvelteKit 2 | Personal CV |
| 📚 **Documentation** | ![Status](https://img.shields.io/badge/status-live-success?style=flat-square) | [docs.arolariu.ro](https://docs.arolariu.ro) | DocFX | Technical docs |

</div>

### ✨ Key Features

<div align="center">

| Category | Features |
|:--------:|:---------|
| 🏛️ **Architecture** | Domain-Driven Design • Modular Monolith • SOLID Principles • The Standard |
| ⚡ **Performance** | React Server Components • Edge Caching • CDN Optimization • Lazy Loading |
| 🔒 **Security** | SSL/TLS A+ • CSP Headers • RBAC • Managed Identities • OIDC |
| 📊 **Observability** | OpenTelemetry • Distributed Tracing • Application Insights • Grafana |
| 🧪 **Quality** | 85%+ Test Coverage • ESLint (20+ plugins) • TypeScript Strict • Prettier |
| 🔄 **CI/CD** | GitHub Actions • Blue-Green Deploys • Auto-rollback • Container Registry |
| 🌍 **i18n** | Multi-language Support • Type-safe Translations • RTL Support |
| 📦 **Monorepo** | Nx Workspace • Shared Components • Incremental Builds • Affected Commands |

</div>

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

<!-- GETTING STARTED -->
## 🚀 Getting Started

> 💡 **Powered by [Nx](https://nx.dev)** — Enterprise-grade monorepo tooling for streamlined development workflows

### Prerequisites

Before you begin, ensure you have the following installed:

| Tool | Version | Purpose |
|:----:|:-------:|:--------|
| ![Node.js](https://img.shields.io/badge/Node.js-24%2B-339933?style=flat-square&logo=nodedotjs&logoColor=white) | ≥24.x | JavaScript runtime |
| ![npm](https://img.shields.io/badge/npm-10%2B-CB3837?style=flat-square&logo=npm&logoColor=white) | ≥10.x | Package manager |
| ![.NET](https://img.shields.io/badge/.NET-10.0-512BD4?style=flat-square&logo=dotnet&logoColor=white) | 10.0 | Backend runtime |
| ![Docker](https://img.shields.io/badge/Docker-Latest-2496ED?style=flat-square&logo=docker&logoColor=white) | Latest | Containerization (optional) |

### Quick Start

```bash
# 1️⃣ Clone the repository
git clone https://github.com/arolariu/arolariu.ro.git
cd arolariu.ro

# 2️⃣ Install dependencies
npm install

# 3️⃣ Run initial setup (generates env files, i18n, GraphQL)
npm run setup

# 4️⃣ Start development server
npm run dev:website
```

### Development Commands

<details open>
<summary><b>📦 Build Commands</b></summary>

```bash
npm run build              # Build all projects
npm run build:website      # 🌐 Main website (Next.js)
npm run build:components   # 🧩 React component library
npm run build:api          # ⚙️ Backend API (.NET)
npm run build:cv           # 📄 CV site (SvelteKit)
npm run build:docs         # 📚 Documentation (DocFX)
```

</details>

<details open>
<summary><b>🔥 Development Servers</b></summary>

```bash
npm run dev:website        # 🌐 Website → http://localhost:3000
npm run dev:components     # 🧩 Storybook → http://localhost:6006
npm run dev:api            # ⚙️ API → http://localhost:5000
npm run dev:cv             # 📄 CV → http://localhost:4173
npm run dev:docs           # 📚 Docs → http://localhost:8080
```

</details>

<details>
<summary><b>🧪 Testing & Quality</b></summary>

```bash
npm run test               # Run all tests
npm run test:unit          # Unit tests only
npm run test:e2e           # End-to-end tests
npm run lint               # ESLint (20+ plugins)
npm run format             # Prettier formatting
```

</details>

<details>
<summary><b>🎯 Advanced Nx Commands</b></summary>

```bash
npx nx graph               # 📊 Visualize project dependencies
npx nx affected --target=build   # 🎯 Build only affected projects
npx nx affected --target=test    # 🧪 Test only affected projects
npx nx show project website      # 🔍 Show project details
```

</details>

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

<!-- PROJECT STRUCTURE -->
## 📂 Project Structure

```plaintext
arolariu.ro/
├── 📦 packages/                    # Shared libraries
│   └── components/                 # 🧩 React component library (shadcn/ui + custom)
│       ├── src/                    #    Component source code
│       └── stories/                #    Storybook stories
│
├── 🌐 sites/                       # Applications
│   ├── arolariu.ro/                # 🎨 Main Next.js website
│   │   ├── src/
│   │   │   ├── app/                #    Next.js App Router
│   │   │   ├── components/         #    UI components
│   │   │   ├── hooks/              #    Custom React hooks
│   │   │   ├── lib/                #    Utilities & helpers
│   │   │   └── types/              #    TypeScript definitions
│   │   └── public/                 #    Static assets
│   │
│   ├── api.arolariu.ro/            # ⚙️ .NET Backend API
│   │   ├── src/Domain/             #    DDD bounded contexts
│   │   │   ├── General/            #    Infrastructure domain
│   │   │   ├── Invoices/           #    Business domain
│   │   │   └── Auth/               #    Authentication domain
│   │   └── tests/                  #    Unit & integration tests
│   │
│   ├── cv.arolariu.ro/             # 📄 SvelteKit CV/Resume
│   └── docs.arolariu.ro/           # 📚 DocFX Documentation
│
├── 🏗️ infra/Azure/Bicep/          # Infrastructure as Code
│   ├── main.bicep                  #    Entry point (subscription scope)
│   ├── facade.bicep                #    Resource group orchestrator
│   └── [modules]/                  #    Modular infrastructure
│
├── 📜 scripts/                     # Build & utility scripts
├── 📖 docs/                        # Architecture documentation & RFCs
└── 🔧 Configuration Files
    ├── nx.json                     # Nx workspace config
    ├── eslint.config.ts            # ESLint configuration
    └── tsconfig.json               # TypeScript configuration
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

<!-- ARCHITECTURE -->
## 🏗️ Architecture

### High-Level Overview

This platform follows a **modular monolith** architecture deployed on **Microsoft Azure**. The architecture emphasizes:

- **Separation of Concerns** — Clear boundaries between frontend, backend, and infrastructure
- **Domain-Driven Design** — Business logic organized by bounded contexts
- **Infrastructure as Code** — Fully reproducible Azure deployment via Bicep
- **Observability First** — OpenTelemetry integration from day one

<div align="center">

<img src="./design/high-level-infra.png" alt="Infrastructure Architecture" width="85%" style="border-radius: 12px;">

<br/>

*Azure Cloud Architecture — Deployed using Infrastructure as Code (Bicep)*

</div>

### Azure Infrastructure

<details>
<summary><b>☁️ Azure Components (Click to expand)</b></summary>

<br/>

| Layer | Components | Purpose |
|:-----:|:-----------|:--------|
| 🌐 **Networking** | Azure Front Door, DNS Zone | Global CDN, WAF, traffic routing |
| 🖥️ **Compute** | App Service Plans (2x) | Production & Development hosting |
| 🌍 **Sites** | App Services (3x), Static Web Apps (2x) | Web applications |
| 🔐 **Identity** | User-Assigned Managed Identities (3x) | Zero-trust security |
| ⚙️ **Configuration** | Key Vault, App Configuration | Secrets & feature flags |
| 📦 **Storage** | Blob Storage, SQL Server, Cosmos DB, ACR | Data persistence |
| 📊 **Observability** | Log Analytics, App Insights, Grafana | Monitoring & alerting |
| 🤖 **AI** | Azure OpenAI, AI Foundry | GPT models & ML capabilities |

</details>

<details>
<summary><b>📐 Infrastructure Diagram (ASCII)</b></summary>

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AZURE SUBSCRIPTION (swedencentral)                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────┐      ┌─────────────────────┐                     │
│   │   Azure Front Door  │─────▶│      DNS Zone       │                     │
│   │   (CDN + WAF)       │      │   (arolariu.ro)     │                     │
│   └─────────┬───────────┘      └─────────────────────┘                     │
│             │                                                               │
│             ▼                                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                        🌍 WEBSITES LAYER                             │  │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │  │
│   │  │arolariu.ro  │  │api.arolariu │  │docs.arolariu│  │cv.arolariu │  │  │
│   │  │  (Next.js)  │  │   (.NET)    │  │   (DocFX)   │  │ (SvelteKit)│  │  │
│   │  └─────────────┘  └──────┬──────┘  └─────────────┘  └────────────┘  │  │
│   └──────────────────────────┼──────────────────────────────────────────┘  │
│                              │                                             │
│   ┌──────────────────────────┼──────────────────────────────────────────┐  │
│   │                          ▼         📦 DATA LAYER                     │  │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │  │
│   │  │  Azure SQL  │  │  Cosmos DB  │  │   Storage   │  │Azure OpenAI│  │  │
│   │  │  (Tables)   │  │  (NoSQL)    │  │   (Blobs)   │  │ (GPT-4o)   │  │  │
│   │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘  │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

</details>

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

<!-- CI/CD PIPELINE -->
## 🔄 CI/CD Pipeline

Automated deployment pipelines ensure code quality and zero-downtime releases.

<div align="center">

### 🌐 Website Pipelines

| Environment | Branch | Build | Release | Deployment |
|:-----------:|:------:|:-----:|:-------:|:----------:|
| 🟢 **Production** | `main` | [![Build](https://github.com/arolariu/arolariu.ro/actions/workflows/official-website-build.yml/badge.svg?branch=main)](https://github.com/arolariu/arolariu.ro/actions/workflows/official-website-build.yml) | [![Release](https://github.com/arolariu/arolariu.ro/actions/workflows/official-website-release.yml/badge.svg?branch=main)](https://github.com/arolariu/arolariu.ro/actions/workflows/official-website-release.yml) | [arolariu.ro](https://arolariu.ro) |
| 🟡 **Preview** | `preview` | [![Build](https://github.com/arolariu/arolariu.ro/actions/workflows/official-website-build.yml/badge.svg?branch=preview)](https://github.com/arolariu/arolariu.ro/actions/workflows/official-website-build.yml) | [![Release](https://github.com/arolariu/arolariu.ro/actions/workflows/official-website-release.yml/badge.svg?branch=preview)](https://github.com/arolariu/arolariu.ro/actions/workflows/official-website-release.yml) | [dev.arolariu.ro](https://dev.arolariu.ro) |

### ⚙️ API Pipeline

| Environment | Branch | Build & Deploy | Endpoint |
|:-----------:|:------:|:--------------:|:--------:|
| 🟢 **Production** | `main` | [![API](https://github.com/arolariu/arolariu.ro/actions/workflows/official-api-trigger.yml/badge.svg?branch=main)](https://github.com/arolariu/arolariu.ro/actions/workflows/official-api-trigger.yml) | [api.arolariu.ro](https://api.arolariu.ro) |

</div>

<details>
<summary><b>🎯 Pipeline Features</b></summary>

| Feature | Description |
|:-------:|:------------|
| ✅ **Automated Testing** | Unit, integration & E2E tests on every commit |
| ✅ **Code Quality Gates** | ESLint, Prettier, TypeScript strict checks |
| ✅ **Security Scanning** | Dependency vulnerability analysis |
| ✅ **Docker Multi-stage** | Optimized container builds with layer caching |
| ✅ **Blue-Green Deploy** | Zero-downtime production releases |
| ✅ **Auto-rollback** | Automatic rollback on health check failures |
| ✅ **OIDC Authentication** | Secure Azure authentication without secrets |

</details>

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

<!-- ROADMAP -->
## 🗺️ Roadmap

Track the project's progress and upcoming features:

- [x] 🏗️ Nx Monorepo architecture setup
- [x] 🎨 Next.js 16 with React 19 and RSC
- [x] ⚙️ .NET 10 backend with DDD architecture
- [x] 📊 OpenTelemetry observability (frontend + backend)
- [x] 🔐 Azure OIDC authentication for CI/CD
- [x] 🌍 Internationalization with next-intl
- [x] 📦 Shared component library with Storybook
- [x] 🤖 Azure OpenAI integration
- [ ] 📱 Progressive Web App (PWA) support
- [ ] 🔔 Real-time notifications with SignalR
- [ ] 📈 Advanced analytics dashboard
- [ ] 🧪 Visual regression testing
- [ ] 🌐 Multi-region deployment

> **See the [open issues](https://github.com/arolariu/arolariu.ro/issues)** for a full list of proposed features and known issues.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

<!-- AI-POWERED DEVELOPMENT -->
## 🤖 AI-Powered Development

This repository is fully configured with **GitHub Copilot instructions** for context-aware AI assistance.

<details open>
<summary><b>📚 Instruction Files</b></summary>

| File Type | Instructions | Topics |
|:---------:|:------------:|:-------|
| `.github/workflows/*.yml` | `workflows.instructions.md` | CI/CD patterns, caching, OIDC |
| `**/*.ts` | `typescript.instructions.md` | Strict typing, type guards |
| `**/*.tsx, *.jsx` | `react.instructions.md` | RSC, hooks, state management |
| `sites/arolariu.ro/**` | `frontend.instructions.md` | Next.js App Router, observability |
| `**/*.cs` | `backend.instructions.md` | DDD, SOLID, The Standard |
| `**/*.bicep` | `bicep.instructions.md` | Azure IaC best practices |

</details>

<details>
<summary><b>📖 Architecture RFCs</b></summary>

| RFC # | Title | Status |
|:-----:|:------|:------:|
| **Frontend (1xxx)** | | |
| 1001 | OpenTelemetry Observability System | ✅ Implemented |
| 1002 | JSDoc/TSDoc Documentation Standard | ✅ Implemented |
| 1003 | Internationalization System (next-intl) | ✅ Implemented |
| 1004 | Metadata and SEO System | ✅ Implemented |
| **Backend (2xxx)** | | |
| 2001 | Domain-Driven Design Architecture | ✅ Implemented |
| 2002 | Backend OpenTelemetry Observability | ✅ Implemented |
| 2003 | The Standard Implementation | ✅ Implemented |
| 2004 | XML Documentation Standard | ✅ Implemented |

</details>

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

<!-- REPOSITORY ANALYTICS -->
## 📊 Repository Analytics

> 📈 **Powered by [Repography](https://repography.com)** — Real-time analytics from GitHub API

<div align="center">

[![Time period](https://images.repography.com/39125298/arolariu/arolariu.ro/recent-activity/1W5aIW8QnZQEotvdsf5oU2sHQhOpMgx1tUWkfXzX7bA/9AUN7WfNEj1mtVRPP4BM4177J7FzSpcQrJSkX4mIKbY_badge.svg)](https://repography.com)

</div>

<details open>
<summary><b>📅 Activity Timeline</b></summary>

<div align="center">

[![Timeline graph](https://images.repography.com/39125298/arolariu/arolariu.ro/recent-activity/1W5aIW8QnZQEotvdsf5oU2sHQhOpMgx1tUWkfXzX7bA/9AUN7WfNEj1mtVRPP4BM4177J7FzSpcQrJSkX4mIKbY_timeline.svg)](https://github.com/arolariu/arolariu.ro/commits)

</div>

</details>

<details>
<summary><b>🐛 Issues & 🔀 Pull Requests</b></summary>

<div align="center">

| Issues | Pull Requests |
|:------:|:-------------:|
| [![Issue status graph](https://images.repography.com/39125298/arolariu/arolariu.ro/recent-activity/1W5aIW8QnZQEotvdsf5oU2sHQhOpMgx1tUWkfXzX7bA/9AUN7WfNEj1mtVRPP4BM4177J7FzSpcQrJSkX4mIKbY_issues.svg)](https://github.com/arolariu/arolariu.ro/issues) | [![Pull request status graph](https://images.repography.com/39125298/arolariu/arolariu.ro/recent-activity/1W5aIW8QnZQEotvdsf5oU2sHQhOpMgx1tUWkfXzX7bA/9AUN7WfNEj1mtVRPP4BM4177J7FzSpcQrJSkX4mIKbY_prs.svg)](https://github.com/arolariu/arolariu.ro/pulls) |

</div>

</details>

<details>
<summary><b>🗺️ Activity Heatmap & 💬 Trending Topics</b></summary>

<div align="center">

| Activity Map | Trending Topics |
|:------------:|:---------------:|
| [![Activity map](https://images.repography.com/39125298/arolariu/arolariu.ro/recent-activity/1W5aIW8QnZQEotvdsf5oU2sHQhOpMgx1tUWkfXzX7bA/9AUN7WfNEj1mtVRPP4BM4177J7FzSpcQrJSkX4mIKbY_map.svg)](https://github.com/arolariu/arolariu.ro/commits) | [![Trending topics](https://images.repography.com/39125298/arolariu/arolariu.ro/recent-activity/1W5aIW8QnZQEotvdsf5oU2sHQhOpMgx1tUWkfXzX7bA/9AUN7WfNEj1mtVRPP4BM4177J7FzSpcQrJSkX4mIKbY_words.svg)](https://github.com/arolariu/arolariu.ro/commits) |

</div>

</details>

<details open>
<summary><b>🌟 Star History</b></summary>

<div align="center">

[![Star History Chart](https://api.star-history.com/svg?repos=arolariu/arolariu.ro&type=Date&theme=dark)](https://star-history.com/#arolariu/arolariu.ro&Date)

</div>

</details>

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

<!-- CONTRIBUTING -->
## 🤝 Contributing

Contributions make the open source community an amazing place to learn, inspire, and create. Any contributions are **greatly appreciated**!

<details>
<summary><b>How to Contribute</b></summary>

1. **Fork** the Project
2. **Create** your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. **Commit** your Changes (`git commit -m 'Add some AmazingFeature'`)
4. **Push** to the Branch (`git push origin feature/AmazingFeature`)
5. **Open** a Pull Request

</details>

### 👥 Top Contributors

<div align="center">

<a href="https://github.com/arolariu/arolariu.ro/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=arolariu/arolariu.ro&max=100" alt="Contributors" />
</a>

<br/>
<br/>

[![Top contributors](https://images.repography.com/39125298/arolariu/arolariu.ro/top-contributors/1W5aIW8QnZQEotvdsf5oU2sHQhOpMgx1tUWkfXzX7bA/9AUN7WfNEj1mtVRPP4BM4177J7FzSpcQrJSkX4mIKbY_table.svg)](https://github.com/arolariu/arolariu.ro/graphs/contributors)

</div>

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

<!-- LICENSE -->
## 📜 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

<!-- CONTACT -->
## 📞 Contact

<div align="center">

| Channel | Link |
|:-------:|:----:|
| 🌐 **Website** | [arolariu.ro](https://arolariu.ro) |
| 📧 **Email** | [admin@arolariu.ro](mailto:admin@arolariu.ro) |
| 💼 **LinkedIn** | [Alexandru-Razvan Olariu](https://www.linkedin.com/in/olariu-alexandru/) |
| 💻 **GitHub** | [@arolariu](https://github.com/arolariu) |

</div>

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

<!-- ACKNOWLEDGMENTS -->
## 🙏 Acknowledgments

Special thanks to these amazing resources and tools:

- [Next.js](https://nextjs.org) — The React Framework for the Web
- [.NET](https://dotnet.microsoft.com) — Free, open-source developer platform
- [Azure](https://azure.microsoft.com) — Cloud computing platform
- [Nx](https://nx.dev) — Smart, Fast and Extensible Build System
- [Tailwind CSS](https://tailwindcss.com) — Utility-first CSS framework
- [shadcn/ui](https://ui.shadcn.com) — Re-usable components
- [Shields.io](https://shields.io) — Badges for projects
- [Repography](https://repography.com) — Repository analytics
- [Best-README-Template](https://github.com/othneildrew/Best-README-Template) — README inspiration

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

<div align="center">

### 💖 Support This Project

If you find this project useful, please consider giving it a ⭐ star on GitHub!

<br/>

[![GitHub stars](https://img.shields.io/github/stars/arolariu/arolariu.ro?style=for-the-badge&logo=github&color=yellow)](https://github.com/arolariu/arolariu.ro/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/arolariu/arolariu.ro?style=for-the-badge&logo=git)](https://github.com/arolariu/arolariu.ro/network/members)
[![GitHub watchers](https://img.shields.io/github/watchers/arolariu/arolariu.ro?style=for-the-badge&logo=github)](https://github.com/arolariu/arolariu.ro/watchers)

<br/>

**Made with ❤️ by [Alexandru-Razvan Olariu](https://arolariu.ro)**

<br/>

**[⬆ Back to Top](#readme-top)**

</div>

---

<!-- MARKDOWN LINKS & IMAGES -->
<!-- Reference-style links for badges -->
[build-shield]: https://img.shields.io/github/actions/workflow/status/arolariu/arolariu.ro/official-website-build.yml?style=for-the-badge&logo=githubactions&logoColor=white&label=Build
[build-url]: https://github.com/arolariu/arolariu.ro/actions/workflows/official-website-build.yml
[license-shield]: https://img.shields.io/github/license/arolariu/arolariu.ro?style=for-the-badge&color=blue
[license-url]: https://github.com/arolariu/arolariu.ro/blob/main/LICENSE
[contributors-shield]: https://img.shields.io/github/contributors/arolariu/arolariu.ro?style=for-the-badge&logo=github&color=yellow
[contributors-url]: https://github.com/arolariu/arolariu.ro/graphs/contributors
[issues-shield]: https://img.shields.io/github/issues/arolariu/arolariu.ro?style=for-the-badge&logo=github
[issues-url]: https://github.com/arolariu/arolariu.ro/issues
[prs-shield]: https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge
[prs-url]: https://github.com/arolariu/arolariu.ro/pulls
