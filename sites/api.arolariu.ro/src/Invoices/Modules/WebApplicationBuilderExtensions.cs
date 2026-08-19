namespace arolariu.Backend.Domain.Invoices.Modules;

using System;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Common.Azure;
using arolariu.Backend.Common.Options;
using arolariu.Backend.Domain.Invoices.Brokers.AnalysisBrokers.ClassifierBroker;
using arolariu.Backend.Domain.Invoices.Brokers.AnalysisBrokers.IdentifierBroker;
using arolariu.Backend.Domain.Invoices.Brokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.Brokers.DataBrokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.Brokers.TranslatorBroker;
using arolariu.Backend.Domain.Invoices.Brokers.TaxonomyBroker;
using arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceAnalysis;
using arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;
using arolariu.Backend.Domain.Invoices.Services.Foundation.MerchantStorage;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.InvoiceService;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.MerchantService;
using arolariu.Backend.Domain.Invoices.Services.Processing;

using Microsoft.AspNetCore.Builder;
using Microsoft.Azure.Cosmos;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

/// <summary>
/// Registers the Invoices bounded context with an ASP.NET Core application builder.
/// </summary>
/// <remarks>
/// This module is the composition boundary for invoice brokers and The Standard service
/// layers. It contains registration only; domain workflows remain in their respective
/// foundation, orchestration, and processing services.
/// </remarks>
[ExcludeFromCodeCoverage] // This class is not tested because it is a simple extension class.
public static class WebApplicationBuilderExtensions
{
  /// <summary>
  /// Registers invoice persistence, analysis, taxonomy, and service-layer dependencies.
  /// </summary>
  /// <remarks>
  /// <para>
  /// Cosmos clients and the immutable taxonomy catalog are singletons. Database,
  /// external-service brokers, and Foundation, Orchestration, and Processing services
  /// are scoped to the consuming request.
  /// </para>
  /// <para>
  /// Registration defers Cosmos option resolution and taxonomy artifact loading until
  /// the corresponding service is activated.
  /// </para>
  /// </remarks>
  /// <param name="builder">
  /// The application builder whose service collection and configuration are used.
  /// </param>
  /// <exception cref="ArgumentNullException">
  /// Thrown when <paramref name="builder"/> is <see langword="null"/>.
  /// </exception>
  /// <example>
  /// <code>
  /// WebApplicationBuilder builder = WebApplication.CreateBuilder(args);
  /// builder.AddInvoicesDomainConfiguration();
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

    // Broker services:
    services.AddScoped<IClassifierBroker, AzureClassifierBroker>();
    services.AddScoped<IFormRecognizerBroker, AzureFormRecognizerBroker>();
    services.AddScoped<IDatabaseBroker, CosmosDatabaseBroker>();
    services.AddScoped<ITranslatorBroker, AzureTranslatorBroker>();
    services.AddSingleton<ITaxonomyBroker, JsonTaxonomyBroker>();

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
