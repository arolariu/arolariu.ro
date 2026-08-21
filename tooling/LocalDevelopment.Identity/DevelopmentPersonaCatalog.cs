namespace LocalDevelopment.Identity;

/// <summary>
/// Provides the fixed persona identities shared with the local seed fixture.
/// </summary>
internal static class DevelopmentPersonaCatalog
{
  internal static DevelopmentPersona Alice { get; } = new(
    "alice",
    "Alice — rich account",
    "alice@arolariu.ro",
    Guid.Parse("7574070c-3ee9-5031-9b1b-0dc08c61ee86"),
    "user");

  internal static DevelopmentPersona Bob { get; } = new(
    "bob",
    "Bob — clean slate",
    "bob@arolariu.ro",
    Guid.Parse("6a40503e-c1af-51b0-8b60-3c6648b3724e"),
    "user");

  internal static DevelopmentPersona Charlie { get; } = new(
    "charlie",
    "Charlie — light account",
    "charlie@arolariu.ro",
    Guid.Parse("fc687d5c-39d5-5541-868c-f76a3fdbd4e4"),
    "user");

  internal static IReadOnlyList<DevelopmentPersona> All { get; } =
    [Alice, Bob, Charlie];

  internal static bool TryGet(
    string key,
    out DevelopmentPersona? persona)
  {
    persona = All.FirstOrDefault(candidate =>
      string.Equals(candidate.Key, key, StringComparison.Ordinal));
    return persona is not null;
  }
}
