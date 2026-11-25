using AppHost;
using AppHost.Applications.Exp;
using AppHost.LocalDevelopment;
using AppHost.Repository;

// An explicit scoped request must never fall through to the default profile or its overlay.
// Program intentionally has no verifier/dispatch adapter in Task 4.
string? scopedDescriptor = Environment.GetEnvironmentVariable(WorktreeLaunchScope.DescriptorEnvironmentVariable);
if (scopedDescriptor is not null || args.Any(argument =>
    argument.Equals("--worktree-descriptor", StringComparison.OrdinalIgnoreCase)
    || argument.StartsWith("--worktree-descriptor=", StringComparison.OrdinalIgnoreCase)))
{
    _ = WorktreeLaunchScope.Load(scopedDescriptor ?? string.Empty, Directory.GetCurrentDirectory());
}

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
