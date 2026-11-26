using AppHost;
using AppHost.Applications.Exp;
using AppHost.LocalDevelopment;
using AppHost.Repository;

string? descriptor = Environment.GetEnvironmentVariable(WorktreeLaunchScope.DescriptorEnvironmentVariable);
if (descriptor is not null && args is [WorktreeLaunchScope.RunArgument])
{
  try { await WorktreeForegroundRun.RunAsync(descriptor).ConfigureAwait(false); }
  catch (Exception error) when (error is not OutOfMemoryException)
  {
    Console.Error.WriteLine($"worktree-failure:{error.GetType().Name}");
    Environment.ExitCode = 1;
  }
}
else if (!await AppHostStartup.TryHandleRegistryAsync(args, descriptor, Console.Out).ConfigureAwait(false))
  AppHostStartup.Run(args, descriptor, RunLegacy);

static void RunLegacy(string[] args)
{
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
}
