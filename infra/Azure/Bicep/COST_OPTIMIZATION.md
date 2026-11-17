# 💰 Cost Optimization Guide

A comprehensive guide for optimizing Azure infrastructure costs while maintaining performance, security, and reliability standards.

## 📋 **Table of Contents**

- [🔄 Cost Flow Overview](#-cost-flow-overview)
- [💡 Cost Overview](#-cost-overview)
- [📊 Resource Cost Breakdown](#-resource-cost-breakdown)
- [⚙️ Right-Sizing Guidelines](#️-right-sizing-guidelines)
- [📅 Regular Review Process](#-regular-review-process)
- [💡 Quick Wins Checklist](#-quick-wins-checklist)
- [🎯 Target Architecture Costs](#-target-architecture-costs)

## 🔄 **Cost Flow Overview**

```mermaid
flowchart TD
    A[Resource Deployment] --> B[Resource Usage]
    B --> C[Azure Billing Meter]
    C --> D[Cost Analysis]
    D --> E[Cost Alerts & Budgets]
    E --> F[Optimization Actions]
    F --> B
```

## 💡 **Cost Overview**

### **Estimated Monthly Costs**

| Category       | Service                        | SKU/Tier      | Estimated Cost (EUR) |
| -------------- | ------------------------------ | ------------- | -------------------- |
| **Compute**    | App Service Plan (Production)  | B2            | ~€23                 |
| **Compute**    | App Service Plan (Development) | B1            | ~€11                 |
| **Storage**    | Storage Account (Standard LRS) | Standard      | ~€2                  |
| **Monitoring** | Log Analytics (5GB/month)      | Pay-as-you-go | ~€9                  |
| **Networking** | Azure Front Door (Standard)    | Standard      | ~€30                 |
| **Networking** | Azure DNS (Global)             | Global        | ~€2                  |
| **Total**      |                                |               | **~€77-82/month**    |

_Estimates based on June 2025 pricing in the Sweden Central region. `main.bicepparam` deploys to France Central (only the AI Foundry account
is fixed to Sweden Central), so actual prices may differ._

These tables cover only the resources listed above. The templates also deploy these resources, which the estimates do not include:

- Azure Container Registry (Basic)
- Azure SQL: a Standard 10 DTU database and a serverless `GP_S_Gen5_2` database that uses the free offer limit and auto-pauses when the
  limit is exhausted
- Azure Cosmos DB (free tier, 1000 RU/s total throughput limit)
- Azure AI Foundry account (S0, usage-based)
- Key Vault (standard) and App Configuration (free)
- Application Insights (90-day retention)
- Two Static Web Apps, docs and cv (Free)
- Front Door WAF policy (`Standard_AzureFrontDoor`)

### **Cost Factors**

- ✅ **Data Transfer**: Minimal for single-region deployment
- ✅ **Storage Transactions**: Low with standard web application usage
- ✅ **Compute Hours**: 24/7 operation for production workloads
- ✅ **Monitoring Data**: Log retention and analytics costs

## 🧩 **Resource Cost Breakdown**

### **High-Impact Cost Components**

```mermaid
pie title Monthly Cost Distribution
    "App Service Plans" : 42
    "Azure Front Door" : 30
    "Log Analytics" : 9
    "Storage & Registry" : 2
    "Other Services" : 2
```

### **Cost by Category**

| Category   | Monthly Cost | Percentage | Optimization Potential |
| ---------- | ------------ | ---------- | ---------------------- |
| Compute    | €34          | 44%        | High                   |
| Networking | €32          | 41%        | Medium                 |
| Monitoring | €9           | 12%        | Medium                 |
| Storage    | €2           | 3%         | Low                    |
| Other      | €0           | 0%         | Low                    |

## 🏗️ **Right-Sizing Guidelines**

### **Performance Metrics Thresholds**

| Metric        | Target Range | Action if Below    | Action if Above          |
| ------------- | ------------ | ------------------ | ------------------------ |
| CPU Usage     | 40-70%       | Downgrade SKU      | Upgrade SKU or scale out |
| Memory Usage  | 60-80%       | Downgrade SKU      | Upgrade SKU              |
| Response Time | <500ms       | Consider downgrade | Upgrade immediately      |
| Error Rate    | <1%          | Monitor            | Investigate and scale    |

## 📅 **Regular Review Process**

### **Review Process Flow**

```mermaid
flowchart TD
    A[Monthly Cost Review]
    A --> B{Analyze Utilization}
    B -->|Underutilized| C[Downsize or Remove]
    B -->|Overutilized| D[Scale or Upgrade]
    B -->|Optimal| E[Monitor]
    C --> F[Update Cost Alerts]
    D --> F
    E --> F
    F --> G[Document Actions]
    G --> H[Quarterly Optimization]
    H --> I[Benchmark & Reserved Instances]
    I --> J[Repeat]
```

### **Monthly Cost Review Checklist**

- [ ] **Review cost alerts and budgets**
- [ ] **Analyze resource utilization metrics**
- [ ] **Identify unused or underutilized resources**
- [ ] **Check for resource size optimization opportunities**
- [ ] **Review storage account usage and lifecycle policies**
- [ ] **Validate backup and disaster recovery costs**
- [ ] **Assess monitoring and logging costs**

### **Quarterly Optimization Actions**

- [ ] **Performance vs. cost analysis**
- [ ] **Consider reserved instances for stable workloads**
- [ ] **Evaluate upgrading to Standard (S1+) if autoscale is needed (Basic plans cannot autoscale)**
- [ ] **Evaluate new Azure cost optimization features**
- [ ] **Benchmark against industry standards**

### **Cost Optimization KPIs**

| KPI                              | Target | Current   | Status |
| -------------------------------- | ------ | --------- | ------ |
| Cost per transaction             | <€0.01 | Calculate | 📊     |
| Infrastructure cost % of revenue | <5%    | Calculate | 📊     |
| Month-over-month cost growth     | <10%   | Monitor   | 📊     |
| Resource utilization             | >60%   | Monitor   | 📊     |

---

## 💡 **Quick Wins Checklist**

### **Immediate Actions (0-7 days)**

- [ ] Enable development environment scheduling
- [x] Configure storage lifecycle policies (configured: cool after 30 days, archive after 90, delete after 365)
- [ ] Set up cost alerts and budgets
- [x] Enable Azure Front Door caching (configured on the production route)
- [ ] Review Log Analytics retention (currently 30 days, 3 GB/day cap)

**Estimated Savings**: €18-28/month

### **Short-term Actions (1-4 weeks)**

- [ ] Evaluate upgrading to Standard (S1+) if autoscale is needed (Basic plans cannot autoscale)
- [ ] Right-size App Service Plans based on metrics
- [ ] Optimize monitoring data collection
- [ ] Re-evaluate Front Door compression (currently disabled)

**Estimated Savings**: €14-23/month

### **Long-term Actions (1-6 months)**

- [ ] Consider reserved instances for stable workloads
- [ ] Evaluate alternative architectures (serverless, containers)
- [ ] Implement advanced monitoring and alerting
- [ ] Regular cost optimization reviews

**Estimated Savings**: €28-55/month with reserved instances

## 🎯 **Target Architecture Costs**

### **Optimized Monthly Budget**

| Component         | Current | Optimized | Savings |
| ----------------- | ------- | --------- | ------- |
| App Service Plans | €34     | €20       | €14     |
| Azure Front Door  | €30     | €30       | €0      |
| Monitoring        | €9      | €5        | €4      |
| Storage           | €2      | €2        | €0      |
| Other             | €2      | €1        | €1      |
| **Total**         | **€77** | **€58**   | **€19** |

**Target Savings**: 25% reduction in monthly costs

---

---

**Last Updated**: November 2026\
**Version**: 2.1.0\
**Maintainer**: Alexandru-Razvan Olariu
