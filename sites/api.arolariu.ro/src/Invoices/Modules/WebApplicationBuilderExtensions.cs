namespace arolariu.Backend.Domain.Invoices.Modules;
using arolariu.Backend.Common.Options;
using arolariu.Backend.Domain.Invoices.Brokers.AnalysisBrokers.ClassifierBroker;
using arolariu.Backend.Domain.Invoices.Brokers.AnalysisBrokers.IdentifierBroker;
using arolariu.Backend.Domain.Invoices.Brokers.DataBrokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.Brokers.TranslatorBroker;
using arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceAnalysis;
using arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;
using arolariu.Backend.Domain.Invoices.Services.Foundation.MerchantStorage;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.InvoiceService;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.MerchantService;
using arolariu.Backend.Domain.Invoices.Services.Processing;

using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

using System;
using System.Diagnostics.CodeAnalysis;

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

		// Add Entity Framework Core services.
		builder.Services.AddDbContext<InvoiceNoSqlBroker>(options =>
		{
			options.UseCosmos(
				connectionString: builder.Configuration[$"{nameof(AzureOptions)}:NoSqlConnectionString"]!,
				databaseName: "arolariu");

			options.UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking);
		});

		// Broker services:
		builder.Services.AddScoped<IOpenAiBroker, AzureOpenAiBroker>();
		builder.Services.AddScoped<IFormRecognizerBroker, AzureFormRecognizerBroker>();
		builder.Services.AddScoped<IInvoiceNoSqlBroker, InvoiceNoSqlBroker>();
		builder.Services.AddScoped<ITranslatorBroker, AzureTranslatorBroker>();

		// Foundation services:
		builder.Services.AddScoped<IInvoiceStorageFoundationService, InvoiceStorageFoundationService>();
		builder.Services.AddScoped<IInvoiceAnalysisFoundationService, InvoiceAnalysisFoundationService>();
		builder.Services.AddScoped<IMerchantStorageFoundationService, MerchantStorageFoundationService>();

		// Orchestration services:
		builder.Services.AddScoped<IInvoiceOrchestrationService, InvoiceOrchestrationService>();
		builder.Services.AddScoped<IMerchantOrchestrationService, MerchantOrchestrationService>();

		// Processing services:
		builder.Services.AddScoped<IInvoiceProcessingService, InvoiceProcessingService>();
	}
}
