namespace arolariu.Backend.Domain.Invoices.Categories;

using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.IO;
using System.Linq;
using System.Text.Json;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Categories;

internal sealed record CategoryDefinition<TCategory>(TCategory Id, string Key, string Label)
  where TCategory : struct, Enum;

internal sealed record ProductCategoryDefinition(ProductCategory Id, string Key, string Label, bool IsFood);

internal static class CategoryCatalog
{
  private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

  internal static IReadOnlyList<ProductCategoryDefinition> Products { get; } = Array.AsReadOnly(
    Load<ProductCategory>("products", hasFoodFlag: true)
      .Select(entry => new ProductCategoryDefinition(entry.Id, entry.Key, entry.Label, entry.IsFood is true))
      .ToArray());

  internal static IReadOnlyList<CategoryDefinition<MerchantCategory>> Merchants { get; } = LoadDefinitions<MerchantCategory>("merchants");

  internal static IReadOnlyList<CategoryDefinition<InvoiceCategory>> Invoices { get; } = LoadDefinitions<InvoiceCategory>("invoices");

  internal static ProductCategoryDefinition GetProduct(ProductCategory id) => Products.First(entry => entry.Id == id);

  internal static CategoryDefinition<MerchantCategory> GetMerchant(MerchantCategory id) => Merchants.First(entry => entry.Id == id);

  internal static CategoryDefinition<InvoiceCategory> GetInvoice(InvoiceCategory id) => Invoices.First(entry => entry.Id == id);

  internal static bool IsFood(ProductCategory? id) => id is { } category && GetProduct(category).IsFood;

  private static ReadOnlyCollection<CategoryDefinition<TCategory>> LoadDefinitions<TCategory>(string name) where TCategory : struct, Enum =>
    Array.AsReadOnly(Load<TCategory>(name, hasFoodFlag: false)
      .Select(entry => new CategoryDefinition<TCategory>(entry.Id, entry.Key, entry.Label))
      .ToArray());

  private static CatalogEntry<TCategory>[] Load<TCategory>(string name, bool hasFoodFlag) where TCategory : struct, Enum
  {
    string resource = $"arolariu.Backend.Domain.Invoices.Resources.Categories.{name}.json";
    using Stream stream = typeof(CategoryCatalog).Assembly.GetManifestResourceStream(resource)
      ?? throw new InvalidDataException($"Missing packaged category catalog '{name}'.");
    var entries = JsonSerializer.Deserialize<CatalogEntry<TCategory>[]>(stream, JsonOptions)
      ?? throw new InvalidDataException($"Empty category catalog '{name}'.");
    var values = Enum.GetValues<TCategory>();

    if (entries.Length != 100 || values.Length != entries.Length
      || !values.ToHashSet().SetEquals(entries.Select(entry => entry.Id))
      || entries.Any(entry => string.IsNullOrWhiteSpace(entry.Label)
        || !string.Equals(JsonNamingPolicy.CamelCase.ConvertName(entry.Id.ToString()), entry.Key, StringComparison.Ordinal)
        || entry.IsFood.HasValue != hasFoodFlag))
    {
      throw new InvalidDataException($"Category catalog '{name}' does not match its enum.");
    }

    return entries;
  }

  private sealed record CatalogEntry<TCategory>(TCategory Id, string Key, string Label, bool? IsFood) where TCategory : struct, Enum;
}
