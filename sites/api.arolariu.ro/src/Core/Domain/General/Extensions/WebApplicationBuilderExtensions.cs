using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using System.Diagnostics.CodeAnalysis;

namespace arolariu.Backend.Core.Domain.General.Extensions;

/// <summary>
/// Extension methods for the <see cref="WebApplicationBuilder"/> builder.
/// This extension class acts as a IoC / DI container.
/// This class is used by the <see cref="Program"/> class.
/// This class represents the `Composition Root` of the application.
/// </summary>
[ExcludeFromCodeCoverage] // Infrastructure code is not tested currently.
internal static partial class WebApplicationBuilderExtensions
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
        ConfigureKeyVaultIntegration(builder);
        ConfigureHttpSettings(builder);
        ConfigureLocalization(builder);

        ConfigureSwaggerUI(builder);
        PopulateConfigurationWithCorrectValues(builder);
        ConfigureDataLayer(builder);
        ConfigureHealthChecks(builder);

        ConfigureObservability(builder);
    }
}
