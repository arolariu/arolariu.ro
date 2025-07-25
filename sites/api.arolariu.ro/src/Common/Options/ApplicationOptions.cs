namespace arolariu.Backend.Common.Options;

/// <summary>
/// Provides the foundational configuration structure for the arolariu.ro backend application.
/// This abstract base class defines all configuration properties required across different deployment environments,
/// supporting both cloud-based Azure services and local development infrastructure.
/// </summary>
/// <remarks>
/// <para>
/// This class serves as the configuration contract for the application, organizing settings into logical groups:
/// - Azure infrastructure configuration (tenants, authentication)
/// - External service endpoints (storage, databases, AI services)
/// - Security and authentication settings (JWT configuration)
/// - Application metadata and branding information
/// </para>
/// <para>
/// The design supports environment-specific implementations through derived classes:
/// - <see cref="AzureOptions"/> for cloud deployments using Azure services
/// - <see cref="LocalOptions"/> for local development with emulated or alternative services
/// </para>
/// <para>
/// Configuration values are populated from multiple sources in order of precedence:
/// 1. Environment variables (highest priority)
/// 2. Azure App Configuration or local configuration files
/// 3. Azure Key Vault or local secrets storage
/// 4. Default values defined in this class (lowest priority)
/// </para>
/// <para>
/// All sensitive information (connection strings, API keys, secrets) should be stored
/// securely and never committed to source control. Use Azure Key Vault for cloud
/// deployments and local secret management tools for development.
/// </para>
/// </remarks>
public abstract class ApplicationOptions
{
	#region General Azure Configuration
	/// <summary>
	/// Gets or sets the Azure Active Directory tenant identifier.
	/// This GUID identifies the Azure AD tenant for authentication and authorization operations.
	/// </summary>
	/// <value>
	/// A GUID string representing the Azure AD tenant ID. Required for Azure-based authentication.
	/// For local development, this may be empty if using alternative authentication mechanisms.
	/// </value>
	/// <remarks>
	/// The tenant ID is used for:
	/// - Azure AD authentication and token validation
	/// - Multi-tenant application scenarios
	/// - Azure service-to-service authentication
	/// - Managed Identity configuration in Azure deployments
	/// </remarks>
	public string TenantId { get; set; } = string.Empty;
	#endregion

	#region Secrets & Configuration stores
	/// <summary>
	/// Gets or sets the endpoint URI for the secrets storage service.
	/// This endpoint provides secure access to application secrets and sensitive configuration data.
	/// </summary>
	/// <value>
	/// A URI string pointing to the secrets storage service.
	/// For cloud deployments: Azure Key Vault URI (e.g., "https://myvault.vault.azure.net/")
	/// For local development: Local secrets store endpoint or file path.
	/// </value>
	/// <remarks>
	/// <para>
	/// The secrets endpoint is used to retrieve:
	/// - Database connection strings with embedded credentials
	/// - API keys for third-party services
	/// - JWT signing secrets and encryption keys
	/// - OAuth client secrets and certificates
	/// </para>
	/// <para>
	/// Security considerations:
	/// - Access should be restricted using managed identities or service principals
	/// - Secrets should be rotated regularly according to security policies
	/// - Access patterns should be monitored and audited
	/// - Secrets should never be logged or exposed in error messages
	/// </para>
	/// </remarks>
	public string SecretsEndpoint { get; set; } = string.Empty;

	/// <summary>
	/// Gets or sets the endpoint URI for the centralized configuration service.
	/// This endpoint provides dynamic configuration management and feature flag capabilities.
	/// </summary>
	/// <value>
	/// A URI string pointing to the configuration service.
	/// For cloud deployments: Azure App Configuration endpoint (e.g., "https://myconfig.azconfig.io")
	/// For local development: Local configuration service or file-based configuration.
	/// </value>
	/// <remarks>
	/// <para>
	/// The configuration endpoint enables:
	/// - Dynamic configuration updates without application restart
	/// - Environment-specific configuration management
	/// - Feature flag implementation and A/B testing
	/// - Configuration validation and rollback capabilities
	/// </para>
	/// <para>
	/// Configuration management benefits:
	/// - Centralized configuration across multiple application instances
	/// - Real-time configuration updates for operational flexibility
	/// - Configuration versioning and change tracking
	/// - Role-based access control for configuration changes
	/// </para>
	/// </remarks>
	public string ConfigurationEndpoint { get; set; } = string.Empty;
	#endregion

