using Azure.Core;
using Azure.Identity;
using Microsoft.Extensions.Configuration.AzureAppConfiguration;
using experiments.arolariu.ro;

var builder = WebApplication.CreateBuilder(args);

var infrastructure = Environment.GetEnvironmentVariable("INFRA") ?? "local";
var environment = builder.Environment.EnvironmentName;

IConfigurationRoot? configProvider = null;

if (infrastructure == "azure")
{
    var clientId = Environment.GetEnvironmentVariable("AZURE_CLIENT_ID");
    var credentials = new DefaultAzureCredential(
        clientId is not null
            ? new DefaultAzureCredentialOptions { ManagedIdentityClientId = clientId }
            : new DefaultAzureCredentialOptions());

    var configEndpoint = builder.Configuration["ApplicationOptions:ConfigurationEndpoint"]
        ?? throw new InvalidOperationException("ApplicationOptions:ConfigurationEndpoint required");
    var kvEndpoint = builder.Configuration["ApplicationOptions:SecretsEndpoint"]
        ?? throw new InvalidOperationException("ApplicationOptions:SecretsEndpoint required");

    var label = environment == "Production" ? "PRODUCTION" : "DEVELOPMENT";

    configProvider = new ConfigurationBuilder()
        .AddAzureAppConfiguration(config =>
        {
            config.Connect(new Uri(configEndpoint), credentials);
            config.Select("*", labelFilter: label);
            config.ConfigureKeyVault(kv =>
            {
                kv.SetCredential(credentials);
                kv.SetSecretRefreshInterval(TimeSpan.FromMinutes(15));
            });
            config.ConfigureRefresh(refresh =>
            {
                refresh.RegisterAll();
                refresh.SetRefreshInterval(TimeSpan.FromMinutes(5));
            });
            config.ConfigureClientOptions(options =>
            {
                options.Retry.MaxRetries = 10;
                options.Retry.Mode = RetryMode.Exponential;
                options.Retry.Delay = TimeSpan.FromSeconds(30);
                options.Retry.NetworkTimeout = TimeSpan.FromSeconds(300);
            });
        })
        .AddAzureKeyVault(
            new Uri(kvEndpoint),
            credentials,
            new Azure.Extensions.AspNetCore.Configuration.Secrets.AzureKeyVaultConfigurationOptions
            {
                ReloadInterval = TimeSpan.FromMinutes(15)
            })
        .Build();

    // Entra ID authentication -- only in Azure mode
    builder.Services.AddAuthentication().AddJwtBearer();
    builder.Services.AddAuthorization();
}
else
{
    // Local mode: read from appsettings.json / env vars -- NO auth
    configProvider = new ConfigurationBuilder()
        .AddJsonFile("appsettings.json", optional: true)
        .AddJsonFile($"appsettings.{environment}.json", optional: true)
        .AddEnvironmentVariables()
        .Build();
}

builder.Services.AddSingleton<IConfiguration>(configProvider);
builder.Services.AddHealthChecks();

var app = builder.Build();

if (infrastructure == "azure")
{
    app.UseAuthentication();
    app.UseAuthorization();
}

// Health endpoint -- always public
app.MapHealthChecks("/health");
app.MapGet("/", () => Results.Ok(new { status = "Healthy", environment = infrastructure, timestamp = DateTime.UtcNow }));

// Config endpoints -- protected in Azure mode
var configGroup = app.MapGroup("/config");
if (infrastructure == "azure")
{
    configGroup.RequireAuthorization();
}

// GET /config/{key} -- single value
configGroup.MapGet("/{*key}", (string key, IConfiguration config) =>
{
    var value = config[key];
    return value is not null
        ? Results.Ok(new ConfigValueResponse(key, value, DateTime.UtcNow))
        : Results.NotFound(new { error = $"Key '{key}' not found" });
});

// GET /config?keys=key1,key2 -- batch values
configGroup.MapGet("/", (string? keys, string? prefix, IConfiguration config) =>
{
    if (keys is not null)
    {
        var keyList = keys.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var values = keyList
            .Select(k => new ConfigValueResponse(k, config[k] ?? string.Empty, DateTime.UtcNow))
            .ToList();
        return Results.Ok(new ConfigBatchResponse(values, DateTime.UtcNow));
    }

    if (prefix is not null)
    {
        var section = config.GetSection(prefix);
        var values = section.GetChildren()
            .Select(c => new ConfigValueResponse($"{prefix}:{c.Key}", c.Value ?? string.Empty, DateTime.UtcNow))
            .ToList();
        return Results.Ok(new ConfigBatchResponse(values, DateTime.UtcNow));
    }

    return Results.BadRequest(new { error = "Provide 'keys' or 'prefix' query parameter" });
});

app.Run();
