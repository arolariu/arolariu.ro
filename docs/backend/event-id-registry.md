# Backend Event ID Registry

> Centralized reference of all `[LoggerMessage]` event IDs used across the backend API.  
> Prevents ID collisions and enables efficient log querying in Azure Application Insights.

## Event ID Scheme

Event IDs follow the pattern `XXX_YZZ` where:

- **XXX** = Layer/domain prefix  
- **Y** = Sub-category within the layer  
- **ZZ** = Sequential event number  

## Registry by Project

### Common — Telemetry (`src/Common/Telemetry/Logging/Log.cs`)

| Event ID | Level | Message | Method |
|----------|-------|---------|--------|
| `0` | Critical | Option missing from config AND Key Vault | `LogOptionValueIsCompletelyMissing` |
| `1` | Information | Option loaded from Key Vault | `LogOptionValueFromKeyVault` |
| `2` | Information | Option loaded from configuration file | `LogOptionValueFromConfiguration` |

### Common — Configuration (`src/Common/Configuration/Log.cs`)

| Event ID | Level | Message | Method |
|----------|-------|---------|--------|
| `410_103` | Information | Config and features refreshed from proxy | `LogRefreshSucceeded` |
| `410_104` | Warning | Config refresh failed, retrying | `LogRefreshFailed` |
| `410_105` | Warning | Config refresh returned no values | `LogBootstrapMissing` |
| `410_107` | Information | Feature snapshot cache updated | `LogFeatureSnapshotUpdated` |
| `410_201` | Warning | exp returned HTTP error for config key | `LogConfigKeyHttpError` |
| `410_202` | Error | Network error fetching config key | `LogConfigKeyNetworkError` |
| `410_203` | Error | Timeout fetching config key | `LogConfigKeyTimeout` |
| `410_204` | Error | Deserialization error for config key | `LogConfigKeyDeserializationError` |

### Core (`src/Core/Log.cs`)

| Event ID | Level | Message | Method |
|----------|-------|---------|--------|
| `500_100` | Information | General domain config started | `LogGeneralDomainConfigurationStarted` |
| `500_101` | Information | General domain config completed | `LogGeneralDomainConfigurationCompleted` |
| `500_102` | Information | Proxy config fetch started | `LogProxyConfigurationFetchStarted` |
| `500_103` | Information | Proxy config fetch completed | `LogProxyConfigurationFetchCompleted` |
| `500_104` | Error | Proxy config fetch failed | `LogProxyConfigurationFetchFailed` |
| `500_105` | Information | OTel configured | `LogOTelConfigured` |
| `500_106` | Information | Invoices domain configured | `LogInvoicesDomainConfigured` |
| `500_107` | Information | Application started | `LogApplicationStarted` |
| `500_200` | Information | Pipeline config started | `LogPipelineConfigurationStarted` |
| `500_201` | Information | Pipeline config completed | `LogPipelineConfigurationCompleted` |
| `500_202` | Debug | Security headers injected | `LogSecurityHeadersInjected` |
| `500_203` | Information | Swagger configured | `LogSwaggerConfigured` |
| `500_300` | Information | Health checks registered | `LogHealthChecksRegistered` |
| `500_301` | Debug | Health check completed | `LogHealthCheckCompleted` |

### Core.Auth (`src/Core.Auth/Log.cs`)

| Event ID | Level | Message | Method |
|----------|-------|---------|--------|
| `600_100` | Information | User logged out | `LogUserLoggedOut` |
| `600_101` | Warning | Logout failed — null body | `LogLogoutFailed` |
| `600_102` | Information | Auth endpoints mapped | `LogAuthEndpointsMapped` |
| `600_200` | Warning | JWT secret missing | `LogJwtSecretMissing` |
| `600_201` | Warning | JWT issuer validation failed | `LogJwtIssuerValidationFailed` |
| `600_202` | Warning | JWT audience validation failed | `LogJwtAudienceValidationFailed` |
| `600_203` | Debug | JWT issuer fallback applied | `LogJwtIssuerFallback` |
| `600_204` | Debug | JWT audience fallback applied | `LogJwtAudienceFallback` |
| `600_300` | Information | Auth services configured | `LogAuthServicesConfigured` |
| `600_301` | Information | Auth middleware applied | `LogAuthMiddlewareApplied` |
| `600_302` | Error | AuthDbContext config failed | `LogAuthDbContextConfigurationFailed` |

### Invoices (`src/Invoices/Modules/Log.cs`)

#### Foundation Services (100_xxx)

| Event ID | Level | Message | Method |
|----------|-------|---------|--------|
| `100_100` | Error | Invoice analysis validation exception | `LogInvoiceAnalysisValidationException` |
| `100_101` | Error | Invoice analysis dependency exception | `LogInvoiceAnalysisDependencyException` |
| `100_102` | Error | Invoice analysis dependency validation exception | `LogInvoiceAnalysisDependencyValidationException` |
| `100_103` | Error | Invoice analysis service exception | `LogInvoiceAnalysisServiceException` |
| `100_104` | Warning | No analysis performed on invoice | `LogInvoiceAnalysisNoAnalysisHasBeenPerformed` |
| `100_200` | Error | Invoice storage validation exception | `LogInvoiceStorageValidationException` |
| `100_201` | Error | Invoice storage dependency exception | `LogInvoiceStorageDependencyException` |
| `100_202` | Error | Invoice storage dependency validation exception | `LogInvoiceStorageDependencyValidationException` |
| `100_203` | Error | Invoice storage service exception | `LogInvoiceStorageServiceException` |
| `100_300` | Error | Merchant storage validation exception | `LogMerchantStorageServiceValidationException` |
| `100_301` | Error | Merchant storage dependency exception | `LogMerchantStorageServiceDependencyException` |
| `100_302` | Error | Merchant storage dependency validation exception | `LogMerchantStorageServiceDependencyValidationException` |
| `100_303` | Error | Merchant storage service exception | `LogMerchantStorageServiceException` |