	#region Storage endpoints
	/// <summary>
	/// Gets or sets the name of the primary storage account for blob and file storage.
	/// This account hosts static assets, user uploads, and application data files.
	/// </summary>
	/// <value>
	/// A string representing the storage account name.
	/// For cloud deployments: Azure Storage account name (e.g., "mystorageaccount")
	/// For local development: Azurite emulator account name or alternative storage identifier.
	/// </value>
	/// <remarks>
	/// The storage account is used for:
	/// - Static web assets (images, documents, media files)
	/// - User-generated content and file uploads
	/// - Application logs and diagnostic data
	/// - Backup and archival storage for business data
	/// </remarks>
	public string StorageAccountName { get; set; } = string.Empty;

	/// <summary>
	/// Gets or sets the complete endpoint URI for the storage account.
	/// This endpoint provides programmatic access to blob, queue, and table storage services.
	/// </summary>
	/// <value>
	/// A URI string for the storage account endpoint.
	/// For cloud deployments: Azure Storage endpoint (e.g., "https://mystorageaccount.blob.core.windows.net/")
	/// For local development: Azurite emulator endpoint (e.g., "http://127.0.0.1:10000/devstoreaccount1")
	/// </value>
	/// <remarks>
	/// <para>
	/// Storage services accessed through this endpoint:
	/// - Blob storage for unstructured data and files
	/// - Queue storage for reliable message processing
	/// - Table storage for NoSQL data scenarios
	/// - File storage for shared file system access
	/// </para>
	/// <para>
	/// Performance and reliability considerations:
	/// - Configure appropriate redundancy levels (LRS, GRS, RA-GRS)
	/// - Implement retry policies for transient failures
	/// - Use CDN integration for global content distribution
	/// - Monitor storage metrics and implement lifecycle policies
	/// </para>
	/// </remarks>
	public string StorageAccountEndpoint { get; set; } = string.Empty;

	/// <summary>
	/// Gets or sets the connection string for the relational SQL database.
	/// This database stores structured business data requiring ACID compliance and complex queries.
	/// </summary>
	/// <value>
	/// A connection string for the SQL database.
	/// For cloud deployments: Azure SQL Database connection string with managed identity or SQL authentication
	/// For local development: SQL Server Express or LocalDB connection string
	/// </value>
	/// <remarks>
	/// <para>
	/// The SQL database typically contains:
	/// - User account and profile information
	/// - Transactional business data requiring consistency
	/// - Configuration data with complex relationships
	/// - Audit logs and compliance tracking information
	/// </para>
	/// <para>
	/// Security and performance considerations:
	/// - Use managed identities or Azure AD authentication when possible
	/// - Implement connection pooling and retry logic
	/// - Configure appropriate backup and disaster recovery
	/// - Monitor query performance and optimize indexes
	/// - Encrypt sensitive data at rest and in transit
	/// </para>
	/// </remarks>
	public string SqlConnectionString { get; set; } = string.Empty;

	/// <summary>
	/// Gets or sets the connection string for the NoSQL document database.
	/// This database provides scalable storage for flexible schema documents and high-throughput scenarios.
	/// </summary>
	/// <value>
	/// A connection string for the NoSQL database.
	/// For cloud deployments: Azure Cosmos DB connection string with account key or managed identity
	/// For local development: Cosmos DB Emulator connection string or alternative NoSQL database
	/// </value>
	/// <remarks>
	/// <para>
	/// The NoSQL database is optimized for:
	/// - Document storage with flexible schemas
	/// - High-throughput read and write operations
	/// - Global distribution and multi-region replication
	/// - Real-time analytics and reporting scenarios
	/// </para>
	/// <para>
	/// Design considerations:
	/// - Partition strategy for optimal performance and cost
	/// - Consistency levels appropriate for business requirements
	/// - Indexing policies for query optimization
	/// - Request unit (RU) provisioning and auto-scaling
	/// - Data modeling for NoSQL efficiency
	/// </para>
	/// </remarks>
	public string NoSqlConnectionString { get; set; } = string.Empty;
	#endregion

