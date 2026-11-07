namespace AppHost;

using AppHost.Applications;
using AppHost.Applications.Api;
using AppHost.Applications.Exp;
using AppHost.Applications.JavaScript;
using AppHost.Applications.Website;
using AppHost.Infrastructure;
using AppHost.LocalDevelopment;
using AppHost.LocalDevelopment.Reset;
using AppHost.Repository;
using Aspire.Hosting;
using Aspire.Hosting.ApplicationModel;
using Aspire.Hosting.Python;

/// <summary>Contains the native handles registered by production composition.</summary>
internal sealed record LocalEnvironmentResources(
  LocalInfrastructure Infrastructure,
  IResourceBuilder<PythonAppResource> Exp,
  LocalResources Local,
  LocalApplicationResources Applications);

/// <summary>Owns cross-capability references, startup dependencies, and reset registration.</summary>
internal static class LocalApplication
{
  internal static LocalEnvironmentResources Compose(
    IDistributedApplicationBuilder builder, RepositoryLayout layout, string sqlPassword)
  {
    LocalInfrastructure infrastructure = builder.AddInfrastructure(sqlPassword);
    var exp = builder.AddExp(layout);
    var bootstrap = builder.AddBootstrap(builder.Configuration["SEED_DATA_DIRECTORY"] ?? "SeedData");
    var identity = builder.AddIdentity(layout);
    var npmInstall = builder.AddSharedNpmInstall(layout.RootDirectory);
    var api = builder.AddApi();
    var website = builder.AddWebsite(layout);
    AuxiliarySites auxiliary = builder.AddAuxiliarySites(layout);

    bootstrap.WithReference(infrastructure.CosmosDatabase)
      .WithReference(infrastructure.Blobs)
      .WithReference(infrastructure.Queues);
    api.WithReference(exp)
      .WithEnvironment("EXP_PROXY_URL", exp.GetEndpoint("http"))
      .WithEnvironment("LOCAL_DEVELOPMENT_IDENTITY_URL", identity.GetEndpoint("http"));
    website.WithReference(api)
      .WithReference(exp)
      .WithEnvironment("API_URL", api.GetEndpoint("http"))
      .WithEnvironment("EXP_PROXY_URL", exp.GetEndpoint("http"));

    WireStartupDependencies(infrastructure, bootstrap, exp, identity, api, website);
    website.UseSharedNpmInstall(npmInstall);
    auxiliary.Cv.UseSharedNpmInstall(npmInstall);
    auxiliary.Docs.UseSharedNpmInstall(npmInstall);
    auxiliary.Status.UseSharedNpmInstall(npmInstall);

    var local = new LocalResources(bootstrap, identity);
    var applications = new LocalApplicationResources(api.Resource, website.Resource, exp.Resource);
    builder.AddLocalDataReset(new(infrastructure, local, applications,
      new(Constants.CosmosDataVolumeEn20261008, Constants.AzuriteDataVolumeV3_35_0, Constants.SqlDataVolumeV16_0_4305_5)));
    return new(infrastructure, exp, local, applications);
  }

  internal static void WireStartupDependencies(
    LocalInfrastructure infrastructure,
    IResourceBuilder<IResourceWithWaitSupport> bootstrap,
    IResourceBuilder<IResourceWithWaitSupport> exp,
    IResourceBuilder<IResourceWithWaitSupport> identity,
    IResourceBuilder<IResourceWithWaitSupport> api,
    IResourceBuilder<IResourceWithWaitSupport> website)
  {
    bootstrap.WaitFor(infrastructure.CosmosInvoices)
      .WaitFor(infrastructure.CosmosMerchants)
      .WaitFor(infrastructure.Blobs)
      .WaitFor(infrastructure.Queues);
    exp.WaitFor(infrastructure.SqlDatabase)
      .WaitFor(infrastructure.Cosmos)
      .WaitFor(infrastructure.Storage)
      .WaitForCompletion(bootstrap);
    identity.WaitFor(exp);
    api.WaitForCompletion(bootstrap).WaitFor(identity).WaitFor(exp);
    website.WaitFor(api);
  }
}
