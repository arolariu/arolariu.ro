namespace LocalDevelopment.Data.Scenarios.Invoices;

/// <summary>Records the version and stable date of a resumable local scenario initialization.</summary>
internal sealed record SeedInitializationState(
  string ManifestVersion,
  DateOnly AnchorDateUtc,
  bool Completed);
