namespace arolariu.Backend.Core;

using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Core.Domain.General.Extensions;
using arolariu.Backend.Domain.Invoices.Modules;

using Microsoft.AspNetCore.Builder;

/// <summary>
/// Represents the main entry point for the arolariu.ro backend API.
/// This class configures and bootstraps a .NET 9.0 STS (Standard Terms Support) modular monolith web application
/// that provides invoice management and authentication services.
/// </summary>
/// <remarks>
/// <para>
/// The application follows a modular monolith architecture pattern with clearly separated domains:
/// - General domain: Core infrastructure, configuration, and cross-cutting concerns
/// - Invoices domain: Business logic for invoice processing, analysis, and management
/// - Authentication domain: User authentication and authorization services
/// </para>
/// <para>
/// The application is designed for deployment as a containerized service on Microsoft Azure,
/// utilizing Azure services for storage, configuration, monitoring, and AI capabilities.
/// </para>
/// <para>
/// Configuration is applied in two phases:
/// 1. Builder configuration: Sets up services, dependencies, and middleware
/// 2. Application configuration: Configures the request pipeline and routing
/// </para>
/// </remarks>
[ExcludeFromCodeCoverage] // This class is not tested as it contains only application bootstrapping logic.
internal static class Program
{
	/// <summary>
	/// The main entry point for the application.
	/// Configures and starts the web application with all required domains and services.
	/// </summary>
	/// <param name="args">
	/// Command-line arguments passed to the application. These are used by the ASP.NET Core host
	/// for configuration overrides, environment specification, and other runtime parameters.
	/// Common arguments include --environment, --urls, and custom configuration keys.
	/// </param>
	/// <remarks>
	/// <para>
	/// The startup sequence follows this order:
	/// 1. Create WebApplicationBuilder with default configuration sources
	/// 2. Add general domain configuration (logging, telemetry, health checks, etc.)
	/// 3. Add invoices domain configuration (business services, database contexts, etc.)
	/// 4. Build the WebApplication instance
	/// 5. Configure general application pipeline (middleware, routing, etc.)
	/// 6. Configure invoice domain pipeline (endpoints, authorization policies, etc.)
	/// 7. Start the application host
	/// </para>
	/// <para>
	/// Each domain is responsible for registering its own services and configuring its own
	/// middleware through extension methods, promoting separation of concerns and modularity.
	/// </para>
	/// </remarks>
	public static void Main(string[] args)
	{
		WebApplicationBuilder builder = WebApplication.CreateBuilder(args);
		builder.AddGeneralDomainConfiguration();
		builder.AddInvoicesDomainConfiguration();

		WebApplication app = builder.Build();
		app.AddGeneralApplicationConfiguration();
		app.AddInvoiceDomainConfiguration();

		app.Run();
	}
}
