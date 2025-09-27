namespace arolariu.Backend.Core.Tests.CoreAuth.Models;

using System;
using arolariu.Backend.Core.Auth.Models;
using Microsoft.VisualStudio.TestTools.UnitTesting;

[TestClass]
public sealed class AuthenticatedUserAndRoleTests
{
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

  [TestMethod]
  public void AuthenticatedUser_Defaults_AreExpected()
  {
    var user = new AuthenticatedUser();
    Assert.IsNull(user.Name);
    Assert.AreEqual(default, user.DateOfBirth);
    Assert.IsFalse(user.EmailConfirmed);
  }

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
