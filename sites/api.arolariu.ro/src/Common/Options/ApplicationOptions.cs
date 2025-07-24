namespace arolariu.Backend.Common.Options;

/// <summary>
/// Marker class to bind both local and cloud options to application options.
/// </summary>
public abstract class ApplicationOptions
{
	#region General Azure Configuration
	/// <summary>
	/// The Azure Tenant ID.
	/// </summary>
	public string TenantId { get; set; } = string.Empty;
	#endregion

	#region Secrets & Configuration stores
	/// <summary>
	/// The URI of the secrets store:
	/// -> Cloud: Azure Key Vault
	/// -> Local: Secrets Store
	/// </summary>
	public string SecretsEndpoint { get; set; } = string.Empty;

	/// <summary>
	/// The URI of the configuration store:
	/// -> Cloud: Azure App Configuration
	/// -> Local: Configuration Store
	/// </summary>
	public string ConfigurationEndpoint { get; set; } = string.Empty;
	#endregion

	#region Storage endpoints
	/// <summary>
	/// The name of the storage account:
	/// -> Cloud: Azure Storage account
	/// -> Local: Emulated blob storage
	/// </summary>
	public string StorageAccountName { get; set; } = string.Empty;

	/// <summary>
	/// The endppint of the storage account:
	/// -> Cloud: Azure Storage account
	/// -> Local: Emulated blob storage
	/// </summary>
	public string StorageAccountEndpoint { get; set; } = string.Empty;

	/// <summary>
	/// The endpoint (connection string) to the SQL database:
	/// -> Cloud: Azure SQL database
	/// -> Local: MSSQL SQL database
	/// </summary>
	public string SqlConnectionString { get; set; } = string.Empty;

	/// <summary>
	/// The endpoint (connection string) to the NoSQL database:
	/// -> Cloud: Azure NoSQL database
	/// -> Local: CosmosDB Emulator
	/// </summary>
	public string NoSqlConnectionString { get; set; } = string.Empty;
	#endregion

	#region OpenAI configuration
	/// <summary>
	/// The endpoint of the OpenAI service:
	/// -> Cloud: Azure OpenAI service
	/// -> Local: Any other OpenAI service provider
	/// </summary>
	public string OpenAIEndpoint { get; set; } = string.Empty;

	/// <summary>
	/// The key of the OpenAI service:
	/// -> Cloud: Azure OpenAI service key
	/// -> Local: Any other OpenAI service provider key
	/// </summary>
	public string OpenAIKey { get; set; } = string.Empty;
	#endregion

	#region Open Telemetry configuration
	/// <summary>
	/// The instrumentation key for Application Insights (OTel exporter).
	/// </summary>
	public string ApplicationInsightsEndpoint { get; set; } = string.Empty;
	#endregion

	#region Cognitive Services configuration
	/// <summary>
	/// The endpoint of the Cognitive Services service:
	/// -> Cloud: Azure Foundry > Azure Intelligence
	/// -> Local: Any ML model capable of performing OCR and text analysis.
	/// </summary>
	public string CognitiveServicesEndpoint { get; set; } = string.Empty;

	/// <summary>
	/// The key of the Cognitive Services service:
	/// -> Cloud: Azure Intelligence key
	/// -> Local: Your ML model access key / token
	/// </summary>
	public string CognitiveServicesKey { get; set; } = string.Empty;
	#endregion

	#region Auth options
	/// <summary>
	/// The JWT structure issuer.
	/// </summary>
	public string JwtIssuer { get; set; } = string.Empty;

	/// <summary>
	/// The JWT structure audience.
	/// </summary>
	public string JwtAudience { get; set; } = string.Empty;

	/// <summary>
	/// The secret used to sign the JWT structure.
	/// </summary>
	public string JwtSecret { get; set; } = string.Empty;
	#endregion

	#region General configuration
	/// <summary>
	/// The name of the application.
	/// </summary>
	public string ApplicationName { get; set; } = string.Empty;

	/// <summary>
	/// The version of the application.
	/// </summary>
	public string ApplicationVersion { get; set; } = string.Empty;

	/// <summary>
	/// The description of the application.
	/// </summary>
	public string ApplicationDescription { get; set; } = string.Empty;

	/// <summary>
	/// The author of the application.
	/// </summary>
	public string ApplicationAuthor { get; set; } = string.Empty;
	/// <summary>
	/// The terms and conditions of the application.
	/// </summary>
	public string TermsAndConditions { get; set; } = string.Empty;
	#endregion
}

/// <summary>
/// Options for the Azure services.
/// </summary>
public sealed class AzureOptions : ApplicationOptions
{
}

/// <summary>
/// Options for the Locally-attached services.
/// </summary>
public sealed class LocalOptions : ApplicationOptions
{
}
