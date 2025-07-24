namespace arolariu.Backend.Domain.Invoices.Modules;

using System;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Common.Options;
using arolariu.Backend.Domain.Invoices.Brokers.AnalysisBrokers.ClassifierBroker;
using arolariu.Backend.Domain.Invoices.Brokers.AnalysisBrokers.IdentifierBroker;
using arolariu.Backend.Domain.Invoices.Brokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.Brokers.DataBrokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.Brokers.TranslatorBroker;
using arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceAnalysis;
using arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;
using arolariu.Backend.Domain.Invoices.Services.Foundation.MerchantStorage;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.InvoiceService;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.MerchantService;
using arolariu.Backend.Domain.Invoices.Services.Processing;

using Azure.Identity;

using Microsoft.AspNetCore.Builder;
using Microsoft.Azure.Cosmos;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

/// <summary>
/// Extension methods for the <see cref="WebApplicationBuilder"/> builder.
/// </summary>
[ExcludeFromCodeCoverage] // This class is not tested because it is a simple extension class.
public static class WebApplicationBuilderExtensions
{
	/// <summary>
	/// Adds invoices domain configurations to the WebApplicationBuilder instance.
	/// </summary>
	/// <param name="builder">The WebApplicationBuilder instance.</param>
	/// <returns>The modified IServiceCollection instance.</returns>
	/// <remarks>
	/// This method configures services related to the invoices domain.
	/// It adds singleton instances of the invoice SQL broker, invoice reader service,
	/// invoice storage service, and invoice foundation service.
	/// </remarks>
	/// <example>
	/// <code>
	/// // Configure invoices domain configurations
	/// services.AddInvoicesDomainConfiguration(builder);
	/// </code>
	/// </example>
	/// <seealso cref="WebApplicationBuilder"/>
	/// <seealso cref="IServiceCollection"/>
	public static void AddInvoicesDomainConfiguration(this WebApplicationBuilder builder)
	{
		ArgumentNullException.ThrowIfNull(builder);
		var services = builder.Services;
		var configuration = builder.Configuration;

		// Add Cosmos Client and Entity Framework Core --- data layer services.
		services.AddSingleton<CosmosClient>(options =>
		{
			using ServiceProvider optionsManager = builder.Services.BuildServiceProvider();
			string connectionString = new string(optionsManager
										.GetRequiredService<IOptionsManager>()
										.GetApplicationOptions()
										.NoSqlConnectionString);
			var credentials = new DefaultAzureCredential(
#if !DEBUG
			new DefaultAzureCredentialOptions
			{
				ManagedIdentityClientId = Environment.GetEnvironmentVariable("AZURE_CLIENT_ID")
			}
#endif
			);

			var cosmosClient = new CosmosClient(connectionString, credentials);
			return cosmosClient;
		});

		services.AddDbContext<InvoiceNoSqlBroker>(options =>
		{
			using ServiceProvider optionsManager = builder.Services.BuildServiceProvider();
			string connectionString = new string(optionsManager
										.GetRequiredService<IOptionsManager>()
										.GetApplicationOptions()
										.NoSqlConnectionString);

			options.UseCosmos(connectionString, "arolariu", noSqlOptions =>
			{

			});
			options.UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking);
		});

		// Broker services:
		services.AddScoped<IOpenAiBroker, AzureOpenAiBroker>();
		services.AddScoped<IFormRecognizerBroker, AzureFormRecognizerBroker>();
		services.AddScoped<IInvoiceNoSqlBroker, InvoiceNoSqlBroker>();
		services.AddScoped<ITranslatorBroker, AzureTranslatorBroker>();

		// Foundation services:
		services.AddScoped<IInvoiceStorageFoundationService, InvoiceStorageFoundationService>();
		services.AddScoped<IInvoiceAnalysisFoundationService, InvoiceAnalysisFoundationService>();
		services.AddScoped<IMerchantStorageFoundationService, MerchantStorageFoundationService>();

		// Orchestration services:
		services.AddScoped<IInvoiceOrchestrationService, InvoiceOrchestrationService>();
		services.AddScoped<IMerchantOrchestrationService, MerchantOrchestrationService>();

		// Processing services:
		services.AddScoped<IInvoiceProcessingService, InvoiceProcessingService>();
	}
}
