using AppHost.Applications;
using AppHost.Applications.Exp;
using AppHost.Infrastructure;
using AppHost.LocalDevelopment;
using AppHost.Repository;
using Aspire.Hosting;

var builder = DistributedApplication.CreateBuilder(args);
RepositoryLayout layout = RepositoryLayout.Resolve(builder.AppHostDirectory);
string sqlPasswordValue = builder.Configuration["Parameters:sql-password"]
    ?? throw new InvalidOperationException("Parameters:sql-password is required.");

// Complete the overlay before any configuration consumer starts.
ExpConfigGenerator.GenerateAspireConfig(
    sourcePath: layout.SourceConfigPath,
    targetPath: layout.GeneratedConfigPath,
    endpointOverrides: ExpResources.CreateEndpointOverrides(sqlPasswordValue));

LocalInfrastructure infrastructure = builder.AddInfrastructure(sqlPasswordValue);
var exp = builder.AddExp(infrastructure, layout);
LocalResources local = builder.AddLocalResources(infrastructure, exp, layout);
builder.AddApplications(layout, exp, local);

builder.Build().Run();
