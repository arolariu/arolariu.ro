namespace experiments.arolariu.ro;

/// <summary>Response for a single configuration value.</summary>
public sealed record ConfigValueResponse(string Key, string Value, DateTime FetchedAt);

/// <summary>Response for multiple configuration values.</summary>
public sealed record ConfigBatchResponse(IReadOnlyList<ConfigValueResponse> Values, DateTime FetchedAt);
