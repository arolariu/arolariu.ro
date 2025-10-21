namespace arolariu.Backend.Core.Tests.Common.DDD;

using System;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Core.Tests.Shared.TestDoubles;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Tests for the base entity abstraction verifying audit field initialization, soft delete behavior,
/// update simulation and importance flag toggling. Method names follow the mandated
/// MethodName_Condition_ExpectedResult pattern.
/// </summary>
[SuppressMessage("Design", "CA1515", Justification = "Public class required for MSTest discovery.")]
[SuppressMessage("Naming", "CA1707", Justification = "Underscore naming enforced across test suite.")]
[TestClass]
public sealed class BaseEntityTests
{
  /// <summary>Ensures initial state sets created and last updated timestamps and not soft deleted.</summary>
  [TestMethod]
  public void DefaultInitialization_SetsCreatedAndLastUpdated_NotSoftDeleted()
  {
    // Arrange
    var userId = Guid.NewGuid();

    // Act
    var entity = new TestEntity { CreatedBy = userId };

    // Assert
    Assert.AreNotEqual(Guid.Empty, entity.id, "Entity ID should be initialized and not Guid.Empty.");
    Assert.AreEqual(userId, entity.CreatedBy);
    Assert.IsFalse(entity.IsSoftDeleted);
    Assert.IsFalse(entity.IsImportant);
    Assert.AreEqual(0, entity.NumberOfUpdates);
    // LastUpdatedAt should be very close to CreatedAt (both set during construction)
    var delta = (entity.LastUpdatedAt - entity.CreatedAt).Duration();
    // MSTest signature is IsLessThan(upperBound, value). We want to assert delta.TotalSeconds < 1
    Assert.IsLessThan(1, delta.TotalSeconds, "LastUpdatedAt should initially match CreatedAt (within 1s).");
  }

  /// <summary>Verifies soft delete method marks entity as soft deleted.</summary>
  [TestMethod]
  public void SoftDelete_SetsFlagTrue()
  {
    var entity = new TestEntity { CreatedBy = Guid.NewGuid() };
    Assert.IsFalse(entity.IsSoftDeleted);
    entity.SoftDelete();
    Assert.IsTrue(entity.IsSoftDeleted);
  }

  /// <summary>Ensures updating increments NumberOfUpdates and sets audit fields.</summary>
  [TestMethod]
  public void SimulateUpdate_IncrementsNumberOfUpdatesAndSetsAuditFields()
  {
    var entity = new TestEntity { CreatedBy = Guid.NewGuid() };
    var updater = Guid.NewGuid();

    entity.SimulateUpdate(updater);

    Assert.AreEqual(1, entity.NumberOfUpdates);
    Assert.AreEqual(updater, entity.LastUpdatedBy);
    Assert.IsTrue(entity.LastUpdatedAt >= entity.CreatedAt);
  }

  /// <summary>Confirms importance flag can be toggled.</summary>
  [TestMethod]
  public void IsImportant_CanBeToggled()
  {
    var entity = new TestEntity { CreatedBy = Guid.NewGuid() };
    Assert.IsFalse(entity.IsImportant);
    entity.IsImportant = true;
    Assert.IsTrue(entity.IsImportant);
  }
}
