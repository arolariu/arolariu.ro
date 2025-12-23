# ⚙️ Configuration Module

This module deploys the configuration management infrastructure for the arolariu.ro platform, providing centralized configuration and secrets management through Azure App Configuration and Key Vault.

## 📋 Overview

The configuration infrastructure implements a secure, centralized configuration management system that:

- Separates sensitive secrets (Key Vault) from application configuration (App Configuration)
- Provides configuration snapshots for consistent deployments
- Enables secure access through Managed Identities
- Supports environment-specific configurations

## 📁 Module Files

| File                      | Purpose                                   |
| ------------------------- | ----------------------------------------- |
| `deploymentFile.bicep`    | Orchestrates configuration deployments    |
| `keyVault.bicep`          | Azure Key Vault for secrets               |
| `keyVault.json`           | Key Vault secrets data (imported)         |
| `appConfiguration.bicep`  | Azure App Configuration store             |
| `appConfiguration.json`   | App Configuration values data (imported)  |

## Architecture Diagram

```mermaid
graph TB
    subgraph "Consumers"
        WA_PROD[arolariu.ro]
        WA_DEV[dev.arolariu.ro]
        WA_API[api.arolariu.ro]
    end

    subgraph "App Configuration"
        SNAPSHOT[Configuration Snapshots<br/>Combined Values]
        AC[App Configuration Store<br/>Free SKU]
        subgraph "Configuration Sources"
            KVR[Key Vault References<br/>Sensitive Values]
            CONFIG[Standard Configuration<br/>Non-Sensitive Values]
        end
    end

    subgraph "Key Vault"
        KV[Key Vault<br/>Standard SKU]
        SECRETS[Secrets:<br/>- JWT Secret<br/>- Storage Connection Strings<br/>- SQL Connection Strings<br/>- NoSQL Connection Strings<br/>- Cognitive Services Keys<br/>- OpenAI Keys]
        AP[Access Policies]
    end

    subgraph "Managed Identities"
        MI_INFRA[Infrastructure Identity]
        MI_FRONTEND[Frontend Identity]
        MI_BACKEND[Backend Identity]
    end

    WA_PROD ==>|Serves Configuration| SNAPSHOT
    WA_DEV ==>|Serves Configuration| SNAPSHOT
    WA_API ==>|Serves Configuration| SNAPSHOT

    SNAPSHOT --> AC
    AC --> KVR
    AC --> CONFIG

    KVR -.->|Retrieves Secrets| KV
    CONFIG -.->|Standard Values| SNAPSHOT
    KVR -.->|Resolved Secrets| SNAPSHOT

    KV --> SECRETS
    KV --> AP

    MI_INFRA --> AP
    MI_FRONTEND --> AP
    MI_BACKEND --> AP

    classDef consumer fill:#bbf,stroke:#333,stroke-width:2px
    classDef snapshot fill:#9f9,stroke:#333,stroke-width:2px
    classDef config fill:#fbf,stroke:#333,stroke-width:2px
    classDef vault fill:#f66,stroke:#333,stroke-width:2px
    classDef identity fill:#f9f,stroke:#333,stroke-width:2px

    class WA_PROD,WA_DEV,WA_API consumer
    class SNAPSHOT snapshot
    class AC,KVR,CONFIG config
    class KV,SECRETS,AP vault
    class MI_INFRA,MI_FRONTEND,MI_BACKEND identity
```

## Components

### Azure Key Vault

The Key Vault serves as the secure secrets store for all sensitive configuration values.

#### Specifications

- **SKU**: Standard
- **Soft Delete**: Enabled (90 days retention)
- **Purge Protection**: Enabled
- **Access Model**: Access Policies (not RBAC)

#### Stored Secrets

##### Authentication Secrets

- **jwt-secret**: JWT token signing key for authentication services

##### Storage Connection Strings

- **DEV-AzureOptions-StorageAccountConnectionString**: Development storage account
- **PROD-AzureOptions-StorageAccountConnectionString**: Production storage account

##### Database Connection Strings

- **DEV-AzureOptions-SqlConnectionString**: Development SQL database
- **PROD-AzureOptions-SqlConnectionString**: Production SQL database
- **DEV-AzureOptions-NoSqlConnectionString**: Development NoSQL database
- **PROD-AzureOptions-NoSqlConnectionString**: Production NoSQL database

##### External Service Keys

- **DEV-AzureOptions-CognitiveServicesKey**: Development Cognitive Services
- **PROD-AzureOptions-CognitiveServicesKey**: Production Cognitive Services
- **DEV-AzureOptions-OpenAIKey**: Development OpenAI API
- **PROD-AzureOptions-OpenAIKey**: Production OpenAI API

##### Configuration Store

- **ConfigurationStore**: App Configuration connection string

### Azure App Configuration

The App Configuration service provides centralized configuration management with versioning and feature flags.

#### Specifications

- **SKU**: Free (1000 requests/day, 10MB storage)
- **Authentication**: Local authentication enabled
- **Features**: Configuration snapshots, Key Vault references

#### Configuration Types

##### Key Vault References

