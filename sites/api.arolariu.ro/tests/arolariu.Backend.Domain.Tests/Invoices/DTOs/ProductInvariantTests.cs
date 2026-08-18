namespace arolariu.Backend.Domain.Tests.Invoices.DTOs;

using System;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.Brokers.TaxonomyBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products.Exceptions;
using arolariu.Backend.Domain.Invoices.DTOs.Requests;
using arolariu.Backend.Domain.Invoices.Endpoints;
using arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;
using arolariu.Backend.Domain.Invoices.Services.Processing;

using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.VisualStudio.TestTools.UnitTesting;

using Moq;

/// <summary>
/// Verifies client-editable product invariants stop invalid data before aggregate mutation or persistence.
/// </summary>
[TestClass]
public sealed class ProductInvariantTests
{
  /// <summary>
  /// Verifies invalid product transport fails before the add-product endpoint reads or writes an invoice.
  /// </summary>
  [TestMethod]
  public async Task AddProductToInvoiceAsync_BlankProductName_DoesNotInvokeProcessingService()
  {
    // Arrange
    var processingService = new Mock<IInvoiceProcessingService>(MockBehavior.Strict);
    using ServiceProvider serviceProvider = new ServiceCollection().BuildServiceProvider();
    var accessor = new HttpContextAccessor
    {
      HttpContext = new DefaultHttpContext
      {
        RequestServices = serviceProvider,
        User = new ClaimsPrincipal(
          new ClaimsIdentity([new Claim("userIdentifier", Guid.CreateVersion7().ToString())], "Test")),
      },
    };
    var request = new CreateProductRequestDto(
      Name: " ",
      Classification: null,
      Quantity: 1m,
      QuantityUnit: "pcs",
      ProductCode: null,
      Price: 1m);

    // Act
    IResult result = await InvoiceEndpoints
      .AddProductToInvoiceAsync(processingService.Object, accessor, Guid.CreateVersion7(), request)
      .ConfigureAwait(false);

    // Assert
    Assert.IsInstanceOfType<IStatusCodeHttpResult>(result);
    Assert.AreEqual(StatusCodes.Status400BadRequest, ((IStatusCodeHttpResult)result).StatusCode);
    processingService.VerifyNoOtherCalls();
  }

  /// <summary>
  /// Verifies the update DTO rejects a nonpositive quantity before the selector can mutate a persisted product.
  /// </summary>
  [TestMethod]
  public void UpdateProductRequestDto_ZeroQuantity_ThrowsTypedValidationException()
  {
    // Arrange
    var request = new UpdateProductRequestDto(
      Selector: new ProductUpdateSelectorDto("SKU-1", null, null, null, null, null),
      Name: "Milk",
      Classification: null,
      Quantity: decimal.Zero,
      QuantityUnit: "pcs",
      ProductCode: "SKU-1",
      Price: 1m);

    // Act + Assert
    Assert.ThrowsExactly<ProductValidationException>(() => request.ToProduct());
  }

  /// <summary>
  /// Verifies the storage foundation rejects an invalid product before calling its persistence broker.
  /// </summary>
  [TestMethod]
  public async Task CreateInvoiceObject_InvalidProduct_DoesNotWriteInvoice()
  {
    // Arrange
    var storageBroker = new Mock<IInvoiceNoSqlBroker>(MockBehavior.Strict);
    var taxonomyBroker = new Mock<ITaxonomyBroker>(MockBehavior.Strict);
    var service = new InvoiceStorageFoundationService(
      storageBroker.Object,
      taxonomyBroker.Object,
      NullLoggerFactory.Instance);
    var invoice = new Invoice
    {
      id = Guid.CreateVersion7(),
      UserIdentifier = Guid.CreateVersion7(),
      Items =
      [
        new Product
        {
          Name = "Milk",
          Quantity = decimal.Zero,
          QuantityUnit = "pcs",
          Price = 1m,
          RequiresCommercialValidation = true,
        },
      ],
    };

    // Act + Assert
    InvoiceFoundationValidationException exception =
      await Assert.ThrowsExactlyAsync<InvoiceFoundationValidationException>(
        () => service.CreateInvoiceObject(invoice, invoice.UserIdentifier, CancellationToken.None))
      .ConfigureAwait(false);

    Assert.IsInstanceOfType<ProductValidationException>(exception.InnerException);
    storageBroker.VerifyNoOtherCalls();
  }
}
