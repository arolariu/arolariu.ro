namespace arolariu.Backend.Core.Tests.CoreAuth.Models;

using System;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Core.Auth.Models;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Tests for <see cref="AuthenticatedUser"/> and <see cref="AuthenticatedUserRole"/> covering property persistence
/// and default value expectations. Method names follow the MethodName_Condition_ExpectedResult pattern.
/// </summary>
[SuppressMessage("Design", "CA1515", Justification = "Public test class required for MSTest discovery.")]
[SuppressMessage("Naming", "CA1707", Justification = "Underscore naming convention enforced across test suite.")]
[TestClass]
public sealed class AuthenticatedUserAndRoleTests
{
  /// <summary>Ensures explicit property assignment persists values.</summary>
  [TestMethod]
  public void AuthenticatedUser_PropertyAssignment_PersistsValues()
  {
    var dob = new DateOnly(1990, 5, 15);
    var user = new AuthenticatedUser
    {
      UserName = "john.doe@example.com",
      Email = "john.doe@example.com",
      Name = "John Doe",
      DateOfBirth = dob,
      EmailConfirmed = true
    };

    Assert.AreEqual("john.doe@example.com", user.UserName);
    Assert.AreEqual("john.doe@example.com", user.Email);
    Assert.AreEqual("John Doe", user.Name);
    Assert.AreEqual(dob, user.DateOfBirth);
    Assert.IsTrue(user.EmailConfirmed);
  }

  /// <summary>Validates expected default values on new instance.</summary>
  [TestMethod]
  public void AuthenticatedUser_Defaults_AreExpected()
  {
    var user = new AuthenticatedUser();
    Assert.IsNull(user.Name);
    Assert.AreEqual(default, user.DateOfBirth);
    Assert.IsFalse(user.EmailConfirmed);
  }

  /// <summary>Verifies role can set name and normalized name along with non-empty identifier.</summary>
  [TestMethod]
  public void AuthenticatedUserRole_CanSetNameAndNormalizedName()
  {
    var role = new AuthenticatedUserRole
    {
      Id = Guid.NewGuid(),
      Name = "Administrator",
      NormalizedName = "ADMINISTRATOR"
    };

    Assert.AreEqual("Administrator", role.Name);
    Assert.AreEqual("ADMINISTRATOR", role.NormalizedName);
    Assert.AreNotEqual(Guid.Empty, role.Id);
  }
}
