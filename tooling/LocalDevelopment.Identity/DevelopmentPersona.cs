namespace LocalDevelopment.Identity;

/// <summary>
/// Describes one deterministic local development identity.
/// </summary>
internal sealed record DevelopmentPersona(
  string Key,
  string DisplayName,
  string Subject,
  Guid UserIdentifier,
  string Role);
