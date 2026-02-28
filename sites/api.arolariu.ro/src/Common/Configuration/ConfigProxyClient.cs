namespace arolariu.Backend.Common.Configuration;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

/// <summary>HTTP client for the experiments.arolariu.ro config proxy.</summary>
public sealed class ConfigProxyClient(HttpClient httpClient) : IConfigProxyClient
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    /// <inheritdoc />
    public async Task<string?> GetValueAsync(string key, CancellationToken ct = default)
    {
        var response = await httpClient.GetAsync($"/api/config/{key}", ct).ConfigureAwait(false);
        if (!response.IsSuccessStatusCode) return null;

        var result = await response.Content.ReadFromJsonAsync<ConfigValueDto>(JsonOptions, ct).ConfigureAwait(false);
        return result?.Value;
    }

    /// <inheritdoc />
    public async Task<IReadOnlyDictionary<string, string>> GetValuesAsync(IEnumerable<string> keys, CancellationToken ct = default)
    {
        var keysParam = string.Join(",", keys);
        var response = await httpClient.GetAsync($"/api/config?keys={Uri.EscapeDataString(keysParam)}", ct).ConfigureAwait(false);
        if (!response.IsSuccessStatusCode) return new Dictionary<string, string>();

        var result = await response.Content.ReadFromJsonAsync<ConfigBatchDto>(JsonOptions, ct).ConfigureAwait(false);
        return result?.Values.ToDictionary(v => v.Key, v => v.Value) ?? new Dictionary<string, string>();
    }

    /// <summary>DTO for a single configuration value response.</summary>
    /// <param name="Key">The configuration key.</param>
    /// <param name="Value">The configuration value.</param>
    /// <param name="FetchedAt">Timestamp when the value was fetched.</param>
    private sealed record ConfigValueDto(string Key, string Value, DateTime FetchedAt);

    /// <summary>DTO for a batch configuration values response.</summary>
    /// <param name="Values">The list of configuration key-value pairs.</param>
    /// <param name="FetchedAt">Timestamp when the values were fetched.</param>
    private sealed record ConfigBatchDto(IReadOnlyList<ConfigValueDto> Values, DateTime FetchedAt);
}
