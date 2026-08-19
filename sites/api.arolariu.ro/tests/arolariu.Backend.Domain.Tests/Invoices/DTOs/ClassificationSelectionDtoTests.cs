namespace arolariu.Backend.Domain.Tests.Invoices.DTOs;

using System;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DTOs.Requests;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Verifies minimal classification request conversion.</summary>
[TestClass]
public sealed class ClassificationSelectionDtoTests
{
  /// <summary>Verifies a valid request produces normalized domain mutation input.</summary>
  [TestMethod]
  public void ToSelection_ValidDto_ReturnsMinimalDomainSelection()
  {
    var dto = new ClassificationSelectionDto(ClassificationSystem.Nace21, " 47.11 ");

    ClassificationSelection selection = dto.ToSelection();

    Assert.AreEqual(ClassificationSystem.Nace21, selection.System);
    Assert.AreEqual("47.11", selection.Code);
  }

  /// <summary>Verifies a blank request code is rejected by domain validation.</summary>
  [TestMethod]
  public void ToSelection_BlankCode_ThrowsArgumentException()
  {
    var dto = new ClassificationSelectionDto(ClassificationSystem.Nace21, "");

    Assert.ThrowsExactly<ArgumentException>(() => dto.ToSelection());
  }
}