References to secrets stored in Key Vault, automatically resolved at runtime:

- Connection strings
- API keys
- Authentication secrets

##### Standard Configuration

Non-sensitive application settings:

- Feature flags
- Application settings
- Environment-specific configurations
- Service endpoints

### Configuration Snapshots

Configuration snapshots provide:

- **Immutable configuration sets**: Point-in-time configuration state
- **Consistent deployments**: All services receive the same configuration
- **Rollback capability**: Easy reversion to previous configurations
- **Environment isolation**: Separate snapshots for dev/prod

### Managed Identities

Three managed identities provide secure, passwordless access:

#### Infrastructure Identity

- **Purpose**: Deployment and infrastructure management
- **Access**: Full permissions on Key Vault (all operations)
- **Usage**: CI/CD pipelines, infrastructure provisioning

#### Frontend Identity

- **Purpose**: Frontend application access
- **Access**: Read-only for secrets and certificates
- **Usage**: Web applications (arolariu.ro, dev.arolariu.ro)

#### Backend Identity

- **Purpose**: Backend services and APIs
- **Access**: Read/write for secrets, read-only for certificates
- **Usage**: API services (api.arolariu.ro)

## Security Model

### Access Control

1. **No direct Key Vault access**: Applications only access App Configuration
2. **Managed Identity authentication**: No passwords or keys in code
3. **Least privilege**: Each identity has minimal required permissions
4. **Network restrictions**: Can be configured for private endpoint access

### Secret Rotation

- Secrets can be rotated in Key Vault without application changes
- App Configuration automatically picks up new secret versions
- Zero-downtime secret rotation capability

## Configuration Flow

1. **Secret Storage**: Sensitive values stored in Key Vault
2. **Reference Creation**: App Configuration creates Key Vault references
3. **Snapshot Generation**: Configuration snapshot combines all values
4. **Application Request**: Consumer requests configuration
5. **Secret Resolution**: App Configuration resolves Key Vault references
6. **Configuration Delivery**: Complete configuration returned to consumer

## Best Practices

1. **Environment Separation**: Use prefixes (DEV-, PROD-) for environment-specific settings
2. **Secret Rotation**: Regularly rotate secrets and API keys
3. **Access Auditing**: Monitor Key Vault access logs
4. **Configuration Versioning**: Use snapshots for deployment consistency
5. **Minimal Permissions**: Grant only required permissions to each identity

## 🔧 Parameters

| Parameter                  | Type       | Required | Description                            |
| -------------------------- | ---------- | -------- | -------------------------------------- |
| `resourceConventionPrefix` | string     | ✅       | Prefix for resource names              |
| `resourceLocation`         | string     | ✅       | Azure region for deployment            |
| `resourceDeploymentDate`   | string     | ✅       | Deployment timestamp                   |
| `identities`               | identity[] | ✅       | Array of managed identities for access |

## 📤 Outputs

This module does not produce outputs as it configures foundational services.

## 🛠️ Usage Example

```bicep
module configurationDeployment 'configuration/deploymentFile.bicep' = {
  name: 'configurationDeployment'
  params: {
    resourceConventionPrefix: 'arolariu'
    resourceLocation: 'swedencentral'
    resourceDeploymentDate: utcNow()
    identities: identitiesDeployment.outputs.managedIdentitiesList
  }
}
```

## 🔄 Dependencies

### **Required Dependencies**

- **Identity Module**: Must deploy managed identities before configuration access policies

### **Dependent Modules**

- **All application modules**: Rely on configuration services for settings and secrets

## 📊 Deployment Flow

1. **Identity Module** creates managed identities
2. **Configuration Module** deploys Key Vault and App Configuration
3. **All other modules** access configuration through managed identities

## 🚨 Troubleshooting

| Issue                       | Symptoms                     | Solution                                      |
| --------------------------- | ---------------------------- | --------------------------------------------- |
| **Key Vault access denied** | Configuration load failures  | Check managed identity access policies        |
| **App Config not found**    | Service discovery failures   | Verify App Configuration deployment           |
| **Secret not found**        | Application startup failures | Check secret exists in Key Vault              |
| **Permission errors**       | RBAC assignment failures     | Verify identity permissions and principal IDs |

## Deployment Considerations

- Key Vault must be deployed before App Configuration
- Managed Identities must be created before access policy assignment
- Configuration values should be loaded after infrastructure deployment
- Consider using deployment slots for zero-downtime configuration updates

## 📚 References

- [Azure Key Vault Documentation](https://docs.microsoft.com/en-us/azure/key-vault/)
- [Azure App Configuration Documentation](https://docs.microsoft.com/en-us/azure/azure-app-configuration/)
- [Key Vault References in App Configuration](https://docs.microsoft.com/en-us/azure/azure-app-configuration/use-key-vault-references)
- [Managed Identity Authentication](https://docs.microsoft.com/en-us/azure/active-directory/managed-identities-azure-resources/)

---

**Module Version**: 2.0.0  
**Last Updated**: December 2025  
**Maintainer**: Alexandru-Razvan Olariu
