namespace LocalDevelopment.Identity.Personas;

/// <summary>
/// Provides the fixed persona identities shared with the local seed fixture.
/// </summary>
internal static class DevelopmentPersonaCatalog
{
  internal static DevelopmentPersona Alice { get; } = new(
    "alice",
    "Alice — uncommon account",
    "alice@arolariu.ro",
    Guid.Parse("7574070c-3ee9-5031-9b1b-0dc08c61ee86"),
    "user");

  internal static DevelopmentPersona Bob { get; } = new(
    "bob",
    "Bob — inactive account",
    "bob@arolariu.ro",
    Guid.Parse("6a40503e-c1af-51b0-8b60-3c6648b3724e"),
    "user");

  internal static DevelopmentPersona Charlie { get; } = new(
    "charlie",
    "Charlie — rare account",
    "charlie@arolariu.ro",
    Guid.Parse("fc687d5c-39d5-5541-868c-f76a3fdbd4e4"),
    "user");

  internal static DevelopmentPersona Dmitryi { get; } = new(
    "dmitryi",
    "Dmitryi — loyal account",
    "dmitryi@arolariu.ro",
    Guid.Parse("32a2818b-7844-59cf-a7c0-48d061cc86ae"),
    "user");

  internal static IReadOnlyList<DevelopmentPersona> All { get; } =
    [Alice, Bob, Charlie, Dmitryi];

  internal static bool TryGet(
    string key,
    out DevelopmentPersona? persona)
  {
    persona = All.FirstOrDefault(candidate =>
      string.Equals(candidate.Key, key, StringComparison.Ordinal));
    return persona is not null;
  }
}
