namespace AppHost.LocalDevelopment.Reset;

using AppHost.Applications;
using AppHost.Infrastructure;

/// <summary>Identifies the data volumes explicitly owned by one local reset scope.</summary>
internal sealed record LocalDataResetVolumeNames(string Cosmos, string Storage, string Sql);

/// <summary>Contains only captured native resources, never arbitrary configuration-selected targets.</summary>
internal sealed record LocalDataResetResources(
  LocalInfrastructure Infrastructure,
  LocalResources Helpers,
  LocalApplicationResources Applications,
  LocalDataResetVolumeNames Volumes);
