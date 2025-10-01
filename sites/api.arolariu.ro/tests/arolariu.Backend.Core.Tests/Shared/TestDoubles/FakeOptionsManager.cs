namespace arolariu.Backend.Core.Tests.Shared.TestDoubles;

using arolariu.Backend.Common.Options;

/// <summary>
/// Simple in-memory implementation of IOptionsManager for unit tests.
/// Returns a preconfigured ApplicationOptions instance supplied at construction.
/// </summary>
internal sealed class FakeOptionsManager : IOptionsManager
{
  private readonly ApplicationOptions _options;

  public FakeOptionsManager(ApplicationOptions options) => _options = options;

  public ApplicationOptions GetApplicationOptions() => _options;
}
