namespace arolariu.Backend.Domain.Tests.Integration;

using System;
using System.Net;
using System.Net.Http;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Categories;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.Endpoints;
using arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;
using arolariu.Backend.Domain.Invoices.Services.Management;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.AnalysisService;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.InvoiceService;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.MerchantService;
using arolariu.Backend.Domain.Invoices.Services.Processing;

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.VisualStudio.TestTools.UnitTesting;

using Moq;

/// <summary>Exercises JSON binding on real minimal API category mutation handlers.</summary>
[TestClass]
public sealed class InvoiceCategoryHttpBindingTests
{
  /// <summary>Bad category input must be rejected before a linked document can be written.</summary>
  [TestMethod]
  [DataRow("3001")]
  [DataRow("null")]
  [DataRow("\"2001\"")]
  [DataRow("")]
  public async Task AttachMerchant_BadCategory_DoesNotWriteInvoiceLink(string category)
  {
    Guid userId = Guid.NewGuid();
    var invoice = new Invoice { id = Guid.NewGuid(), UserIdentifier = userId };
    var management = new Mock<IInvoiceManagementService>();
    management.Setup(service => service.ReadInvoice(invoice.id, userId, It.IsAny<CancellationToken>()))
      .ReturnsAsync(invoice);

    await using var app = BuildApp(management.Object, userId);
    await app.StartAsync().ConfigureAwait(false);

    using var client = app.GetTestClient();
    string json = category.Length == 0
      ? """{"name":"Shop","description":"Store"}"""
      : $$"""{"name":"Shop","description":"Store","category":{{category}}}""";
    using var body = new StringContent(json, Encoding.UTF8, "application/json");
    using var response = await client.PostAsync(new Uri($"/rest/v1/invoices/{invoice.id}/merchant", UriKind.Relative), body).ConfigureAwait(false);

    Assert.AreEqual(HttpStatusCode.BadRequest, response.StatusCode);
    management.Verify(service => service.UpdateInvoice(invoice.id, userId, It.IsAny<Invoice>(), It.IsAny<CancellationToken>()), Times.Never);
  }

  /// <summary>Invalid category intent cannot update either side of a merchant relationship.</summary>
  [TestMethod]
  [DataRow("2001")]
  [DataRow("\"3001\"")]
  public async Task PatchInvoice_InvalidCategory_DoesNotTouchMerchantReference(string category)
  {
    Guid userId = Guid.NewGuid();
    var invoice = new Invoice { id = Guid.NewGuid(), UserIdentifier = userId };
    var merchant = new Merchant { id = Guid.NewGuid() };
    var management = new Mock<IInvoiceManagementService>();
    management.Setup(service => service.ReadInvoice(invoice.id, userId, It.IsAny<CancellationToken>())).ReturnsAsync(invoice);
    management.Setup(service => service.ReadMerchant(merchant.id, null, It.IsAny<CancellationToken>())).ReturnsAsync(merchant);
    await using var app = BuildApp(management.Object, userId);
    await app.StartAsync().ConfigureAwait(false);

    using var client = app.GetTestClient();
    using var body = new StringContent(
      $$"""{"merchantReference":"{{merchant.id}}","category":{{category}}}""", Encoding.UTF8, "application/json");
    using var response = await client.PatchAsync(new Uri($"/rest/v1/invoices/{invoice.id}", UriKind.Relative), body).ConfigureAwait(false);

    Assert.AreEqual(HttpStatusCode.BadRequest, response.StatusCode);
    Assert.IsEmpty(merchant.ReferencedInvoices);
    Assert.AreEqual(Guid.Empty, invoice.MerchantReference);
    management.Verify(service => service.ReadMerchant(merchant.id, null, It.IsAny<CancellationToken>()), Times.Never);
    management.Verify(service => service.UpdateInvoice(invoice.id, userId, It.IsAny<Invoice>(), It.IsAny<CancellationToken>()), Times.Never);
  }

