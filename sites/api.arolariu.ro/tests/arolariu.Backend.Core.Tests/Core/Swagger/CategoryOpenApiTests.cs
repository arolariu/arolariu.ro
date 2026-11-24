namespace arolariu.Backend.Core.Tests.Core.Swagger;

using System;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;

using arolariu.Backend.Core.Domain.General.Services.Swagger;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Categories;
using arolariu.Backend.Domain.Invoices.Endpoints;
using arolariu.Backend.Domain.Invoices.Services.Management;

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Verifies the public category contract in the generated API documents.</summary>
[TestClass]
public sealed class CategoryOpenApiTests
{
  /// <summary>Category updates document both clear forms without widening the response contract.</summary>
  [TestMethod]
  [DataRow("/openapi/v1.json")]
  [DataRow("/swagger/v1/swagger.json")]
  public async Task ProductCategoryWrite_DocumentsNullableNumericCategoryAndConflict(string documentPath)
  {
    var builder = WebApplication.CreateBuilder();
    builder.WebHost.UseTestServer();
    SwaggerConfigurationService.AddApiDocumentation(builder.Services);
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddHttpContextAccessor();
    builder.Services.AddAuthorization();
    builder.Services.AddSingleton<IInvoiceManagementService>(_ => throw new InvalidOperationException("Only API metadata is used."));
    await using var app = builder.Build();
    app.MapOpenApi();
    app.UseSwagger();
    app.MapInvoiceEndpoints();
    await app.StartAsync().ConfigureAwait(false);

    using var client = app.GetTestClient();
    string text = await client.GetStringAsync(new Uri(documentPath, UriKind.Relative)).ConfigureAwait(false);
    using var document = JsonDocument.Parse(text);
    var root = document.RootElement;
    var operation = root.GetProperty("paths").GetProperty("/rest/v1/invoices/{id}/products").GetProperty("put");
    Assert.IsTrue(operation.GetProperty("responses").TryGetProperty("409", out _));

    var body = Resolve(root, operation.GetProperty("requestBody").GetProperty("content").GetProperty("application/json").GetProperty("schema"));
    Assert.IsFalse(body.TryGetProperty("required", out var required)
      && required.EnumerateArray().Any(property => property.GetString() == "category"));
    AssertCategory(root, body.GetProperty("properties").GetProperty("category"), allowClearAlias: true);

    var response = Resolve(root, operation.GetProperty("responses").GetProperty("202")
      .GetProperty("content").GetProperty("application/json").GetProperty("schema"));
    AssertCategory(root, response.GetProperty("properties").GetProperty("category"), allowClearAlias: false);
  }

  private static void AssertCategory(JsonElement root, JsonElement field, bool allowClearAlias)
  {
    var schema = Resolve(root, field);
    bool separateNull = schema.TryGetProperty("oneOf", out var alternatives);
    if (separateNull)
    {
      Assert.AreEqual(2, alternatives.GetArrayLength());
      Assert.IsTrue(alternatives.EnumerateArray().Any(IsNullSchema));
      schema = Resolve(root, alternatives.EnumerateArray().Single(option => !IsNullSchema(option)));
    }

    Assert.IsTrue(schema.TryGetProperty("type", out var type), schema.GetRawText());
    if (!separateNull && type.ValueKind == JsonValueKind.Array)
    {
      Assert.AreEqual(2, type.GetArrayLength());
      Assert.IsTrue(type.EnumerateArray().Any(value => value.GetString() == "integer"));
      Assert.IsTrue(type.EnumerateArray().Any(value => value.GetString() == "null"));
    }
    else
    {
      Assert.AreEqual("integer", type.GetString());
      if (!separateNull)
      {
        Assert.IsTrue((field.TryGetProperty("nullable", out var nullable) || schema.TryGetProperty("nullable", out nullable))
          && nullable.GetBoolean(), schema.GetRawText());
      }
    }
    var allowed = schema.GetProperty("enum");
    Assert.AreEqual(!separateNull, allowed.EnumerateArray().Any(value => value.ValueKind == JsonValueKind.Null));
    var ids = allowed.EnumerateArray().Where(value => value.ValueKind != JsonValueKind.Null).Select(value => value.GetInt32());
    var expected = Enum.GetValues<ProductCategory>().Select(category => (int)category);
    CollectionAssert.AreEquivalent((allowClearAlias ? expected.Prepend(-1) : expected).ToArray(), ids.ToArray());
  }

  private static bool IsNullSchema(JsonElement schema) =>
    schema.TryGetProperty("type", out var type) && type.ValueKind == JsonValueKind.String && type.GetString() == "null";

  private static JsonElement Resolve(JsonElement document, JsonElement schema) =>
    schema.TryGetProperty("$ref", out var reference)
      ? document.GetProperty("components").GetProperty("schemas").GetProperty(reference.GetString()!.Split('/')[^1])
      : schema;
}