#### Orchestration Services (200_xxx)

| Event ID | Level | Message | Method |
|----------|-------|---------|--------|
| `200_100` | Error | Invoice orchestration validation exception | `LogInvoiceOrchestrationValidationException` |
| `200_101` | Error | Invoice orchestration dependency exception | `LogInvoiceOrchestrationDependencyException` |
| `200_102` | Error | Invoice orchestration dependency validation exception | `LogInvoiceOrchestrationDependencyValidationException` |
| `200_103` | Error | Invoice orchestration service exception | `LogInvoiceOrchestrationServiceException` |
| `200_200` | Error | Merchant orchestration validation exception | `LogMerchantOrchestrationValidationException` |
| `200_201` | Error | Merchant orchestration dependency exception | `LogMerchantOrchestrationDependencyException` |
| `200_202` | Error | Merchant orchestration dependency validation exception | `LogMerchantOrchestrationDependencyValidationException` |
| `200_203` | Error | Merchant orchestration service exception | `LogMerchantOrchestrationServiceException` |

#### Processing Services (300_xxx)

| Event ID | Level | Message | Method |
|----------|-------|---------|--------|
| `300_100` | Error | Invoice processing validation exception | `LogInvoiceProcessingValidationException` |
| `300_101` | Error | Invoice processing dependency exception | `LogInvoiceProcessingDependencyException` |
| `300_102` | Error | Invoice processing dependency validation exception | `LogInvoiceProcessingDependencyValidationException` |
| `300_103` | Error | Invoice processing service exception | `LogInvoiceProcessingServiceException` |

#### Classifier Broker (400_xxx)

| Event ID | Level | Message | Method |
|----------|-------|---------|--------|
| `400_100` | Error | GPT method failed | `LogGptMethodFailed` |
| `400_101` | Error | GPT method failed with context | `LogGptMethodFailedWithContext` |
| `400_102` | Warning | Content filter triggered | `LogContentFilterTriggered` |
| `400_103` | Warning | Content filter triggered with context | `LogContentFilterTriggeredWithContext` |
| `400_104` | Information | GPT analysis started | `LogGptAnalysisStarted` |
| `400_105` | Warning | Allergen hallucination skipped | `LogAllergenHallucinationSkipped` |
| `400_106` | Warning | Allergen unrecognized skipped | `LogAllergenUnrecognizedSkipped` |

#### General Validation (900_xxx)

| Event ID | Level | Message | Method |
|----------|-------|---------|--------|
| `900_100` | Warning | User identifier not set | `LogUserIdentifierNotSetWarning` |

## ID Range Allocation

| Range | Project | Domain |
|-------|---------|--------|
| `0–99` | Common/Telemetry | OTel setup, Key Vault config |
| `100_000–199_999` | Invoices | Foundation services |
| `200_000–299_999` | Invoices | Orchestration services |
| `300_000–399_999` | Invoices | Processing services |
| `400_000–409_999` | Invoices | Classifier/AI broker |
| `410_000–419_999` | Common/Config | Configuration proxy |
| `500_000–599_999` | Core | Startup, middleware, health |
| `600_000–699_999` | Core.Auth | Auth, JWT, identity |
| `900_000–999_999` | Invoices | General validation |

## Custom Metrics Registry

### Invoice Meter (`arolariu.Backend.Domain.Invoices`)

| Instrument | Type | Unit | Description |
|-----------|------|------|-------------|
| `invoices.created` | Counter | invoices | Total invoices created |
| `invoices.deleted` | Counter | invoices | Total invoices deleted |
| `invoices.updated` | Counter | invoices | Total invoices updated |
| `invoices.read` | Counter | operations | Total invoice read operations |
| `merchants.created` | Counter | merchants | Total merchants created |
| `merchants.deleted` | Counter | merchants | Total merchants deleted |
| `merchants.updated` | Counter | merchants | Total merchants updated |
| `invoices.analysis.started` | Counter | analyses | Analysis operations started |
| `invoices.analysis.completed` | Counter | analyses | Analysis operations completed |
| `invoices.analysis.failed` | Counter | analyses | Analysis failures (tag: `reason`) |
| `invoices.analysis.duration` | Histogram | ms | Analysis pipeline duration |
| `invoices.analysis.content_filter.triggered` | Counter | events | AI content filter triggers |
| `invoices.cosmosdb.request_charge` | Histogram | RU | Cosmos DB RU per operation |

### Auth Meter (`arolariu.Backend.Auth`)

| Instrument | Type | Unit | Description |
|-----------|------|------|-------------|
| `auth.logouts` | Counter | events | Successful logouts |
| `auth.logout_failures` | Counter | events | Failed logout attempts |
| `auth.jwt.validation_failures` | Counter | events | JWT validation failures (tag: `reason`) |

### Common Meter (`arolariu.Backend.Common`)

| Instrument | Type | Unit | Description |
|-----------|------|------|-------------|
| `config.refresh.success` | Counter | events | Config refresh successes |
| `config.refresh.failure` | Counter | events | Config refresh failures |
| `config.refresh.duration` | Histogram | ms | Config refresh cycle duration |
