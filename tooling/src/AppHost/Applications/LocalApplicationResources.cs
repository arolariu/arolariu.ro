namespace AppHost.Applications;

using Aspire.Hosting.ApplicationModel;

/// <summary>Contains application handles whose lifecycle participates in a local data reset.</summary>
internal sealed record LocalApplicationResources(IResource Api, IResource Website, IResource Exp);
