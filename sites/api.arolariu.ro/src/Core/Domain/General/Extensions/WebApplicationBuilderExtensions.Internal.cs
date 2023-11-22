<<<<<<< HEAD
﻿using arolariu.Backend.Common.Telemetry;
using arolariu.Backend.Common.Telemetry.Logging;
=======
﻿using arolariu.Backend.Common.Telemetry.Logging;
>>>>>>> main
using arolariu.Backend.Common.Telemetry.Metering;
using arolariu.Backend.Common.Telemetry.Tracing;
using arolariu.Backend.Core.DAL.Database;
using arolariu.Backend.Core.Domain.General.Services.KeyVault;
using arolariu.Backend.Core.Domain.General.Services.Swagger;
using Azure.Identity;

using Microsoft.AspNetCore.Builder;
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.DependencyInjection;

using System;
using System.Data;

namespace arolariu.Backend.Core.Domain.General.Extensions;

internal static partial class WebApplicationBuilderExtensions
{
    private static void ConfigureLocalization(WebApplicationBuilder builder)
    {
        builder.Services.AddLocalization();
    }

    private static void ConfigureSwaggerUI(WebApplicationBuilder builder)
    {
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen(SwaggerConfigurationService.GetSwaggerGenOptions());
    }

    private static void ConfigureDataLayer(WebApplicationBuilder builder)
    {
        var services = builder.Services;
        var config = builder.Configuration;

        // Configure the No-SQL implementation
        services
            .AddSingleton<IDbConnectionFactory<IDbConnection>>(new SqlDbConnectionFactory(config));

        // Configure the SQL implementation
        services
            .AddSingleton<IDbConnectionFactory<CosmosClient>>(new NoSqlDbConnectionFactory(config));
    }

    private static void ConfigureKeyVaultIntegration(WebApplicationBuilder builder)
    {
        builder.Services.AddSingleton<IKeyVaultService, KeyVaultService>();
    }

    private static void ConfigureHttpSettings(WebApplicationBuilder builder)
    {
        builder.Services.AddHttpClient();
        builder.Services.AddHttpContextAccessor();
        builder.Services.AddCors(options =>
        {
            options.AddPolicy("AllowAllOrigins", builder =>
            {
                builder
                    .AllowAnyOrigin()
                    .AllowAnyMethod()
                    .AllowAnyHeader();
            });
        });
    }

    private static void ConfigureHealthChecks(WebApplicationBuilder builder)
    {
        var services = builder.Services;
        var config = builder.Configuration;

        services
            .AddHealthChecks()
            .AddSqlServer(config["Azure:SQL-DB:ConnectionString"]!)
            .AddAzureBlobStorage(config["Azure:Storage:ConnectionString"]!)
            .AddAzureKeyVault(
                new Uri(config["Azure:KeyVault:Uri"]!),
                new DefaultAzureCredential(),
                options => { });
    }

    private static void PopulateConfigurationWithCorrectValues(WebApplicationBuilder builder)
    {
        var keyVaultService = builder.Services.BuildServiceProvider().GetRequiredService<IKeyVaultService>();

        #region Populate the Azure services connection details:

        #region OpenAI configuration
        builder.Configuration["Azure:OpenAI:EndpointName"] =
            keyVaultService.GetSecret("OpenAiEndpoint");

        builder.Configuration["Azure:OpenAI:EndpointKey"] =
            keyVaultService.GetSecret("OpenAiKey");
        #endregion

        #region Cognitive Services configuration
        builder.Configuration["Azure:CognitiveServices:EndpointName"] =
            keyVaultService.GetSecret("arolariu-cognitive-services-endpoint");

        builder.Configuration["Azure:CognitiveServices:EndpointKey"] =
            keyVaultService.GetSecret("arolariu-cognitive-services-connString");
        #endregion

        #region SQL database configuration
        builder.Configuration["Azure:SQL-DB:ConnectionString"] =
            keyVaultService.GetSecret("arolariu-sql-connstring");
        #endregion

        #region NoSQL database configuration
        builder.Configuration["Azure:NoSQL-DB:ConnectionString"] =
            keyVaultService.GetSecret("arolariu-cosmosdb-connstring");
        #endregion

        #region Storage configuration
        builder.Configuration["Azure:Storage:ConnectionString"] =
            keyVaultService.GetSecret("arolariu-storage-connstring");
        #endregion

        #region JWT configuration
        builder.Configuration["JWT:Secret"] = keyVaultService.GetSecret("jwt-secret");
        builder.Configuration["JWT:Issuer"] = keyVaultService.GetSecret("jwt-issuer");
        builder.Configuration["JWT:Audience"] = keyVaultService.GetSecret("jwt-audience");
        #endregion

        #region OTel configuration
        builder.Configuration["OTel:InstrumentationKey"] = keyVaultService.GetSecret("OTel-InstrumentationKey");
        #endregion

        #endregion
    }

    private static void ConfigureObservability(WebApplicationBuilder builder)
    {
<<<<<<< HEAD
        builder.AddTelemetry();
=======
>>>>>>> main
        builder.AddOTelLogging();
        builder.AddOTelMetering();
        builder.AddOTelTracing();
    }
}
