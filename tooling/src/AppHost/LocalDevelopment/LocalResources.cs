namespace AppHost.LocalDevelopment;

using Aspire.Hosting.ApplicationModel;

/// <summary>Contains the local-only helper processes required by API startup.</summary>
internal sealed record LocalResources(
  IResourceBuilder<ProjectResource> Bootstrap,
  IResourceBuilder<ProjectResource> Identity);