  /// <summary>Edits commit once against the observed version and leave ambiguous/stale targets unchanged.</summary>
  [TestMethod]
  [DataRow("null", false, true, HttpStatusCode.Accepted)]
  [DataRow("1100", false, true, HttpStatusCode.Accepted)]
  [DataRow("1100", true, true, HttpStatusCode.BadRequest)]
  [DataRow("1100", false, false, HttpStatusCode.Conflict)]
  public async Task UpdateProduct_ExplicitCategory_UsesSingleVersionedWrite(string category, bool duplicate, bool commit, HttpStatusCode expected)
  {
    Guid userId = Guid.NewGuid();
    var first = new Product { Name = "Milk", Price = 7m, Quantity = 2, Category = ProductCategory.Milk };
    var second = new Product { Name = duplicate ? "MILK" : "Coffee", Category = ProductCategory.Coffee };
    var invoice = new Invoice { id = Guid.NewGuid(), UserIdentifier = userId, Items = [first, second] };
    var database = new Mock<IDatabaseBroker>(MockBehavior.Strict);
    database.Setup(item => item.ReadInvoiceSnapshotAsync(invoice.id, userId, It.IsAny<CancellationToken>()))
      .ReturnsAsync((invoice, "\"original\""));
    database.Setup(item => item.TryReplaceInvoiceSnapshotAsync(invoice, "\"original\"", It.IsAny<CancellationToken>()))
      .ReturnsAsync(commit);

    var logger = NullLoggerFactory.Instance;
    var storage = new InvoiceStorageFoundationService(database.Object, logger);
    var invoices = new InvoiceOrchestrationService(storage, logger);
    var processing = new InvoiceProcessingService(
      invoices, Mock.Of<IMerchantOrchestrationService>(), Mock.Of<IAnalysisOrchestrationService>(), logger);
    await using var app = BuildApp(new InvoiceManagementService(processing, logger), userId);
    await app.StartAsync().ConfigureAwait(false);

    using var client = app.GetTestClient();
    using var body = new StringContent($$"""{"originalProductName":"Milk","category":{{category}}}""", Encoding.UTF8, "application/json");
    using var response = await client.PutAsync(new Uri($"/rest/v1/invoices/{invoice.id}/products", UriKind.Relative), body).ConfigureAwait(false);

    Assert.AreEqual(expected, response.StatusCode);
    database.Verify(item => item.TryReplaceInvoiceSnapshotAsync(invoice, "\"original\"", It.IsAny<CancellationToken>()),
      duplicate ? Times.Never() : Times.Once());
    database.Verify(item => item.UpdateInvoiceAsync(It.IsAny<Guid>(), It.IsAny<Invoice>(), It.IsAny<CancellationToken>()), Times.Never());
    if (expected == HttpStatusCode.Accepted)
    {
      using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync().ConfigureAwait(false));
      Assert.AreEqual(category, json.RootElement.GetProperty("category").GetRawText());
      Assert.AreEqual(7m, json.RootElement.GetProperty("price").GetDecimal());
      Assert.AreSame(second, System.Linq.Enumerable.Last(invoice.Items));
    }
  }

  private static WebApplication BuildApp(IInvoiceManagementService management, Guid userId)
  {
    var builder = WebApplication.CreateBuilder();
    builder.WebHost.UseTestServer();
    builder.Services.AddHttpContextAccessor();
    builder.Services.AddAuthentication();
    builder.Services.AddAuthorization();
    builder.Services.AddSingleton(management);
    var app = builder.Build();
    app.UseAuthentication();
    app.Use((context, next) =>
    {
      context.User = new ClaimsPrincipal(new ClaimsIdentity([new Claim("userIdentifier", userId.ToString())], "test"));
      return next(context);
    });
    app.UseAuthorization();
    app.MapInvoiceEndpoints();
    return app;
  }
}
