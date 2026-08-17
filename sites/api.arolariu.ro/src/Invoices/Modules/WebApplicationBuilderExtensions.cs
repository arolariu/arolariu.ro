namespace arolariu.Backend.Domain.Invoices.Modules;

using System;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Common.Azure;
using arolariu.Backend.Common.Options;
using arolariu.Backend.Domain.Invoices.Brokers.AnalysisRunBroker;
using arolariu.Backend.Domain.Invoices.Brokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.Brokers.DataBrokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.Brokers.DocumentIntelligenceBroker;
using arolariu.Backend.Domain.Invoices.Brokers.GenerativeAiBroker;
using arolariu.Backend.Domain.Invoices.Brokers.TaxonomyBroker;
using arolariu.Backend.Domain.Invoices.Brokers.TranslatorBroker;
using arolariu.Backend.Domain.Invoices.Services.Foundation.AnalysisRuns;
using arolariu.Backend.Domain.Invoices.Services.Foundation.DocumentAnalysis;
using arolariu.Backend.Domain.Invoices.Services.Foundation.GenerativeAnalysis;
using arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;
using arolariu.Backend.Domain.Invoices.Services.Foundation.MerchantStorage;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.AnalysisService;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.InvoiceService;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.MerchantService;
using arolariu.Backend.Domain.Invoices.Services.Processing;
using arolariu.Backend.Domain.Invoices.Services.Processing.AnalysisService;
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
  /// <summary>The OpenTelemetry activity source name emitted by the generative analysis pipeline.</summary>
  private const string AnalysisTelemetrySourceName = "arolariu.Backend.Domain.Invoices.Analysis";

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

    services.AddDbContext<InvoiceNoSqlBroker>(options =>
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
        sourceName: AnalysisTelemetrySourceName,
        configure: options => options.EnableSensitiveData = false);

    // Broker services:
    services.AddScoped<IDocumentIntelligenceBroker, AzureDocumentIntelligenceBroker>();
    services.AddScoped<IInvoiceNoSqlBroker, InvoiceNoSqlBroker>();
    services.AddScoped<IAnalysisRunBroker, CosmosAnalysisRunBroker>();
    services.AddScoped<IGenerativeAiBroker, MicrosoftExtensionsAiBroker>();
    services.AddSingleton<ITaxonomyBroker, JsonTaxonomyBroker>();
    services.AddScoped<ITranslatorBroker, AzureTranslatorBroker>();

    // Foundation services:
    services.AddScoped<IAnalysisRunFoundationService, AnalysisRunFoundationService>();
    services.AddScoped<IDocumentAnalysisFoundationService, DocumentAnalysisFoundationService>();
    services.AddScoped<IGenerativeAnalysisFoundationService, GenerativeAnalysisFoundationService>();
    services.AddScoped<IInvoiceStorageFoundationService, InvoiceStorageFoundationService>();
    services.AddScoped<IMerchantStorageFoundationService, MerchantStorageFoundationService>();

    // Orchestration services:
    services.AddScoped<IAnalysisOrchestrationService, AnalysisOrchestrationService>();
    services.AddScoped<IInvoiceOrchestrationService, InvoiceOrchestrationService>();
    services.AddScoped<IMerchantOrchestrationService, MerchantOrchestrationService>();

    // Processing services:
    services.AddScoped<IAnalysisProcessingService, AnalysisProcessingService>();
    services.AddScoped<IInvoiceProcessingService, InvoiceProcessingService>();

    // Hosted workers:
    services.AddHostedService<AnalysisWorker>();
  }
}
