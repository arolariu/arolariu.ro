namespace arolariu.Backend.Common.Options;

/// <summary>
/// Options for the Azure services.
/// </summary>
public class AzureOptions
{
	#region Azure Key Vault configuration
	/// <summary>
	/// The name of the Azure Key Vault.
	/// </summary>
	public string KeyVaultName { get; set; } = string.Empty;

	/// <summary>
	/// The URI of the Azure Key Vault.
	/// </summary>
	public string KeyVaultEndpoint { get; set; } = string.Empty;
	#endregion

	#region Azure Storage configuration
	/// <summary>
	/// The name of the Azure Storage account.
	/// </summary>
	public string StorageAccountName { get; set; } = string.Empty;

	/// <summary>
	/// The key of the Azure Storage account.
	/// </summary>
	public string StorageAccountEndpoint { get; set; } = string.Empty;

	/// <summary>
	/// The connection string to the Azure Storage account.
	/// </summary>
	public string StorageAccountConnectionString { get; set; } = string.Empty;

	/// <summary>
	/// The connection string to the Azure SQL database.
	/// </summary>
	public string SqlConnectionString { get; set; } = string.Empty;

	/// <summary>
	/// The connection string to the Azure NoSQL database.
	/// </summary>
	public string NoSqlConnectionString { get; set; } = string.Empty;
	#endregion

	#region Azure OpenAI configuration
	/// <summary>
	/// The endpoint of the Azure OpenAI service.
	/// </summary>
	public string OpenAIEndpoint { get; set; } = string.Empty;

	/// <summary>
	/// The key of the Azure OpenAI service.
	/// </summary>
	public string OpenAIKey { get; set; } = string.Empty;
	#endregion

	#region Azure Cognitive Services configuration
	/// <summary>
	/// The endpoint of the Azure Cognitive Services.
	/// </summary>
	public string CognitiveServicesEndpoint { get; set; } = string.Empty;

	/// <summary>
	/// The key of the Azure Cognitive Services.
	/// </summary>
	public string CognitiveServicesKey { get; set; } = string.Empty;
	#endregion
}
