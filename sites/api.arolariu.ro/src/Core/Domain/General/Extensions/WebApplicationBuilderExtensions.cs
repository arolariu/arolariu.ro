namespace arolariu.Backend.Core.Domain.General.Extensions;
using arolariu.Backend.Common.Options;
using arolariu.Backend.Common.Services.KeyVault;
using arolariu.Backend.Common.Telemetry;
using arolariu.Backend.Common.Telemetry.Logging;
using arolariu.Backend.Common.Telemetry.Metering;
using arolariu.Backend.Common.Telemetry.Tracing;
using arolariu.Backend.Core.Domain.General.Services.Swagger;

using Azure.Core;
using Azure.Extensions.AspNetCore.Configuration.Secrets;
using Azure.Identity;

using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Text;

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

		#region Setting up the service configuration.
		configuration.AddEnvironmentVariables();
		configuration.AddJsonFile("appsettings.json");
		configuration.AddAzureKeyVault(
			vaultUri: new Uri(configuration["AzureOptions:KeyVaultEndpoint"]!),
			credential: new DefaultAzureCredential(new DefaultAzureCredentialOptions()
			{
				Retry =
					{
						MaxRetries = 10,
						Mode = RetryMode.Exponential,
						Delay = TimeSpan.FromSeconds(30),
						NetworkTimeout = TimeSpan.FromSeconds(300)
					}
			}),
			options: new AzureKeyVaultConfigurationOptions()
			{
				ReloadInterval = TimeSpan.FromMinutes(30)
			});
		configuration.AddAzureAppConfiguration(config =>
		{
			config.ConfigureKeyVault(kv =>
			{
				kv.SetCredential(new DefaultAzureCredential(new DefaultAzureCredentialOptions()
				{
					Retry =
					{
						MaxRetries = 10,
						Mode = RetryMode.Exponential,
						Delay = TimeSpan.FromSeconds(30),
						NetworkTimeout = TimeSpan.FromSeconds(300)
					}
				}));
				kv.SetSecretRefreshInterval(TimeSpan.FromMinutes(30));
			});

			config.ConfigureClientOptions(options =>
			{
				options.Retry.MaxRetries = 10;
				options.Retry.Mode = RetryMode.Exponential;
				options.Retry.Delay = TimeSpan.FromSeconds(30);
				options.Retry.NetworkTimeout = TimeSpan.FromSeconds(300);
			});

			var connectionString = configuration["ConfigurationStore"];
			config.Connect(connectionString);
		});


		services.Configure<AuthOptions>(configuration.GetSection(nameof(AuthOptions)));
		services.Configure<AzureOptions>(configuration.GetSection(nameof(AzureOptions)));
		services.Configure<CommonOptions>(configuration.GetSection(nameof(CommonOptions)));
		services.AddSingleton<IKeyVaultService, KeyVaultService>();
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

		builder.AddTelemetry();
		builder.AddOTelLogging();
		builder.AddOTelMetering();
		builder.AddOTelTracing();

		services.AddHealthChecks();

		#region AuthN & AuthZ configuration.
		services.AddAuthentication(authOptions =>
		{
			authOptions.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
			authOptions.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
			authOptions.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
		}).AddJwtBearer(jwtOptions =>
		{
			var authConfig = builder.Configuration.GetSection("AuthOptions");
			jwtOptions.TokenValidationParameters = new()
			{
				ValidIssuer = authConfig["Issuer"],
				ValidAudience = authConfig["Audience"],
				IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(authConfig["Secret"]!)),
				ValidateIssuer = true,
				ValidateAudience = true,
				ValidateLifetime = true,
				ValidateIssuerSigningKey = true,
			};
		});

		services.AddAuthorization();
		#endregion
	}
}
