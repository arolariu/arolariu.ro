using AppHost;
using AppHost.Applications;
using AppHost.Applications.Exp;
using AppHost.Infrastructure;
using AppHost.LocalDevelopment;
using AppHost.LocalDevelopment.Reset;
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

LocalInfrastructure infrastructure = builder.AddInfrastructure(sqlPasswordValue);
var exp = builder.AddExp(infrastructure, layout);
LocalResources local = builder.AddLocalResources(infrastructure, exp, layout);
var applications = builder.AddApplications(layout, exp, local);
builder.AddLocalDataReset(new(infrastructure, local, applications,
  new(Constants.CosmosDataVolumeEn20261008, Constants.AzuriteDataVolumeV3_35_0, Constants.SqlDataVolumeV16_0_4305_5)));

builder.Build().Run();
