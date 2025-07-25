namespace arolariu.Backend.Common.Telemetry.Tracing;

using System.Diagnostics;

// TODO: This class should be automatically generated from the dlls.

/// <summary>
/// Provides centralized activity sources for distributed tracing across application components.
/// This class defines ActivitySource instances that enable OpenTelemetry tracing throughout the system.
/// </summary>
/// <remarks>
/// Activity sources are used to create spans and traces for:
/// - Cross-service request correlation
/// - Performance monitoring and bottleneck identification
/// - Distributed system debugging and troubleshooting
/// - Service dependency mapping and analysis
/// </remarks>
/// <example>
/// <code>
/// // Creating a custom activity
/// using var activity = ActivityGenerators.CommonPackageTracing.StartActivity("ConfigurationLoad");
/// activity?.SetTag("config.source", "KeyVault");
/// // Perform configuration loading
/// activity?.SetStatus(ActivityStatusCode.Ok);
/// </code>
/// </example>
public static class ActivityGenerators
{
	/// <summary>
	/// Activity source for the Common package operations.
	/// Used to trace shared infrastructure components including configuration, validation, and Key Vault operations.
	/// </summary>
	/// <value>
	/// An <see cref="ActivitySource"/> with the name "arolariu.Backend.Common" for tracing common infrastructure operations.
	/// </value>
	/// <remarks>
	/// This activity source covers:
	/// - Configuration loading and management
	/// - Key Vault secret retrieval operations
	/// - Validation and utility operations
	/// - Shared service interactions
	/// </remarks>
	public static readonly ActivitySource CommonPackageTracing = new("arolariu.Backend.Common");

	/// <summary>
	/// Activity source for the Core package operations.
	/// Used to trace application startup, middleware pipeline, and general API operations.
	/// </summary>
	/// <value>
	/// An <see cref="ActivitySource"/> with the name "arolariu.Backend.Core" for tracing core application operations.
	/// </value>
	/// <remarks>
	/// This activity source covers:
	/// - Application startup and configuration
	/// - HTTP request processing and middleware operations
	/// - Swagger documentation generation
	/// - General API infrastructure operations
	/// </remarks>
	public static readonly ActivitySource CorePackageTracing = new("arolariu.Backend.Core");

	/// <summary>
	/// Activity source for the Authentication package operations.
	/// Used to trace authentication, authorization, and security-related operations.
	/// </summary>
	/// <value>
	/// An <see cref="ActivitySource"/> with the name "arolariu.Backend.Auth" for tracing authentication operations.
	/// </value>
	/// <remarks>
	/// This activity source covers:
	/// - User authentication and token validation
	/// - Authorization policy evaluation
	/// - JWT token generation and verification
	/// - Security-related middleware operations
	/// </remarks>
	public static readonly ActivitySource AuthPackageTracing = new("arolariu.Backend.Auth");

	/// <summary>
	/// Activity source for the Invoices domain package operations.
	/// Used to trace business operations related to invoice processing and management.
	/// </summary>
	/// <value>
	/// An <see cref="ActivitySource"/> with the name "arolariu.Backend.Domain.Invoices" for tracing invoice domain operations.
	/// </value>
	/// <remarks>
	/// This activity source covers:
	/// - Invoice creation, processing, and management
	/// - Business rule validation and enforcement
	/// - Data persistence and retrieval operations
	/// - Domain-specific service interactions
	/// </remarks>
	public static readonly ActivitySource InvoicePackageTracing = new("arolariu.Backend.Domain.Invoices");
}
