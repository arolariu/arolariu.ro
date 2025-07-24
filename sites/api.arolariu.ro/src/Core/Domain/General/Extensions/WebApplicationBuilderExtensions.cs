namespace arolariu.Backend.Core.Domain.General.Extensions;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Common.Options;
using arolariu.Backend.Common.Services.KeyVault;
using arolariu.Backend.Common.Telemetry;
using arolariu.Backend.Common.Telemetry.Logging;
using arolariu.Backend.Common.Telemetry.Metering;
using arolariu.Backend.Common.Telemetry.Tracing;
using arolariu.Backend.Core.Auth.Modules;
using arolariu.Backend.Core.Domain.General.Services.Swagger;

using Azure.Core;
using Azure.Extensions.AspNetCore.Configuration.Secrets;
using Azure.Identity;

using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

/// <summary>
/// Extension methods for the <see cref="WebApplicationBuilder"/> builder.
/// This extension class acts as a IoC / DI container.
/// This class is used by the <see cref="Program"/> class.
/// This class represents the `Composition Root` of the application.
/// </summary>
[ExcludeFromCodeCoverage] // Infrastructure code is not tested currently.
internal static class WebApplicationBuilderExtensions
{
	/// <summary>
	/// Configures the application to use Azure Key Vault and Azure App Configuration.
	/// </summary>
	/// <remarks>This method sets up the Azure Key Vault and Azure App Configuration for the application, using the
	/// specified endpoints and credentials. It configures the retry policy and refresh intervals for both services. The
	/// configuration is adjusted based on the build environment (development or production).</remarks>
	/// <param name="builder">The <see cref="WebApplicationBuilder"/> used to configure the application.</param>
	private static void AddAzureConfiguration(this WebApplicationBuilder builder)
	{
		var services = builder.Services;
		var configuration = builder.Configuration;

		var credentials = new DefaultAzureCredential(
#if !DEBUG
			new DefaultAzureCredentialOptions
			{
				ManagedIdentityClientId = builder.Configuration["AZURE_CLIENT_ID"]
			};
#endif
			);

		var secretsStoreEndpoint = new Uri(configuration["ApplicationOptions:SecretsEndpoint"]!);
		var configStoreEndpoint = new Uri(configuration["ApplicationOptions:ConfigurationEndpoint"]!);

		var keyVaultConfigurationProvider = new ConfigurationBuilder()
			.AddAzureKeyVault(
				vaultUri: secretsStoreEndpoint,
				credential: credentials,
				options: new AzureKeyVaultConfigurationOptions() { ReloadInterval = TimeSpan.FromMinutes(30) })
			.Build();


		var configStoreConfigurationProvider = new ConfigurationBuilder()
			.AddAzureAppConfiguration(config =>
			{
				config.ConfigureKeyVault(kv =>
				{
					kv.SetCredential(credentials);
					kv.SetSecretRefreshInterval(TimeSpan.FromMinutes(30));
				});

				config.ConfigureClientOptions(options =>
				{
					options.Retry.MaxRetries = 10;
					options.Retry.Mode = RetryMode.Exponential;
					options.Retry.Delay = TimeSpan.FromSeconds(30);
					options.Retry.NetworkTimeout = TimeSpan.FromSeconds(300);
				});

#if DEBUG
				config.Select("*", labelFilter: "DEVELOPMENT");
#else
				config.Select("*", labelFilter: "PRODUCTION");
#endif

				config.Connect(configStoreEndpoint, credentials);
			})
			.Build();

		services.AddSingleton<IOptionsManager, CloudOptionsManager>();
		services.AddSingleton<IKeyVaultService, KeyVaultService>();

		services.Configure<AzureOptions>(options =>
		{
			options.SecretsEndpoint = secretsStoreEndpoint.ToString();
			options.ConfigurationEndpoint = configStoreEndpoint.ToString();

			var configMappings = new Dictionary<string, string>
			{
				{ nameof(options.JwtSecret), "Common:Auth:Secret" },
				{ nameof(options.JwtIssuer), "Common:Auth:Issuer" },
				{ nameof(options.TenantId), "Common:Azure:TenantId" },
				{ nameof(options.OpenAIEndpoint), "Endpoints:OpenAI" },
				{ nameof(options.JwtAudience), "Common:Auth:Audience" },
				{ nameof(options.SqlConnectionString), "Endpoints:SqlServer" },
				{ nameof(options.NoSqlConnectionString), "Endpoints:NoSqlServer" },
				{ nameof(options.StorageAccountEndpoint), "Endpoints:StorageAccount" },
				{ nameof(options.ApplicationInsightsEndpoint), "Endpoints:ApplicationInsights" },
				{ nameof(options.CognitiveServicesEndpoint), "Endpoints:CognitiveServices" },
			};

			foreach (var mapping in configMappings)
			{
				if (configStoreConfigurationProvider[mapping.Value] is string value)
				{
					options.GetType().GetProperty(mapping.Key)?.SetValue(options, value);
				}
			}
		});
	}

	[SuppressMessage("Style", "IDE0051:Remove unused private members", Justification = "Pending Implementation")]
	private static void AddLocalConfiguration(this WebApplicationBuilder builder)
	{
		var services = builder.Services;
		var configuration = builder.Configuration;


		services.AddSingleton<IOptionsManager, LocalOptionsManager>();
		services.Configure<LocalOptions>(configuration.GetSection(nameof(LocalOptions)));
	}


	/// <summary>
	/// Adds general domain configurations to the WebApplicationBuilder instance.
	/// </summary>
	/// <param name="builder">The WebApplicationBuilder instance.</param>
	/// <returns>The modified IServiceCollection instance.</returns>
	/// <remarks>
	/// This method configures various services and settings related to the general domain.
	/// It adds authorization, API explorer endpoints, Swagger documentation generation, HTTP client, HTTP context accessor,
	/// localization support, key vault service, connection strings, cross-origin resource sharing (CORS), health checks,
	/// and Azure services integration.
	/// </remarks>
	/// <example>
	/// <code>
	/// // Configure general domain configurations
	/// services.AddGeneralDomainConfiguration(builder);
	/// </code>
	/// </example>
	/// <seealso cref="WebApplicationBuilder"/>
	/// <seealso cref="IServiceCollection"/>
	public static void AddGeneralDomainConfiguration(this WebApplicationBuilder builder)
	{
		var services = builder.Services;
		var configuration = builder.Configuration;
		var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development";
		Console.WriteLine(">>> Environment: " + environment);

		#region Setting up the service configuration.
		configuration.AddEnvironmentVariables();
		configuration.AddJsonFile("appsettings.json", optional: false, reloadOnChange: true);
		configuration.AddJsonFile($"appsettings.{environment}.json", optional: false, reloadOnChange: true);

		// TODO: add logic to differentiate between local and cloud environments.
		if (true == true)
		{
			AddAzureConfiguration(builder);
		}
		#endregion

		services.AddHttpClient();
		services.AddHttpContextAccessor();
		services.AddCors(options =>
		{
			options.AddPolicy("AllowAllOrigins", builder =>
			{
				builder
					.AllowAnyOrigin()
					.AllowAnyMethod()
					.AllowAnyHeader();
			});
		});

		services.AddLocalization();
		services.AddEndpointsApiExplorer();
		services.AddSwaggerGen(SwaggerConfigurationService.GetSwaggerGenOptions());
		services.AddHealthChecks();

		builder.AddTelemetry();
		builder.AddOTelLogging();
		builder.AddOTelMetering();
		builder.AddOTelTracing();
		builder.AddAuthServices();
	}
}
