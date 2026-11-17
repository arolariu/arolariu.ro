# 🚀 Deployment Guide

## 🗺️ **Deployment Process Overview**

```mermaid
flowchart TD
    A[Pre-Deployment Setup] --> B[Validate Templates]
    B --> C[Choose Deployment Method]
    C --> D[Deploy Infrastructure]
    D --> E[Validate Deployment]
    E --> F[Post-Deployment Configuration]
    F --> G[Monitoring Setup]
    G --> H[Ongoing Maintenance]
```

A comprehensive guide for deploying the Azure Bicep infrastructure, from prerequisites to post-deployment validation.

## 📋 **Table of Contents**

- [📋 Prerequisites](#-prerequisites)
- [🔧 Pre-Deployment Setup](#-pre-deployment-setup)
- [🚀 Deployment Methods](#-deployment-methods)
- [📊 Deployment Validation](#-deployment-validation)
- [🔄 Post-Deployment Configuration](#-post-deployment-configuration)
- [📈 Monitoring Setup](#-monitoring-setup)
- [🚨 Troubleshooting](#-troubleshooting)
- [📞 Support](#-support)

## 📋 **Prerequisites**

### **Required Tools**

| Tool       | Version                     | Purpose                                                                       |
| ---------- | --------------------------- | ----------------------------------------------------------------------------- |
| Azure CLI  | ≥2.50.0                     | Azure resource management                                                     |
| Bicep CLI  | latest (`az bicep upgrade`) | Template compilation and deployment (Graph extension, user-defined functions) |
| PowerShell | ≥7.0                        | Script execution (optional)                                                   |
| Git        | ≥2.30.0                     | Source code management                                                        |

### **Azure Requirements**

- **Azure Subscription** with appropriate permissions
- **Resource Provider Registration** for required services
- **Service Principal** or **User Account** with sufficient RBAC
- **Network Access** to Azure endpoints

### **Permission Requirements**

The deploying identity needs the following capabilities. The built-in roles are examples only.

| Scope                                              | Capability needed                                                                                                   | Example built-in roles                                                                     |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Subscription                                       | Create the resource group, deploy resources and register resource providers                                         | For example, Owner or Contributor                                                          |
| Subscription (inherited by the deployed resources) | Create role assignments (`Microsoft.Authorization/roleAssignments/write`) on the resources the deployment creates   | For example, Owner, or Contributor plus Role Based Access Control Administrator            |
| Microsoft Entra ID                                 | Create the `arolariu-JIT-Users` and `arolariu-JIT-Apps` security groups through the Microsoft Graph Bicep extension | For example, Groups Administrator, unless tenant settings let users create security groups |
| Key Vault (after deployment)                       | Replace the placeholder secret values (the vault uses RBAC authorization)                                           | For example, Key Vault Secrets Officer                                                     |

## 🔧 **Pre-Deployment Setup**

### **1. Install Required Tools**

```bash
# Install Azure CLI (Windows)
winget install Microsoft.AzureCLI

# Install Azure CLI (macOS)
brew install azure-cli

# Install Azure CLI (Linux)
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Install Bicep CLI
az bicep install

# Verify installations
az --version
az bicep version
```

### **2. Azure Authentication**

```bash
# Login to Azure
az login

# Set subscription (if you have multiple)
az account set --subscription "your-subscription-id"

# Verify current subscription
az account show --output table
```

### **3. Register Resource Providers**

```bash
# Register required resource providers
az provider register --namespace Microsoft.Web
az provider register --namespace Microsoft.Storage
az provider register --namespace Microsoft.KeyVault
az provider register --namespace Microsoft.ManagedIdentity
az provider register --namespace Microsoft.Insights
az provider register --namespace Microsoft.OperationalInsights
az provider register --namespace Microsoft.Cdn
az provider register --namespace Microsoft.AppConfiguration
az provider register --namespace Microsoft.Network
az provider register --namespace Microsoft.ContainerRegistry
az provider register --namespace Microsoft.Sql
az provider register --namespace Microsoft.DocumentDB
az provider register --namespace Microsoft.CognitiveServices

# Check registration status
az provider list --query "[?namespace=='Microsoft.Web'].registrationState" --output table
```

### **4. Validate Bicep Templates**

```bash
# Clone the repository
git clone https://github.com/arolariu/arolariu.ro.git
cd arolariu.ro/infra/Azure/Bicep

# Validate main template
az bicep build --file main.bicep

# Run linting
az bicep lint --file main.bicep

# Check for errors
echo $? # Should return 0 if successful
```

## 🚀 **Deployment Methods**

### **Method 1: Azure CLI (Recommended)**

#### **Basic Deployment**

```bash
# Deploy with the canonical parameters file (set expEntraAppClientId in main.bicepparam first)
az deployment sub create \
  --location francecentral \
  --template-file main.bicep \
  --parameters main.bicepparam \
  --name "arolariu-infra-$(date +%Y%m%d-%H%M%S)"
```

#### **Custom Parameters**

```bash
# Deploy with custom parameters
az deployment sub create \
  --location francecentral \
  --template-file main.bicep \
  --parameters \
    resourceGroupName="arolariu-rg" \
    resourceGroupLocation="francecentral" \
    resourceGroupAuthor="Your Name <your.email@domain.com>" \
    expEntraAppClientId="<app-registration-client-id>" \
  --name "arolariu-infra-$(date +%Y%m%d-%H%M%S)"
```

#### **Parameters File (`main.bicepparam`)**

`main.bicepparam` is the canonical, checked-in parameters file. It sets `resourceGroupName = 'arolariu-rg'`,
`resourceGroupLocation = 'francecentral'` and `resourceGroupAuthor`. Before deploying, replace the `expEntraAppClientId` placeholder with
the client ID of the exp.arolariu.ro App Registration; the file shows the `az ad app create` command that creates the registration. The
legacy `main.parameters.json` lacks `expEntraAppClientId` and is not a working alternative.

Deploy with parameters file:

```bash
az deployment sub create \
  --location francecentral \
  --template-file main.bicep \
  --parameters main.bicepparam \
  --name "arolariu-infra-$(date +%Y%m%d-%H%M%S)"
```

### **Method 2: Azure PowerShell**

```powershell
# Connect to Azure
Connect-AzAccount

# Set subscription
Set-AzContext -SubscriptionId "your-subscription-id"

# Deploy template
New-AzSubscriptionDeployment `
  -Location "francecentral" `
  -TemplateFile "main.bicep" `
  -TemplateParameterFile "main.bicepparam" `
  -Name "arolariu-infra-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
```

### **Method 3: GitHub Actions (CI/CD)**

No infrastructure deployment workflow exists in this repository; infrastructure is deployed manually. The following is an illustrative
template only. It follows the repository's workflow conventions (OIDC authentication instead of stored credentials) and deploys
`main.bicepparam`, so set `expEntraAppClientId` in that file first.

```yaml
name: Deploy Azure Infrastructure

on:
  push:
    branches: [main]
    paths: ["infra/Azure/Bicep/**"]
  workflow_dispatch:

permissions:
  id-token: write # Required for OIDC authentication with Azure
  contents: read

concurrency:
  group: infra-deploy
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - name: Azure Login
        uses: Azure/login@v3
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Deploy Bicep Template
        run: |
          az deployment sub create \
            --location francecentral \
            --template-file infra/Azure/Bicep/main.bicep \
            --parameters infra/Azure/Bicep/main.bicepparam
```

## 📊 **Deployment Validation**

### **1. Check Deployment Status**

```bash
# List recent deployments
az deployment sub list \
  --query "[?contains(name, 'arolariu-infra')].{Name:name, State:properties.provisioningState, Timestamp:properties.timestamp}" \
  --output table

# Get deployment details
az deployment sub show \
  --name "your-deployment-name" \
  --query "properties.{State:provisioningState, Duration:duration, Outputs:outputs}"
```

### **2. Validate Resources**

```bash
# List all resources in the resource group
az resource list \
  --resource-group "arolariu-rg" \
  --output table

# Check specific resource types
az appservice plan list \
  --resource-group "arolariu-rg" \
  --output table

az webapp list \
  --resource-group "arolariu-rg" \
  --output table
```

### **3. Test Connectivity**

```bash
# Test web application endpoints
curl -I https://your-webapp-name.azurewebsites.net

# Check SSL certificate
openssl s_client -connect your-webapp-name.azurewebsites.net:443 -servername your-webapp-name.azurewebsites.net
```

## 🔄 **Post-Deployment Configuration**

### **1. DNS Configuration**

Custom domains and managed certificates are provisioned by `bindings/` (api, dev, cv, docs) and `network/azureFrontDoor.bicep` (apex, www);
only verify DNS propagation.

```bash
# List the records in the arolariu.ro DNS zone
az network dns record-set list \
  --resource-group "arolariu-rg" \
  --zone-name "arolariu.ro" \
  --output table
```

### **2. Application Settings**

Each web app's settings are defined in `sites/*.bicep`, including `APPLICATIONINSIGHTS_CONNECTION_STRING` for the www, api and exp apps. A
template deployment replaces the app settings, so settings added manually are overwritten on redeploy; add persistent settings to the site's
Bicep module instead.

```bash
# Configure application settings (overwritten by the next template deployment)
az webapp config appsettings set \
  --name "your-webapp-name" \
  --resource-group "arolariu-rg" \
  --settings \
    "ENVIRONMENT=Production"
```

### **3. Scaling Configuration**

Not applicable to the current Basic (B1/B2) plans; autoscale requires Standard (S1+).

```bash
# Configure auto-scaling (if using Standard/Premium plans)
az monitor autoscale create \
  --resource-group "arolariu-rg" \
  --resource "your-app-service-plan" \
  --resource-type Microsoft.Web/serverfarms \
  --name "autoscale-rules" \
  --min-count 1 \
  --max-count 5 \
  --count 2
```

## 📈 **Monitoring Setup**

### **1. Configure Alerts**

```bash
# Create resource health alert
az monitor activity-log alert create \
  --resource-group "arolariu-rg" \
  --name "webapp-health-alert" \
  --scopes "/subscriptions/your-sub-id/resourceGroups/arolariu-rg" \
  --condition category=ResourceHealth

# Create metric alert for high CPU
az monitor metrics alert create \
  --name "high-cpu-alert" \
  --resource-group "arolariu-rg" \
  --scopes "/subscriptions/your-sub-id/resourceGroups/arolariu-rg/providers/Microsoft.Web/serverfarms/your-plan" \
  --condition "avg CpuPercentage > 80" \
  --description "High CPU usage alert"
```

### **2. Enable Diagnostics**

```bash
# Enable diagnostics for App Service
az monitor diagnostic-settings create \
  --name "webapp-diagnostics" \
  --resource "/subscriptions/your-sub-id/resourceGroups/arolariu-rg/providers/Microsoft.Web/sites/your-webapp" \
  --workspace "/subscriptions/your-sub-id/resourceGroups/arolariu-rg/providers/Microsoft.OperationalInsights/workspaces/your-workspace" \
  --logs '[{"category":"AppServiceHTTPLogs","enabled":true}]' \
  --metrics '[{"category":"AllMetrics","enabled":true}]'
```

## 🚨 **Troubleshooting**

### **Troubleshooting & Rollback Flow**

```mermaid
flowchart TD
    A[Deployment Issue Detected] --> B{Type of Issue}
    B -->|Resource Provider| C[Register Provider]
    B -->|Permissions| D[Check RBAC]
    B -->|Name Conflict| E[Use Unique Names]
    B -->|Location| F[Check Allowed Regions]
    B -->|Validation| G[Run Lint & Fix]
    B -->|Other| H[Check Logs]
    C --> I[Retry Deployment]
    D --> I
    E --> I
    F --> I
    G --> I
    H --> I
    I --> J{Resolved?}
    J -->|Yes| K[Continue]
    J -->|No| L[Rollback]
    L --> M[Delete Resource Group]
    M --> N[Redeploy Previous Version]
```

### **Common Deployment Issues**

| Issue                                | Symptoms                                                              | Solution                                                                   |
| ------------------------------------ | --------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **Resource Provider Not Registered** | `The subscription is not registered to use namespace 'Microsoft.Web'` | Run `az provider register --namespace Microsoft.Web`                       |
| **Insufficient Permissions**         | `Authorization failed`                                                | Verify RBAC permissions at subscription/resource group level               |
| **Resource Name Conflicts**          | `Resource name already exists`                                        | Use unique resource names or delete existing resources                     |
| **Location Constraints**             | `Location not available for subscription`                             | Use allowed regions: francecentral, northeurope, westeurope, swedencentral |
| **Template Validation Errors**       | `Template validation failed`                                          | Run `az bicep lint` and fix syntax errors                                  |

### **Debugging Commands**

```bash
# Get detailed error information
az deployment sub show \
  --name "failed-deployment-name" \
  --query "properties.error"

# Check activity log
az monitor activity-log list \
  --resource-group "arolariu-rg" \
  --start-time "2024-01-01T00:00:00Z" \
  --query "[?level=='Error']"

# Validate specific resource
az resource show \
  --resource-group "arolariu-rg" \
  --name "resource-name" \
  --resource-type "Microsoft.Web/sites"
```

### **Performance Troubleshooting**

```bash
# Check App Service Plan metrics
az monitor metrics list \
  --resource "/subscriptions/your-sub-id/resourceGroups/arolariu-rg/providers/Microsoft.Web/serverfarms/your-plan" \
  --metric "CpuPercentage" \
  --start-time "2024-01-01T00:00:00Z" \
  --end-time "2024-01-01T23:59:59Z"

# View application logs
az webapp log tail \
  --name "your-webapp-name" \
  --resource-group "arolariu-rg"
```

### **Rollback Procedures**

If deployment fails or causes issues:

```bash
# Delete the resource group (complete rollback)
az group delete \
  --name "arolariu-rg" \
  --yes \
  --no-wait

# Redeploy previous version
git checkout previous-commit
az deployment sub create \
  --location francecentral \
  --template-file main.bicep \
  --parameters main.bicepparam
```

## 📞 **Support**

### **Getting Help**

1. **Documentation**: Check module-specific README files
2. **Issues**: Create GitHub issues for bugs or feature requests
3. **Community**: Azure Bicep community forums
4. **Microsoft Support**: For Azure-specific issues

### **Useful Resources**

- [Azure Bicep Documentation](https://docs.microsoft.com/en-us/azure/azure-resource-manager/bicep/)
- [Azure CLI Reference](https://docs.microsoft.com/en-us/cli/azure/)
- [Azure Resource Manager Templates](https://docs.microsoft.com/en-us/azure/azure-resource-manager/templates/)

---

---

**Last Updated**: November 2026\
**Version**: 2.1.0  
**Maintainer**: Alexandru-Razvan Olariu
