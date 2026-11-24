namespace arolariu.Backend.Domain.Tests.Integration;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Inner;
using arolariu.Backend.Common.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Categories;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.Endpoints;
using arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;
using arolariu.Backend.Domain.Invoices.Services.Foundation.MerchantStorage;
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

  /// <summary>Both receipt routes use -1 to clear; absent and null both preserve.</summary>
  [TestMethod]
  [DataRow("PUT", "", "3001")]
  [DataRow("PUT", "null", "3001")]
  [DataRow("PUT", "-1", "null")]
  [DataRow("PUT", "3074", "3074")]
  [DataRow("PATCH", "", "3001")]
  [DataRow("PATCH", "null", "3001")]
  [DataRow("PATCH", "-1", "null")]
  [DataRow("PATCH", "3074", "3074")]
  public async Task EditInvoice_CategoryIntent_BindsOmissionClearAndAssignment(string method, string category, string expected)
  {
    Guid userId = Guid.NewGuid();
    var original = new Invoice
    {
      id = Guid.NewGuid(),
      UserIdentifier = userId,
      Name = "Original receipt",
      Category = InvoiceCategory.Groceries,
      StorageETag = "original-revision",
    };
    var broker = new Mock<IDatabaseBroker>(MockBehavior.Strict);
    broker.Setup(service => service.ReadInvoiceAsync(original.id, userId, It.IsAny<CancellationToken>())).ReturnsAsync(original);
    broker.Setup(service => service.UpdateInvoiceAsync(
      original.id, It.Is<Invoice>(edited => edited.StorageETag == original.StorageETag), It.IsAny<CancellationToken>()))
      .ReturnsAsync((Guid _, Invoice edited, CancellationToken _) => edited);
    var log = NullLoggerFactory.Instance;
    var invoices = new InvoiceOrchestrationService(new InvoiceStorageFoundationService(broker.Object, log), log);
    var processing = new InvoiceProcessingService(
      invoices, Mock.Of<IMerchantOrchestrationService>(), Mock.Of<IAnalysisOrchestrationService>(), log);
    await using var app = BuildApp(new InvoiceManagementService(processing, log), userId);
    await app.StartAsync().ConfigureAwait(false);

    using var client = app.GetTestClient();
    var payload = method == "PUT"
      ? """{"name":"Edited receipt","description":"Full update","paymentInformation":{}"""
      : "{\"name\":\"Edited receipt\"";
    if (category.Length > 0) payload += $""","category":{category}""";
    using var request = new HttpRequestMessage(new HttpMethod(method), new Uri($"/rest/v1/invoices/{original.id}", UriKind.Relative))
    {
      Content = new StringContent(payload + "}", Encoding.UTF8, "application/json"),
    };
    using var response = await client.SendAsync(request).ConfigureAwait(false);

    Assert.AreEqual(HttpStatusCode.Accepted, response.StatusCode);
    using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync().ConfigureAwait(false));
    Assert.AreEqual(expected, json.RootElement.GetProperty("category").GetRawText());
    Assert.AreEqual("Edited receipt", json.RootElement.GetProperty("name").GetString());
    Assert.AreEqual(InvoiceCategory.Groceries, original.Category);
    broker.Verify(service => service.UpdateInvoiceAsync(original.id, It.IsAny<Invoice>(), It.IsAny<CancellationToken>()), Times.Once());
  }

  /// <summary>Invalid category intent cannot update either side of a merchant relationship.</summary>
  [TestMethod]
  [DataRow("2001")]
  [DataRow("\"3001\"")]
  [DataRow("\"-1\"")]
  [DataRow("-1.0")]
  [DataRow("-2")]
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
    Assert.AreEqual(Guid.Empty, invoice.MerchantReference);
    management.Verify(service => service.ReadMerchant(merchant.id, null, It.IsAny<CancellationToken>()), Times.Never);
    management.Verify(service => service.UpdateInvoice(invoice.id, userId, It.IsAny<Invoice>(), It.IsAny<CancellationToken>()), Times.Never);
  }

  /// <summary>Real merchant JSON writes distinguish assigning, clearing, and leaving category unchanged.</summary>
  [TestMethod]
  [DataRow("""{"category":2005}""", "2005", false)]
  [DataRow("""{"category":-1}""", "null", false)]
  [DataRow("""{"name":"New name","description":"New description"}""", "2001", true)]
  [DataRow("""{"name":"New name","description":"New description","category":null}""", "2001", true)]
  public async Task PutMerchant_CategoryIntent_PreservesUneditedState(string payload, string expected, bool details)
  {
    Guid userId = Guid.NewGuid();
    var merchant = new Merchant
    {
      id = Guid.NewGuid(), Name = "Shop", Description = "Store",
      Address = new ContactInformation { Address = "Example Street" }, Category = MerchantCategory.Supermarket,
      ParentCompanyId = Guid.NewGuid(),
      CreatedBy = userId,
    };
    var invoice = new Invoice { id = Guid.NewGuid(), UserIdentifier = userId, MerchantReference = merchant.id };
    var broker = new Mock<IDatabaseBroker>(MockBehavior.Strict);
    broker.Setup(service => service.ReadInvoicesAsync(userId, It.IsAny<CancellationToken>(), merchant.id)).ReturnsAsync([invoice]);
    broker.Setup(service => service.ReadMerchantAsync(merchant.id, null, It.IsAny<CancellationToken>())).ReturnsAsync(merchant);
    broker.Setup(service => service.UpdateMerchantAsync(merchant, merchant, It.IsAny<CancellationToken>())).ReturnsAsync(merchant);
    var log = NullLoggerFactory.Instance;
    var invoices = new InvoiceOrchestrationService(new InvoiceStorageFoundationService(broker.Object, log), log);
    var merchants = new MerchantOrchestrationService(new MerchantStorageFoundationService(broker.Object, log), log);
    var processing = new InvoiceProcessingService(invoices, merchants, Mock.Of<IAnalysisOrchestrationService>(), log);
    await using var app = BuildApp(new InvoiceManagementService(processing, log), userId);
    await app.StartAsync().ConfigureAwait(false);

    using var client = app.GetTestClient();
    using var body = new StringContent(payload, Encoding.UTF8, "application/json");
    using var response = await client.PutAsync(new Uri($"/rest/v1/merchants/{merchant.id}", UriKind.Relative), body).ConfigureAwait(false);

    Assert.AreEqual(HttpStatusCode.Accepted, response.StatusCode);
    using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync().ConfigureAwait(false));
    Assert.AreEqual(expected, json.RootElement.GetProperty("category").GetRawText());
    Assert.AreEqual(details ? "New name" : "Shop", merchant.Name);
    Assert.AreEqual(details ? "New description" : "Store", merchant.Description);
    if (!details) Assert.AreEqual("Example Street", merchant.Address.Address);
    broker.Verify(service => service.UpdateMerchantAsync(merchant, merchant, It.IsAny<CancellationToken>()), Times.Once());
    broker.Verify(service => service.ReadMerchantAsync(merchant.id, null, It.IsAny<CancellationToken>()), Times.Once());
    broker.Verify(service => service.ReadInvoicesAsync(userId, It.IsAny<CancellationToken>(), merchant.id), Times.Once());
    broker.VerifyNoOtherCalls();
  }

  /// <summary>Link and unlink update only the invoice, including when a stale link conflicts.</summary>
  [TestMethod]
  [DataRow(true, true)]
  [DataRow(false, true)]
  [DataRow(true, false)]
  public async Task InvoiceMerchant_LinkAndUnlink_OnlyWritesTheOwningInvoice(bool allowLink, bool allowUnlink)
  {
    Guid userId = Guid.NewGuid();
    Guid invoiceId = Guid.NewGuid();
    var merchant = new Merchant
    {
      Name = "Shop",
      ParentCompanyId = Guid.NewGuid(),
      Category = MerchantCategory.Supermarket,
    };
    var currentInvoice = new Invoice { id = invoiceId, UserIdentifier = userId };
    var broker = new Mock<IDatabaseBroker>(MockBehavior.Strict);
    broker.Setup(service => service.ReadInvoiceAsync(invoiceId, userId, It.IsAny<CancellationToken>()))
      .ReturnsAsync(() => new Invoice { id = invoiceId, UserIdentifier = userId, MerchantReference = currentInvoice.MerchantReference });
    broker.Setup(service => service.UpdateInvoiceAsync(invoiceId, It.IsAny<Invoice>(), It.IsAny<CancellationToken>()))
      .ReturnsAsync((Guid _, Invoice saved, CancellationToken _) =>
      {
        if (!(saved.MerchantReference == Guid.Empty ? allowUnlink : allowLink)) throw new InvoiceAlreadyExistsException(invoiceId);
        return currentInvoice = saved;
      });
    broker.Setup(service => service.ReadMerchantAsync(merchant.id, null, It.IsAny<CancellationToken>())).ReturnsAsync(merchant);
    broker.Setup(service => service.UpdateMerchantAsync(merchant, merchant, It.IsAny<CancellationToken>()))
      .ReturnsAsync(merchant);
    var log = NullLoggerFactory.Instance;
    var invoices = new InvoiceOrchestrationService(new InvoiceStorageFoundationService(broker.Object, log), log);
    var merchants = new MerchantOrchestrationService(new MerchantStorageFoundationService(broker.Object, log), log);
    var processing = new InvoiceProcessingService(invoices, merchants, Mock.Of<IAnalysisOrchestrationService>(), log);
    await using var app = BuildApp(new InvoiceManagementService(processing, log), userId);
    await app.StartAsync().ConfigureAwait(false);

    using var client = app.GetTestClient();
    using var body = new StringContent($$"""{"merchantReference":"{{merchant.id}}"}""", Encoding.UTF8, "application/json");
    using var linked = await client.PatchAsync(new Uri($"/rest/v1/invoices/{invoiceId}", UriKind.Relative), body).ConfigureAwait(false);
    Assert.AreEqual(allowLink ? HttpStatusCode.Accepted : HttpStatusCode.Conflict, linked.StatusCode);
    broker.Verify(service => service.UpdateMerchantAsync(merchant, merchant, It.IsAny<CancellationToken>()), Times.Never());
    if (!allowLink)
    {
      Assert.AreEqual(Guid.Empty, currentInvoice.MerchantReference);
      return;
    }
    Assert.AreEqual(merchant.id, currentInvoice.MerchantReference);

    using var unlinked = await client.DeleteAsync(new Uri($"/rest/v1/invoices/{invoiceId}/merchant", UriKind.Relative)).ConfigureAwait(false);
    Assert.AreEqual(allowUnlink ? HttpStatusCode.NoContent : HttpStatusCode.Conflict, unlinked.StatusCode);
    Assert.AreEqual(allowUnlink ? Guid.Empty : merchant.id, currentInvoice.MerchantReference);
    Assert.AreEqual(MerchantCategory.Supermarket, merchant.Category);
    Assert.AreEqual("Shop", merchant.Name);
    broker.Verify(service => service.UpdateMerchantAsync(merchant, merchant, It.IsAny<CancellationToken>()), Times.Never());
  }

  /// <summary>A new link is not written until the merchant exists, and a stale link cannot overwrite the receipt.</summary>
  [TestMethod]
  [DataRow(false, false)]
  [DataRow(true, false)]
  [DataRow(true, true)]
  public async Task CreateAndLinkMerchant_OnlyExposesACommittedLink(bool merchantCreated, bool invoiceSaved)
  {
    Guid userId = Guid.NewGuid();
    Guid invoiceId = Guid.NewGuid();
    var broker = new Mock<IDatabaseBroker>(MockBehavior.Strict);
    var writes = new List<string>();
    Guid createdMerchantId = Guid.Empty;
    Guid savedMerchantReference = Guid.Empty;
    broker.Setup(service => service.ReadInvoiceAsync(invoiceId, userId, It.IsAny<CancellationToken>()))
      .ReturnsAsync(new Invoice { id = invoiceId, UserIdentifier = userId });
    broker.Setup(service => service.CreateMerchantAsync(It.IsAny<Merchant>(), It.IsAny<CancellationToken>()))
      .ReturnsAsync((Merchant merchant, CancellationToken _) =>
      {
        writes.Add("create merchant");
        if (!merchantCreated) throw new MerchantAlreadyExistsException(merchant.id);
        createdMerchantId = merchant.id;
        return merchant;
      });
    if (merchantCreated)
    {
      broker.Setup(service => service.UpdateInvoiceAsync(invoiceId, It.IsAny<Invoice>(), It.IsAny<CancellationToken>()))
        .ReturnsAsync((Guid _, Invoice saved, CancellationToken _) =>
        {
          writes.Add("replace invoice");
          if (!invoiceSaved) throw new InvoiceAlreadyExistsException(invoiceId);
          savedMerchantReference = saved.MerchantReference;
          return saved;
        });
    }

    await using var app = BuildStorageApp(broker.Object, userId);
    await app.StartAsync().ConfigureAwait(false);
    using var client = app.GetTestClient();
    using var body = new StringContent("""{"name":"Shop","description":"Store","category":2001}""", Encoding.UTF8, "application/json");
    using var response = await client.PostAsync(new Uri($"/rest/v1/invoices/{invoiceId}/merchant", UriKind.Relative), body).ConfigureAwait(false);

    Assert.AreEqual(invoiceSaved ? HttpStatusCode.Created : HttpStatusCode.Conflict, response.StatusCode);
    Assert.HasCount(merchantCreated ? 2 : 1, writes);
    Assert.AreEqual("create merchant", writes[0]);
    if (merchantCreated) Assert.AreEqual("replace invoice", writes[1]);
    Assert.AreEqual(invoiceSaved ? createdMerchantId : Guid.Empty, savedMerchantReference);
    if (invoiceSaved)
    {
      using var receipt = JsonDocument.Parse(await response.Content.ReadAsStringAsync().ConfigureAwait(false));
      Assert.AreEqual(createdMerchantId, receipt.RootElement.GetProperty("id").GetGuid());
      Assert.AreEqual(userId, receipt.RootElement.GetProperty("createdBy").GetGuid());
    }
  }

  /// <summary>A merchant may be read through an owned link without granting edits to its record.</summary>
  [TestMethod]
  public async Task PutMerchant_LinkedButNotCreatedByCaller_DoesNotWrite()
  {
    Guid userId = Guid.NewGuid();
    var merchant = new Merchant { Name = "Shared merchant", CreatedBy = Guid.NewGuid(), Category = MerchantCategory.Bakery };
    var receipt = new Invoice { id = Guid.NewGuid(), UserIdentifier = userId, MerchantReference = merchant.id };
    var broker = new Mock<IDatabaseBroker>(MockBehavior.Strict);
    broker.Setup(service => service.ReadInvoicesAsync(userId, It.IsAny<CancellationToken>(), merchant.id)).ReturnsAsync([receipt]);
    broker.Setup(service => service.ReadMerchantAsync(merchant.id, null, It.IsAny<CancellationToken>())).ReturnsAsync(merchant);
    broker.Setup(service => service.UpdateMerchantAsync(merchant, merchant, It.IsAny<CancellationToken>())).ReturnsAsync(merchant);
    await using var app = BuildStorageApp(broker.Object, userId);
    await app.StartAsync().ConfigureAwait(false);

    using var client = app.GetTestClient();
    var url = new Uri($"/rest/v1/merchants/{merchant.id}", UriKind.Relative);
    using var read = await client.GetAsync(url).ConfigureAwait(false);
    Assert.AreEqual(HttpStatusCode.OK, read.StatusCode);
    using var json = JsonDocument.Parse(await read.Content.ReadAsStringAsync().ConfigureAwait(false));
    Assert.AreEqual(Guid.Empty, json.RootElement.GetProperty("createdBy").GetGuid());

    using var body = new StringContent("""{"category":-1}""", Encoding.UTF8, "application/json");
    using var update = await client.PutAsync(url, body).ConfigureAwait(false);

    Assert.AreEqual(HttpStatusCode.NotFound, update.StatusCode);
    Assert.AreEqual(MerchantCategory.Bakery, merchant.Category);
    broker.Verify(service => service.UpdateMerchantAsync(merchant, merchant, It.IsAny<CancellationToken>()), Times.Never());
  }

  /// <summary>Creating a standalone merchant stamps the caller rather than accepting caller-supplied audit fields.</summary>
  [TestMethod]
  public async Task CreateMerchant_UsesAuthenticatedCreator()
  {
    Guid userId = Guid.NewGuid();
    var broker = new Mock<IDatabaseBroker>(MockBehavior.Strict);
    broker.Setup(service => service.CreateMerchantAsync(It.IsAny<Merchant>(), It.IsAny<CancellationToken>()))
      .ReturnsAsync((Merchant merchant, CancellationToken _) => merchant);
    await using var app = BuildStorageApp(broker.Object, userId);
    await app.StartAsync().ConfigureAwait(false);

    using var client = app.GetTestClient();
    using var body = new StringContent($$"""{"name":"Store","description":"Store","address":"","createdBy":"{{Guid.NewGuid()}}"}""",
      Encoding.UTF8, "application/json");
    using var result = await client.PostAsync(new Uri("/rest/v1/merchants", UriKind.Relative), body).ConfigureAwait(false);

    Assert.AreEqual(HttpStatusCode.Created, result.StatusCode);
    broker.Verify(service => service.CreateMerchantAsync(It.Is<Merchant>(merchant => merchant.CreatedBy == userId),
      It.IsAny<CancellationToken>()), Times.Once());
  }

  /// <summary>Edits commit once against the observed version and leave ambiguous/stale targets unchanged.</summary>
  [TestMethod]
  [DataRow("null", false, false, true, HttpStatusCode.BadRequest)]
  [DataRow("-1", false, false, true, HttpStatusCode.Accepted)]
  [DataRow("1100", false, false, true, HttpStatusCode.Accepted)]
  [DataRow("1100", false, true, true, HttpStatusCode.BadRequest)]
  [DataRow("1100", false, false, false, HttpStatusCode.Conflict)]
  [DataRow("", true, false, true, HttpStatusCode.Accepted)]
  [DataRow("", true, false, false, HttpStatusCode.Conflict)]
  public async Task UpdateProduct_CategoryOrDetails_UsesSingleVersionedWrite(string category, bool fullEdit, bool duplicate, bool commit, HttpStatusCode expected)
  {
    Guid userId = Guid.NewGuid();
    var first = new Product { Name = "Milk", Price = 7m, Quantity = 2, Category = ProductCategory.Milk };
    var second = new Product { Name = duplicate ? "MILK" : "Coffee", Category = ProductCategory.Coffee };
    var invoice = new Invoice { id = Guid.NewGuid(), UserIdentifier = userId, Items = [first, second] };
    var database = new Mock<IDatabaseBroker>(MockBehavior.Strict);
    database.Setup(item => item.ReadInvoiceAsync(invoice.id, userId, It.IsAny<CancellationToken>()))
      .ReturnsAsync(invoice);
    var update = database.Setup(item => item.UpdateInvoiceAsync(invoice.id,
      It.Is<Invoice>(edited => edited.Items.Count == 2 && edited.Items.First().Name == (fullEdit ? "Full milk" : "Milk")),
      It.IsAny<CancellationToken>()));
    if (commit) update.ReturnsAsync(invoice);
    else update.ThrowsAsync(new InvoiceAlreadyExistsException(invoice.id));

    var logger = NullLoggerFactory.Instance;
    var storage = new InvoiceStorageFoundationService(database.Object, logger);
    var invoices = new InvoiceOrchestrationService(storage, logger);
    var processing = new InvoiceProcessingService(
      invoices, Mock.Of<IMerchantOrchestrationService>(), Mock.Of<IAnalysisOrchestrationService>(), logger);
    await using var app = BuildApp(new InvoiceManagementService(processing, logger), userId);
    await app.StartAsync().ConfigureAwait(false);

    using var client = app.GetTestClient();
    string payload = fullEdit
      ? """{"originalProductName":"Milk","name":"Full milk","quantity":3,"price":8}"""
      : $$"""{"originalProductName":"Milk","category":{{category}}}""";
    using var body = new StringContent(payload, Encoding.UTF8, "application/json");
    using var response = await client.PutAsync(new Uri($"/rest/v1/invoices/{invoice.id}/products", UriKind.Relative), body).ConfigureAwait(false);

    Assert.AreEqual(expected, response.StatusCode);
    database.Verify(item => item.UpdateInvoiceAsync(invoice.id, invoice, It.IsAny<CancellationToken>()),
      expected == HttpStatusCode.BadRequest ? Times.Never() : Times.Once());
    if (expected == HttpStatusCode.Accepted)
    {
      using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync().ConfigureAwait(false));
      string expectedCategory = fullEdit ? "1014" : category == "-1" ? "null" : category;
      Assert.AreEqual(expectedCategory, json.RootElement.GetProperty("category").GetRawText());
      Assert.AreEqual(fullEdit ? 8m : 7m, json.RootElement.GetProperty("price").GetDecimal());
      Assert.AreSame(second, System.Linq.Enumerable.Last(invoice.Items));
    }
  }

  private static WebApplication BuildStorageApp(IDatabaseBroker broker, Guid userId)
  {
    var log = NullLoggerFactory.Instance;
    var invoices = new InvoiceOrchestrationService(new InvoiceStorageFoundationService(broker, log), log);
    var merchants = new MerchantOrchestrationService(new MerchantStorageFoundationService(broker, log), log);
    var processing = new InvoiceProcessingService(invoices, merchants, Mock.Of<IAnalysisOrchestrationService>(), log);
    return BuildApp(new InvoiceManagementService(processing, log), userId);
  }

  /// <summary>Unused merchant-side relationship and delete operations are not exposed.</summary>
  [TestMethod]
  [DataRow("GET", "/invoices", HttpStatusCode.NotFound)]
  [DataRow("PATCH", "/invoices", HttpStatusCode.NotFound)]
  [DataRow("DELETE", "/invoices", HttpStatusCode.NotFound)]
  [DataRow("GET", "/products", HttpStatusCode.NotFound)]
  [DataRow("DELETE", "", HttpStatusCode.MethodNotAllowed)]
  public async Task RetiredMerchantRoutes_DoNotReachManagement(string method, string suffix, HttpStatusCode expected)
  {
    var management = new Mock<IInvoiceManagementService>(MockBehavior.Strict);
    await using var app = BuildApp(management.Object, Guid.NewGuid());
    await app.StartAsync().ConfigureAwait(false);
    using var client = app.GetTestClient();
    using var request = new HttpRequestMessage(new HttpMethod(method), new Uri($"/rest/v1/merchants/{Guid.NewGuid()}{suffix}", UriKind.Relative))
    {
      Content = new StringContent("{}", Encoding.UTF8, "application/json"),
    };

    using var response = await client.SendAsync(request).ConfigureAwait(false);

    Assert.AreEqual(expected, response.StatusCode);
    management.VerifyNoOtherCalls();
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
