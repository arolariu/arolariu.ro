namespace arolariu.Backend.Core.Tests.Shared.TestDoubles;

using System;

using arolariu.Backend.Common.DDD.Contracts;

/// <summary>
/// Concrete test entity used to exercise the generic BaseEntity{T} abstract implementation.
/// </summary>
internal sealed class TestEntity : BaseEntity<Guid>
{
  public override Guid id { get; init; } = Guid.NewGuid();

  public string Payload { get; set; } = string.Empty;

  /// <summary>
  /// Helper to simulate a business update (adjusts audit-like fields).
  /// Note: BaseEntity does not provide built-in mutation helpers, so we expose one for tests.
  /// </summary>
  public void SimulateUpdate(Guid userId)
  {
    LastUpdatedBy = userId;
    LastUpdatedAt = DateTimeOffset.UtcNow;
    NumberOfUpdates++;
  }
}
