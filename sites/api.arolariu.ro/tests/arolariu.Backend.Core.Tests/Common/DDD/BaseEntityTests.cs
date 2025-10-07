namespace arolariu.Backend.Core.Tests.Common.DDD;

using System;

using arolariu.Backend.Core.Tests.Shared.TestDoubles;

using Microsoft.VisualStudio.TestTools.UnitTesting;

[TestClass]
public sealed class BaseEntityTests
{
  [TestMethod]

  public void DefaultInitialization_SetsCreatedAndLastUpdated_NotSoftDeleted()
  {
    // Arrange
    var userId = Guid.NewGuid();

    // Act
    var entity = new TestEntity { CreatedBy = userId };

    // Assert
    Assert.AreNotEqual(Guid.Empty, entity.Id, "Entity ID should be initialized and not Guid.Empty.");
    Assert.AreEqual(userId, entity.CreatedBy);
    Assert.IsFalse(entity.IsSoftDeleted);
    Assert.IsFalse(entity.IsImportant);
    Assert.AreEqual(0, entity.NumberOfUpdates);
    // LastUpdatedAt should be very close to CreatedAt (both set during construction)
    var delta = (entity.LastUpdatedAt - entity.CreatedAt).Duration();
    Assert.IsLessThan(1, delta.TotalSeconds, "LastUpdatedAt should initially match CreatedAt (within 1s).");
  }

  [TestMethod]
  public void SoftDelete_SetsFlagTrue()
  {
    var entity = new TestEntity { CreatedBy = Guid.NewGuid() };
    Assert.IsFalse(entity.IsSoftDeleted);
    entity.SoftDelete();
    Assert.IsTrue(entity.IsSoftDeleted);
  }

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

  [TestMethod]
  public void IsImportant_CanBeToggled()
  {
    var entity = new TestEntity { CreatedBy = Guid.NewGuid() };
    Assert.IsFalse(entity.IsImportant);
    entity.IsImportant = true;
    Assert.IsTrue(entity.IsImportant);
  }
}