	#region OpenAI configuration
	/// <summary>
	/// Gets or sets the endpoint URI for OpenAI services.
	/// This endpoint provides access to large language models and AI capabilities for document processing and analysis.
	/// </summary>
	/// <value>
	/// A URI string for the OpenAI service endpoint.
	/// For cloud deployments: Azure OpenAI service endpoint (e.g., "https://myopenai.openai.azure.com/")
	/// For local development: OpenAI API endpoint or alternative AI service provider
	/// </value>
	/// <remarks>
	/// <para>
	/// OpenAI services are used for:
	/// - Document analysis and content extraction
	/// - Text classification and sentiment analysis
	/// - Automated content generation and summarization
	/// - Intelligent search and recommendation features
	/// </para>
	/// <para>
	/// Usage considerations:
	/// - Monitor token consumption and costs
	/// - Implement rate limiting and quota management
	/// - Handle service availability and fallback scenarios
	/// - Ensure data privacy and compliance with AI regulations
	/// </para>
	/// </remarks>
	public string OpenAIEndpoint { get; set; } = string.Empty;

	/// <summary>
	/// Gets or sets the API key for authenticating with OpenAI services.
	/// This key provides secure access to AI models and ensures proper billing and usage tracking.
	/// </summary>
	/// <value>
	/// A string representing the OpenAI API key.
	/// This value should be stored securely and retrieved from the secrets endpoint.
	/// </value>
	/// <remarks>
	/// <para>
	/// Security requirements for API keys:
	/// - Store in Azure Key Vault or secure local secrets storage
	/// - Rotate regularly according to security policies
	/// - Monitor usage patterns for anomalies
	/// - Never log or expose keys in error messages or responses
	/// - Use environment-specific keys for development and production
	/// </para>
	/// </remarks>
	public string OpenAIKey { get; set; } = string.Empty;
	#endregion

	#region Open Telemetry configuration
	/// <summary>
	/// Gets or sets the endpoint for Application Insights telemetry collection.
	/// This endpoint receives application metrics, logs, and distributed tracing data for monitoring and diagnostics.
	/// </summary>
	/// <value>
	/// A string representing the Application Insights connection string or instrumentation key.
	/// For cloud deployments: Azure Application Insights connection string
	/// For local development: Local telemetry endpoint or disabled telemetry collection
	/// </value>
	/// <remarks>
	/// <para>
	/// Telemetry data collected includes:
	/// - Application performance metrics and response times
	/// - Error rates and exception details
	/// - Distributed traces across service boundaries
	/// - Custom business metrics and events
	/// - User behavior and usage analytics
	/// </para>
	/// <para>
	/// Monitoring benefits:
	/// - Proactive identification of performance issues
	/// - Root cause analysis for production problems
	/// - Capacity planning and resource optimization
	/// - User experience insights and improvements
	/// - Compliance with SLA requirements
	/// </para>
	/// </remarks>
	public string ApplicationInsightsEndpoint { get; set; } = string.Empty;
	#endregion

	#region Cognitive Services configuration
	/// <summary>
	/// Gets or sets the endpoint URI for Azure Cognitive Services.
	/// This endpoint provides access to AI services for computer vision, text analysis, and machine learning capabilities.
	/// </summary>
	/// <value>
	/// A URI string for the Cognitive Services endpoint.
	/// For cloud deployments: Azure Cognitive Services endpoint (e.g., "https://myregion.api.cognitive.microsoft.com/")
	/// For local development: Alternative ML service endpoint or mock service for testing
	/// </value>
	/// <remarks>
	/// <para>
	/// Cognitive Services capabilities include:
	/// - Optical Character Recognition (OCR) for document processing
	/// - Computer vision for image analysis and classification
	/// - Text analytics for sentiment and entity extraction
	/// - Language translation and localization services
	/// - Form recognition for structured document processing
	/// </para>
	/// <para>
	/// Integration considerations:
	/// - Handle service quotas and rate limiting
	/// - Implement fallback strategies for service unavailability
	/// - Optimize requests to minimize costs and latency
	/// - Ensure data privacy compliance for processed content
	/// </para>
	/// </remarks>
	public string CognitiveServicesEndpoint { get; set; } = string.Empty;

