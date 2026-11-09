using AppHost;
using AppHost.Applications.Exp;
using AppHost.Repository;

var builder = DistributedApplication.CreateBuilder(args);
RepositoryLayout layout = RepositoryLayout.Resolve(builder.AppHostDirectory);
string sqlPasswordValue = builder.Configuration["Parameters:sql-password"]
    ?? throw new InvalidOperationException("Parameters:sql-password is required.");

// Complete the overlay before any configuration consumer starts.
ExpConfigGenerator.GenerateAspireConfig(
    sourcePath: layout.SourceConfigPath,
    targetPath: layout.GeneratedConfigPath,
    endpointOverrides: ExpResources.CreateEndpointOverrides(sqlPasswordValue));

LocalApplication.Compose(builder, layout, sqlPasswordValue);

builder.Build().Run();
