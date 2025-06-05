# Compute Resources

This module deploys the compute infrastructure for the arolariu.ro platform, consisting of App Service Plans and Web Applications organized by environment.

## Overview

The compute infrastructure is divided into two environments:
- **Production Environment**: Hosts the main arolariu.ro website
- **Development Environment**: Hosts the development website and API services

## Architecture Diagram

```mermaid
graph LR
    subgraph "Production Environment"
        ASP_PROD[App Service Plan - Production<br/>SKU: B2 Basic<br/>Linux]
        WA_PROD[Web App<br/>arolariu.ro]
    end

    subgraph "Development Environment"
        ASP_DEV[App Service Plan - Development<br/>SKU: B1 Basic<br/>Linux]
        WA_DEV[Web App<br/>dev.arolariu.ro]
        WA_API[Web App<br/>api.arolariu.ro]
    end

    subgraph "Dependencies"
        SA[Storage Account]
        APPI[Application Insights]
        MI[Managed Identity]
    end

    ASP_PROD --> WA_PROD
    ASP_DEV --> WA_DEV
    ASP_DEV --> WA_API
    
    WA_PROD --> SA
    WA_PROD --> APPI
    WA_PROD --> MI
    
    WA_DEV --> SA
    WA_DEV --> APPI
    WA_DEV --> MI
    
    WA_API --> SA
    WA_API --> APPI
    WA_API --> MI

    WA_PROD -.->|HTTPS| USERS_PROD[Production Users]
    WA_DEV -.->|HTTPS| USERS_DEV[Development Users]
    WA_API -.->|HTTPS/API| CLIENTS[API Clients]

    classDef prodPlan fill:#4a9,stroke:#333,stroke-width:2px
    classDef devPlan fill:#bbf,stroke:#333,stroke-width:2px
    classDef app fill:#9cf,stroke:#333,stroke-width:2px
    classDef dep fill:#ddd,stroke:#333,stroke-width:2px
    classDef external fill:#ffd,stroke:#333,stroke-width:2px

    class ASP_PROD prodPlan
    class ASP_DEV devPlan
    class WA_PROD,WA_DEV,WA_API app
    class SA,APPI,MI dep
    class USERS_PROD,USERS_DEV,CLIENTS external
```

## Components

### App Service Plans

#### Production App Service Plan
- **SKU**: B2 Basic (2 vCPUs, 3.5 GB RAM)
- **OS**: Linux
- **Features**: Per-site scaling enabled
- **Purpose**: Hosts the production website with better performance and reliability

#### Development App Service Plan
- **SKU**: B1 Basic (1 vCPU, 1.75 GB RAM)
- **OS**: Linux
- **Features**: Standard configuration
- **Purpose**: Hosts development and API services with cost optimization

### Web Applications

#### arolariu.ro (Production)
- **Environment**: Production
- **App Service Plan**: Production
- **Purpose**: Main public-facing website
- **Access**: Global users via HTTPS

#### dev.arolariu.ro (Development)
- **Environment**: Development
- **App Service Plan**: Development
- **Purpose**: Development and testing environment
- **Access**: Development team and testers

#### api.arolariu.ro (API)
- **Environment**: Development
- **App Service Plan**: Development
- **Purpose**: RESTful API services for data operations
- **Access**: API clients and internal services

### Dependencies

Each web application integrates with:

- **Storage Account**: For file storage, blob storage, and static assets
- **Application Insights**: For monitoring, logging, and performance tracking
- **Managed Identity**: For secure, passwordless authentication to Azure services

## Security Considerations

- All web applications use Managed Identities for authentication
- HTTPS-only traffic enforcement
- Integration with Azure Key Vault through App Configuration
- Network isolation capabilities through service endpoints

## Scaling Strategy

- Production environment uses B2 SKU with per-site scaling for better performance
- Development environment uses B1 SKU for cost optimization
- Both environments can be scaled up/down based on demand
- Horizontal scaling (scale-out) available when needed
