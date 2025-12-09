namespace arolariu.Backend.Core.Tests.Shared.TestDoubles;

using System;

using Microsoft.Extensions.Options;

/// <summary>
/// Minimal in-memory implementation of IOptionsMonitor for unit testing.
/// Provides a fixed current value and no-op change notifications.
/// </summary>
internal sealed class FakeOptionsMonitor<T> : IOptionsMonitor<T>
{
  public FakeOptionsMonitor(T value) => CurrentValue = value;

  public T CurrentValue { get; private set; }

  public T Get(string? name) => CurrentValue;

  public IDisposable? OnChange(Action<T, string?> listener) => null;

  /// <summary>
  /// Allows tests to mutate the underlying current value if needed.
  /// </summary>
  public void Set(T newValue) => CurrentValue = newValue;
}