	/// <summary>
	/// Gets or sets the API key for authenticating with Cognitive Services.
	/// This key enables secure access to AI capabilities and ensures proper usage tracking and billing.
	/// </summary>
	/// <value>
	/// A string representing the Cognitive Services subscription key.
	/// This value should be stored securely and retrieved from the secrets endpoint.
	/// </value>
	/// <remarks>
	/// Key management best practices:
	/// - Store securely in Azure Key Vault or equivalent secrets storage
	/// - Use separate keys for different environments (dev, staging, production)
	/// - Monitor key usage and regenerate periodically
	/// - Implement key rotation without service interruption
	/// - Track usage against quotas and billing limits
	/// </remarks>
	public string CognitiveServicesKey { get; set; } = string.Empty;
	#endregion

	#region Auth options
	/// <summary>
	/// Gets or sets the JWT token issuer identifier.
	/// This value identifies the authentication authority that issues tokens for the application.
	/// </summary>
	/// <value>
	/// A string representing the JWT issuer (iss claim).
	/// Typically the application's domain or a unique identifier for the authentication service.
	/// </value>
	/// <remarks>
	/// <para>
	/// The JWT issuer is used for:
	/// - Token validation and trust establishment
	/// - Multi-tenant authentication scenarios
	/// - Integration with external identity providers
	/// - Security auditing and token lifecycle management
	/// </para>
	/// <para>
	/// The issuer must be consistent across all application instances and
	/// should be verified during token validation to prevent token replay attacks.
	/// </para>
	/// </remarks>
	public string JwtIssuer { get; set; } = string.Empty;

	/// <summary>
	/// Gets or sets the JWT token audience identifier.
	/// This value specifies the intended recipients of the JWT tokens issued for this application.
	/// </summary>
	/// <value>
	/// A string representing the JWT audience (aud claim).
	/// Typically the application's identifier or API endpoint that should accept the token.
	/// </value>
	/// <remarks>
	/// <para>
	/// The JWT audience ensures:
	/// - Tokens are only accepted by intended recipients
	/// - Protection against token misuse across different applications
	/// - Clear identification of token scope and purpose
	/// - Compliance with OAuth 2.0 and OpenID Connect standards
	/// </para>
	/// <para>
	/// Applications should validate the audience claim to ensure tokens
	/// are intended for their specific service or API endpoints.
	/// </para>
	/// </remarks>
	public string JwtAudience { get; set; } = string.Empty;

	/// <summary>
	/// Gets or sets the secret key used for JWT token signing and validation.
	/// This cryptographic key ensures token integrity and authenticity.
	/// </summary>
	/// <value>
	/// A string representing the JWT signing secret.
	/// This value must be stored securely and retrieved from the secrets endpoint.
	/// Should be a cryptographically strong random string of sufficient length.
	/// </value>
	/// <remarks>
	/// <para>
	/// Critical security requirements:
	/// - Must be stored in Azure Key Vault or equivalent secure storage
	/// - Should be at least 256 bits (32 characters) for HS256 algorithm
	/// - Must be identical across all application instances for token validation
	/// - Should be rotated regularly with coordinated deployment
	/// - Never commit to source control or expose in logs
	/// </para>
	/// <para>
	/// Key rotation strategy:
	/// - Support multiple keys during rotation periods
	/// - Implement graceful key rollover without service interruption
	/// - Monitor token validation failures during rotation
	/// - Maintain key version history for audit purposes
	/// </para>
	/// </remarks>
	public string JwtSecret { get; set; } = string.Empty;
	#endregion

	#region General configuration
	/// <summary>
	/// Gets or sets the display name of the application.
	/// This name appears in user interfaces, documentation, and system logs.
	/// </summary>
	/// <value>
	/// A string representing the application's display name.
	/// Default: "AROLARIU.RO Backend API" or similar branding-appropriate name.
	/// </value>
	/// <remarks>
	/// Used in various contexts:
	/// - API documentation and Swagger UI titles
	/// - Error messages and user notifications
	/// - Logging and monitoring dashboards
	/// - Email templates and communications
	/// </remarks>
	public string ApplicationName { get; set; } = string.Empty;

	/// <summary>
	/// Gets or sets the current version of the application.
	/// This version is used for deployment tracking, debugging, and compatibility management.
	/// </summary>
	/// <value>
	/// A string representing the application version (e.g., "1.0.0", "2.1.3-beta").
	/// Should follow semantic versioning (SemVer) conventions when possible.
	/// </value>
	/// <remarks>
	/// Version information enables:
	/// - Deployment and rollback tracking
	/// - API compatibility management
	/// - Client-server version validation
	/// - Support and debugging assistance
	/// - Change impact analysis
	/// </remarks>
	public string ApplicationVersion { get; set; } = string.Empty;

