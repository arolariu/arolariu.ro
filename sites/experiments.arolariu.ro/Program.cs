using Azure.Core;
using Azure.Identity;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Configuration.AzureAppConfiguration;
using Microsoft.Extensions.Hosting;

var infrastructure = Environment.GetEnvironmentVariable("INFRA") ?? "local";

var host = new HostBuilder()
    .ConfigureFunctionsWebApplication()
    .ConfigureAppConfiguration((context, configBuilder) =>
    {
        // Always load appsettings — use AzureWebJobsScriptRoot as base path
        var env = context.HostingEnvironment.EnvironmentName;
        var basePath = Environment.GetEnvironmentVariable("AzureWebJobsScriptRoot")
            ?? context.HostingEnvironment.ContentRootPath;
        configBuilder.SetBasePath(basePath);
        configBuilder.AddJsonFile("appsettings.json", optional: true, reloadOnChange: false);
        configBuilder.AddJsonFile($"appsettings.{env}.json", optional: true, reloadOnChange: false);

        if (infrastructure == "azure")
        {
            var clientId = Environment.GetEnvironmentVariable("AZURE_CLIENT_ID");
            var credentials = new DefaultAzureCredential(
                clientId is not null
                    ? new DefaultAzureCredentialOptions { ManagedIdentityClientId = clientId }
                    : new DefaultAzureCredentialOptions());

            // Load from current appsettings to get endpoints
            var tempConfig = configBuilder.Build();
            var configEndpoint = tempConfig["ApplicationOptions:ConfigurationEndpoint"]
                ?? throw new InvalidOperationException("ApplicationOptions:ConfigurationEndpoint required");
            var kvEndpoint = tempConfig["ApplicationOptions:SecretsEndpoint"]
                ?? throw new InvalidOperationException("ApplicationOptions:SecretsEndpoint required");

            var label = context.HostingEnvironment.IsProduction() ? "PRODUCTION" : "DEVELOPMENT";

            configBuilder.AddAzureAppConfiguration(config =>
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
            });

            configBuilder.AddAzureKeyVault(
                new Uri(kvEndpoint),
                credentials,
                new Azure.Extensions.AspNetCore.Configuration.Secrets.AzureKeyVaultConfigurationOptions
                {
                    ReloadInterval = TimeSpan.FromMinutes(15)
                });
        }
    })
    .Build();

host.Run();
