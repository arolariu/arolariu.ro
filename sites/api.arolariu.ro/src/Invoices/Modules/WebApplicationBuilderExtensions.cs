namespace arolariu.Backend.Domain.Invoices.Modules;

using System;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Common.Azure;
using arolariu.Backend.Common.Options;
using arolariu.Backend.Domain.Invoices.Brokers.BlobStorageBroker;
using arolariu.Backend.Domain.Invoices.Brokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.Brokers.DataBrokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.Brokers.DocumentIntelligenceBroker;
using arolariu.Backend.Domain.Invoices.Brokers.GenerativeAnalysisBroker;
using arolariu.Backend.Domain.Invoices.Brokers.QueueBroker;
using arolariu.Backend.Domain.Invoices.Brokers.TaxonomyBroker;
using arolariu.Backend.Domain.Invoices.Services.Foundation.Analysis;
using arolariu.Backend.Domain.Invoices.Services.Foundation.AnalysisQueue;
using arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;
using arolariu.Backend.Domain.Invoices.Services.Foundation.MerchantStorage;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.AnalysisService;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.InvoiceService;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.MerchantService;
using arolariu.Backend.Domain.Invoices.Services.Management;
using arolariu.Backend.Domain.Invoices.Services.Processing;
using arolariu.Backend.Domain.Invoices.Workers;

using Azure;
using Azure.AI.OpenAI;

using Microsoft.AspNetCore.Builder;
using Microsoft.Azure.Cosmos;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.AI;
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

      // Local emulator uses a full connection string (AccountEndpoint=...;AccountKey=...).
      // Azure production uses the endpoint URI with Managed Identity.
      if (connectionString.Contains("AccountKey=", StringComparison.OrdinalIgnoreCase))
      {
        // Parse endpoint and key from the connection string for explicit constructor.
        var endpointMatch = System.Text.RegularExpressions.Regex.Match(connectionString, @"AccountEndpoint=([^;]+)");
        var keyMatch = System.Text.RegularExpressions.Regex.Match(connectionString, @"AccountKey=([^;]+)");

        if (!endpointMatch.Success || !keyMatch.Success)
          throw new InvalidOperationException("CosmosDB connection string contains AccountKey= but could not parse both AccountEndpoint and AccountKey.");

        return new CosmosClient(endpointMatch.Groups[1].Value, keyMatch.Groups[1].Value, new CosmosClientOptions
        {
          ConnectionMode = ConnectionMode.Gateway,
          LimitToEndpoint = true,
          CosmosClientTelemetryOptions = new() { DisableDistributedTracing = false },
        });
      }

      var credentials = AzureCredentialFactory.CreateCredential();
      return new CosmosClient(connectionString, credentials, new CosmosClientOptions
      {
        CosmosClientTelemetryOptions = new() { DisableDistributedTracing = false },
      });
    });

    services.AddDbContext<CosmosDatabaseBroker>(options =>
    {
      using ServiceProvider optionsManager = builder.Services.BuildServiceProvider();
      string connectionString = new string(optionsManager
                    .GetRequiredService<IOptionsManager>()
                    .GetApplicationOptions()
                    .NoSqlConnectionString);

      options.UseCosmos(connectionString, "primary", noSqlOptions =>
      {
        noSqlOptions.ConnectionMode(ConnectionMode.Gateway);
      });
      options.UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking);
    });

    // Generative AI client. A single long-lived Azure OpenAI client is shared; the Microsoft.Extensions.AI chat
    // client wraps it so brokers depend on the provider-agnostic abstraction rather than the Azure SDK.
    services.AddSingleton<AzureOpenAIClient>(serviceProvider =>
    {
      ApplicationOptions options = serviceProvider.GetRequiredService<IOptionsManager>().GetApplicationOptions();

      return new AzureOpenAIClient(
        endpoint: new Uri(options.CognitiveServicesEndpoint),
        credential: new AzureKeyCredential(options.CognitiveServicesKey));
    });

    services
      .AddChatClient(serviceProvider =>
      {
        var azureClient = serviceProvider.GetRequiredService<AzureOpenAIClient>();
        return azureClient.GetChatClient(InvoiceMetrics.ConfiguredGenerativeModelIdentifier).AsIChatClient();
      })
      .UseOpenTelemetry(
        sourceName: InvoiceMetrics.AnalysisTelemetrySourceName,
        configure: options => options.EnableSensitiveData = false);

    // Broker services:
    services.AddScoped<IDocumentIntelligenceBroker, AzureDocumentIntelligenceBroker>();
    services.AddScoped<IBlobStorageBroker, AzureStorageBlobBroker>();
    services.AddScoped<IDatabaseBroker, CosmosDatabaseBroker>();
    services.AddScoped<IGenerativeAnalysisBroker, AzureFoundryBroker>();
    services.AddScoped<IQueueBroker, AzureStorageQueueBroker>();
    services.AddSingleton<ITaxonomyBroker, JsonTaxonomyBroker>();

    // Foundation services:
    services.AddScoped<IAnalysisQueueFoundationService, AnalysisQueueFoundationService>();
    services.AddScoped<IAnalysisFoundationService, AnalysisFoundationService>();
    services.AddScoped<IInvoiceStorageFoundationService, InvoiceStorageFoundationService>();
    services.AddScoped<IMerchantStorageFoundationService, MerchantStorageFoundationService>();

    // Orchestration services:
    services.AddScoped<IAnalysisOrchestrationService, AnalysisOrchestrationService>();
    services.AddScoped<IInvoiceOrchestrationService, InvoiceOrchestrationService>();
    services.AddScoped<IMerchantOrchestrationService, MerchantOrchestrationService>();

    // Processing services:
    services.AddScoped<IInvoiceProcessingService, InvoiceProcessingService>();

    // Management services:
    services.AddScoped<IInvoiceManagementService, InvoiceManagementService>();

    // Hosted workers:
    services.AddHostedService<AnalysisWorker>();
  }
}