	/// <summary>
	/// Gets or sets a brief description of the application's purpose and capabilities.
	/// This description appears in API documentation and helps users understand the application's function.
	/// </summary>
	/// <value>
	/// A string containing a concise description of the application.
	/// Should explain the primary business purpose and key features.
	/// </value>
	/// <remarks>
	/// The description is displayed in:
	/// - OpenAPI/Swagger documentation
	/// - Developer portals and API catalogs
	/// - Monitoring and management dashboards
	/// - System documentation and guides
	/// </remarks>
	public string ApplicationDescription { get; set; } = string.Empty;

	/// <summary>
	/// Gets or sets the name of the application author or organization.
	/// This information provides attribution and contact context for the application.
	/// </summary>
	/// <value>
	/// A string representing the author's name or organization.
	/// Example: "Alexandru-Razvan Olariu" or "AROLARIU.RO"
	/// </value>
	/// <remarks>
	/// Author information is used for:
	/// - Copyright notices and legal attribution
	/// - Contact information in API documentation
	/// - Support and maintenance identification
	/// - Intellectual property tracking
	/// </remarks>
	public string ApplicationAuthor { get; set; } = string.Empty;

	/// <summary>
	/// Gets or sets the terms and conditions text or URL for the application.
	/// This content defines the legal terms governing the use of the application and its services.
	/// </summary>
	/// <value>
	/// A string containing terms and conditions text or a URL to the full terms document.
	/// Should be accessible to all users and comply with applicable legal requirements.
	/// </value>
	/// <remarks>
	/// <para>
	/// Terms and conditions typically cover:
	/// - Acceptable use policies and restrictions
	/// - Data privacy and protection commitments
	/// - Service availability and performance expectations
	/// - Limitation of liability and legal disclaimers
	/// - User rights and responsibilities
	/// </para>
	/// <para>
	/// Legal considerations:
	/// - Must comply with applicable jurisdictional requirements
	/// - Should be reviewed by legal counsel
	/// - Must be accessible and clearly presented to users
	/// - Should be versioned and change tracking implemented
	/// </para>
	/// </remarks>
	public string TermsAndConditions { get; set; } = string.Empty;
	#endregion
}

/// <summary>
/// Provides configuration options specifically for Azure cloud-based deployments.
/// This class inherits all base configuration properties and may include Azure-specific extensions in the future.
/// </summary>
/// <remarks>
/// <para>
/// AzureOptions is designed for production deployments leveraging Microsoft Azure services:
/// - Azure Active Directory for authentication and authorization
/// - Azure Key Vault for secrets management
/// - Azure App Configuration for centralized configuration
/// - Azure Storage for blob and file storage
/// - Azure SQL Database and Cosmos DB for data persistence
/// - Azure Cognitive Services and OpenAI for AI capabilities
/// </para>
/// <para>
/// This class currently inherits all functionality from <see cref="ApplicationOptions"/>
/// but provides a distinct type for dependency injection and configuration binding.
/// Future Azure-specific features and optimizations will be added to this class.
/// </para>
/// </remarks>
public sealed class AzureOptions : ApplicationOptions
{
}

/// <summary>
/// Provides configuration options for local development and testing environments.
/// This class supports development scenarios using local services, emulators, and alternative providers.
/// </summary>
/// <remarks>
/// <para>
/// LocalOptions enables development without requiring full Azure infrastructure:
/// - Local authentication providers or development tokens
/// - File-based or simple database storage for secrets and configuration
/// - Azurite emulator for blob storage testing
/// - SQL Server Express or LocalDB for relational data
/// - Cosmos DB Emulator for document database development
/// - Local AI service proxies or mock implementations
/// </para>
/// <para>
/// This configuration approach facilitates:
/// - Offline development and testing
/// - Reduced cloud service costs during development
/// - Faster development iteration cycles
/// - Simplified debugging and troubleshooting
/// - Team development with minimal infrastructure dependencies
/// </para>
/// </remarks>
public sealed class LocalOptions : ApplicationOptions
{
}
