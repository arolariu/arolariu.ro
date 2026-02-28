namespace experiments.arolariu.ro;

using System;
using System.Collections.Generic;
using System.Linq;

using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

/// <summary>
/// Azure Functions HTTP triggers for the configuration proxy service.
/// All config values are served from the IConfiguration singleton which is
/// populated from Azure App Configuration + Key Vault (in Azure mode) or
/// appsettings.json (in local mode).
/// </summary>
public sealed class ConfigFunctions(IConfiguration configuration, ILogger<ConfigFunctions> logger)
{
    /// <summary>
    /// Health check endpoint. Always public — not behind auth.
    /// GET /api/health
    /// </summary>
    [Function("GetHealth")]
    public IActionResult GetHealth(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "health")] HttpRequest req)
    {
        var infra = Environment.GetEnvironmentVariable("INFRA") ?? "local";
        return new OkObjectResult(new { status = "Healthy", environment = infra, timestamp = DateTime.UtcNow });
    }

    /// <summary>
    /// Get a single configuration value by key.
    /// GET /api/config/{key}
    /// </summary>
    [Function("GetConfigValue")]
    public IActionResult GetConfigValue(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "config/{*key}")] HttpRequest req,
        string key)
    {
        logger.LogInformation("Fetching config key: {Key}", key);

        var value = configuration[key];
        if (value is null)
        {
            return new NotFoundObjectResult(new { error = $"Key '{key}' not found" });
        }

        return new OkObjectResult(new ConfigValueResponse(key, value, DateTime.UtcNow));
    }

    /// <summary>
    /// Get multiple configuration values by keys or prefix.
    /// GET /api/config?keys=key1,key2  or  GET /api/config?prefix=Endpoints
    /// </summary>
    [Function("GetConfigBatch")]
    public IActionResult GetConfigBatch(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "config")] HttpRequest req)
    {
        var keys = req.Query["keys"].FirstOrDefault();
        var prefix = req.Query["prefix"].FirstOrDefault();

        if (keys is not null)
        {
            var keyList = keys.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            var values = keyList
                .Select(k => new ConfigValueResponse(k, configuration[k] ?? string.Empty, DateTime.UtcNow))
                .ToList();

            logger.LogInformation("Fetched {Count} config keys", values.Count);
            return new OkObjectResult(new ConfigBatchResponse(values, DateTime.UtcNow));
        }

        if (prefix is not null)
        {
            var section = configuration.GetSection(prefix);
            var values = section.GetChildren()
                .Select(c => new ConfigValueResponse($"{prefix}:{c.Key}", c.Value ?? string.Empty, DateTime.UtcNow))
                .ToList();

            logger.LogInformation("Fetched {Count} config keys with prefix '{Prefix}'", values.Count, prefix);
            return new OkObjectResult(new ConfigBatchResponse(values, DateTime.UtcNow));
        }

        return new BadRequestObjectResult(new { error = "Provide 'keys' or 'prefix' query parameter" });
    }
}
