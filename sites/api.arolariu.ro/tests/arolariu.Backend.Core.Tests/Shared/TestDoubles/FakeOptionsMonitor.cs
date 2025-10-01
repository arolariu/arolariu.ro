namespace arolariu.Backend.Core.Tests.Shared.TestDoubles;

using System;
using Microsoft.Extensions.Options;

/// <summary>
/// Minimal in-memory implementation of IOptionsMonitor for unit testing.
/// Provides a fixed current value and no-op change notifications.
/// </summary>
internal sealed class FakeOptionsMonitor<T> : IOptionsMonitor<T>
{
  private T _value;

  public FakeOptionsMonitor(T value)
  {
    _value = value;
  }

  public T CurrentValue => _value;

  public T Get(string? name) => _value;

  public IDisposable? OnChange(Action<T, string?> listener) => null;

  /// <summary>
  /// Allows tests to mutate the underlying current value if needed.
  /// </summary>
  public void Set(T newValue) => _value = newValue;
}
