namespace arolariu.Backend.Common.Configuration;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Common.Options;

using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

/// <summary>Background service that refreshes config from the proxy every 5 minutes.</summary>
/// <param name="serviceProvider">The service provider for creating scoped services.</param>
/// <param name="optionsMonitor">The options monitor for accessing current Azure options.</param>
/// <param name="logger">The logger for recording refresh events and errors.</param>
public sealed class ConfigRefreshHostedService(
    IServiceProvider serviceProvider,
    IOptionsMonitor<AzureOptions> optionsMonitor,
    ILogger<ConfigRefreshHostedService> logger) : BackgroundService
{
    private static readonly TimeSpan RefreshInterval = TimeSpan.FromMinutes(5);

    private static readonly string[] ConfigKeys =
    [
        "Common:Auth:Secret", "Common:Auth:Issuer", "Common:Auth:Audience",
        "Common:Azure:TenantId", "Endpoints:OpenAI", "Endpoints:SqlServer",
        "Endpoints:NoSqlServer", "Endpoints:StorageAccount",
        "Endpoints:ApplicationInsights", "Endpoints:CognitiveServices",
        "Endpoints:CognitiveServices:Key"
    ];

    /// <inheritdoc />
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(RefreshInterval, stoppingToken).ConfigureAwait(false);

            try
            {
                using var scope = serviceProvider.CreateScope();
                var proxyClient = scope.ServiceProvider.GetRequiredService<IConfigProxyClient>();
                var values = await proxyClient.GetValuesAsync(ConfigKeys, stoppingToken).ConfigureAwait(false);

                // Note: Directly mutating CurrentValue works because AzureOptions properties are mutable
                // and CloudOptionsManager returns CurrentValue by reference. For truly reactive options,
                // consider implementing IOptionsChangeTokenSource<AzureOptions> in a future iteration.
                var opts = optionsMonitor.CurrentValue;
                opts.JwtSecret = values.GetValueOrDefault("Common:Auth:Secret", opts.JwtSecret);
                opts.JwtIssuer = values.GetValueOrDefault("Common:Auth:Issuer", opts.JwtIssuer);
                opts.JwtAudience = values.GetValueOrDefault("Common:Auth:Audience", opts.JwtAudience);
                opts.TenantId = values.GetValueOrDefault("Common:Azure:TenantId", opts.TenantId);
                opts.OpenAIEndpoint = values.GetValueOrDefault("Endpoints:OpenAI", opts.OpenAIEndpoint);
                opts.SqlConnectionString = values.GetValueOrDefault("Endpoints:SqlServer", opts.SqlConnectionString);
                opts.NoSqlConnectionString = values.GetValueOrDefault("Endpoints:NoSqlServer", opts.NoSqlConnectionString);
                opts.StorageAccountEndpoint = values.GetValueOrDefault("Endpoints:StorageAccount", opts.StorageAccountEndpoint);
                opts.ApplicationInsightsEndpoint = values.GetValueOrDefault("Endpoints:ApplicationInsights", opts.ApplicationInsightsEndpoint);
                opts.CognitiveServicesEndpoint = values.GetValueOrDefault("Endpoints:CognitiveServices", opts.CognitiveServicesEndpoint);
                opts.CognitiveServicesKey = values.GetValueOrDefault("Endpoints:CognitiveServices:Key", opts.CognitiveServicesKey);

                logger.LogInformation("Config refreshed from proxy at {Timestamp}", DateTime.UtcNow);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Config refresh failed. Retrying in {Interval}.", RefreshInterval);
            }
        }
    }
}
