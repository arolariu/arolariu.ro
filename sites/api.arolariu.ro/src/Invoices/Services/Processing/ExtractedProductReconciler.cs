namespace arolariu.Backend.Domain.Invoices.Services.Processing;

using System;
using System.Collections.Generic;
using System.Globalization;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;

/// <summary>
/// Re-applies a successful document extraction onto an invoice's persisted line items while preserving the
/// per-item analysis artifacts and user workflow state that extraction itself cannot reproduce.
/// </summary>
/// <remarks>
/// <para><b>The problem this solves:</b> A successful extraction is authoritative about <em>which</em> line items an
/// invoice has, so it must replace the collection. Naively rebuilding every <see cref="Product"/> from scratch,
/// however, also destroyed the GPC classification, the allergen assessment, and the user's edit / completeness /
/// soft-delete flags whenever the re-run did not include those capabilities. A Fast re-analysis over an invoice
/// previously enriched by a Balanced run silently wiped the Balanced run's output.</para>
/// <para><b>Matching contract:</b> <see cref="Product"/> is deliberately identity-free, so carry-over uses a
/// deterministic, identity-free match:</para>
/// <list type="number">
///   <item><description>a case-insensitive, trimmed <see cref="Product.ProductCode"/> match when the code is
///   non-empty on both sides; otherwise</description></item>
///   <item><description>a normalized <c>name + quantity + price</c> match.</description></item>
/// </list>
/// <para>Duplicate line items sharing a key are matched with <b>queue (first-in-first-out) semantics</b>, so the
/// n-th occurrence in the new extraction inherits from the n-th occurrence in the previous state and never from a
/// different occurrence. A previous item is consumed at most once; an unmatched new item starts clean.</para>
/// <para><b>Precedence:</b> This carry-over runs as part of applying the extraction section, which is applied
/// <em>before</em> the classification and allergen sections. A capability section that succeeded therefore still
/// overwrites whatever was preserved - preservation only ever fills the gap left by a capability that did not run
/// or did not produce a usable result.</para>
/// <para><b>OCR confidence:</b> Always taken from the new extraction, because it describes <em>this</em> read of the
/// receipt. The edit, completeness, and soft-delete flags are user/workflow state and are always preserved.</para>
/// </remarks>
internal static class ExtractedProductReconciler
{
  /// <summary>
  /// Formats a decimal with trailing zeros removed so <c>1</c>, <c>1.0</c>, and <c>1.00</c> produce one key.
  /// </summary>
  private const string InvariantNumberFormat = "0.############################";

  /// <summary>
  /// Rebuilds the invoice's line items from a successful extraction, carrying prior per-item state onto
  /// recognizably identical products.
  /// </summary>
  /// <param name="previousItems">The line items currently persisted on the invoice, or <see langword="null"/>.</param>
  /// <param name="extractedProducts">The line items produced by the successful extraction.</param>
  /// <returns>The replacement line-item collection, in extraction order.</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="extractedProducts"/> is null.</exception>
  internal static List<Product> Reconcile(
    IEnumerable<Product>? previousItems,
    IReadOnlyList<ExtractedProduct> extractedProducts)
  {
    ArgumentNullException.ThrowIfNull(extractedProducts);

    var carryOver = CarryOverIndex.Build(previousItems);
    var reconciled = new List<Product>(extractedProducts.Count);

    foreach (ExtractedProduct extracted in extractedProducts)
    {
      Product product = ExtractedProductMapper.ToDomainProduct(extracted);
      Product? previous = carryOver.TryTake(product);

      if (previous is not null)
      {
        CarryOverPreviousState(previous, product);
      }

      reconciled.Add(product);
    }

    return reconciled;
  }

  /// <summary>
  /// Copies the analysis artifacts and workflow flags of a matched previous line item onto its replacement.
  /// </summary>
  /// <param name="previous">The previously persisted line item that was matched.</param>
  /// <param name="current">The freshly extracted replacement line item.</param>
  private static void CarryOverPreviousState(Product previous, Product current)
  {
    current.Classification = previous.Classification;
    current.AllergenAssessment = previous.AllergenAssessment;

    // ProductMetadata is a record struct, so this is a value copy rather than shared mutable state.
    ProductMetadata metadata = previous.Metadata;
    metadata.Confidence = current.Metadata.Confidence;
    current.Metadata = metadata;
  }

  /// <summary>
  /// Builds the normalized product-code key, or <see langword="null"/> when no usable code is present.
  /// </summary>
  /// <param name="productCode">The raw product code.</param>
  /// <returns>The normalized code, or <see langword="null"/>.</returns>
  private static string? BuildProductCodeKey(string? productCode) =>
    string.IsNullOrWhiteSpace(productCode) ? null : productCode.Trim().ToUpperInvariant();

  /// <summary>
  /// Builds the fallback attribute key from the normalized name, quantity, and price.
  /// </summary>
  /// <param name="product">The line item to key.</param>
  /// <returns>The deterministic attribute key.</returns>
  private static string BuildAttributeKey(Product product) => string.Concat(
    NormalizeName(product.Name),
    "|",
    product.Quantity.ToString(InvariantNumberFormat, CultureInfo.InvariantCulture),
    "|",
    product.Price.ToString(InvariantNumberFormat, CultureInfo.InvariantCulture));

  /// <summary>
  /// Collapses whitespace and case so cosmetic OCR variance does not defeat the attribute match.
  /// </summary>
  /// <param name="name">The raw product name.</param>
  /// <returns>The normalized name.</returns>
  internal static string NormalizeName(string? name) =>
    string.IsNullOrWhiteSpace(name)
      ? string.Empty
      : string.Join(
          ' ',
          name.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        .ToUpperInvariant();

  /// <summary>
  /// A single-use lookup over the previously persisted line items.
  /// </summary>
  /// <remarks>
  /// <para>Every previous item is registered under both its product-code key (when it has one) and its attribute
  /// key. Lookups prefer the product-code key. A shared <see cref="Entry"/> instance behind both keys guarantees an
  /// item taken through one key can never be taken again through the other.</para>
  /// </remarks>
  private sealed class CarryOverIndex
  {
    private readonly Dictionary<string, Queue<Entry>> byProductCode = new(StringComparer.Ordinal);
    private readonly Dictionary<string, Queue<Entry>> byAttributes = new(StringComparer.Ordinal);

    /// <summary>
    /// Builds the lookup from the invoice's currently persisted line items.
    /// </summary>
    /// <param name="previousItems">The previously persisted line items, or <see langword="null"/>.</param>
    /// <returns>The populated lookup.</returns>
    internal static CarryOverIndex Build(IEnumerable<Product>? previousItems)
    {
      var index = new CarryOverIndex();

      if (previousItems is null)
      {
        return index;
      }

      foreach (Product previous in previousItems)
      {
        if (previous is null)
        {
          continue;
        }

        var entry = new Entry(previous);
        string? productCodeKey = BuildProductCodeKey(previous.ProductCode);

        if (productCodeKey is not null)
        {
          Enqueue(index.byProductCode, productCodeKey, entry);
        }

        Enqueue(index.byAttributes, BuildAttributeKey(previous), entry);
      }

      return index;
    }

    /// <summary>
    /// Takes the next unconsumed previous line item matching <paramref name="candidate"/>, if any.
    /// </summary>
    /// <param name="candidate">The freshly extracted line item seeking a predecessor.</param>
    /// <returns>The matched previous line item, or <see langword="null"/> when the item is new.</returns>
    internal Product? TryTake(Product candidate)
    {
      string? productCodeKey = BuildProductCodeKey(candidate.ProductCode);

      if (productCodeKey is not null && TryDequeue(byProductCode, productCodeKey, out Product? byCode))
      {
        return byCode;
      }

      return TryDequeue(byAttributes, BuildAttributeKey(candidate), out Product? byAttribute)
        ? byAttribute
        : null;
    }

    private static void Enqueue(Dictionary<string, Queue<Entry>> index, string key, Entry entry)
    {
      if (!index.TryGetValue(key, out Queue<Entry>? queue))
      {
        queue = new Queue<Entry>();
        index[key] = queue;
      }

      queue.Enqueue(entry);
    }

    private static bool TryDequeue(Dictionary<string, Queue<Entry>> index, string key, out Product? matched)
    {
      matched = null;

      if (!index.TryGetValue(key, out Queue<Entry>? queue))
      {
        return false;
      }

      while (queue.Count > 0)
      {
        Entry entry = queue.Dequeue();

        if (entry.Consumed)
        {
          continue;
        }

        entry.Consumed = true;
        matched = entry.Product;
        return true;
      }

      return false;
    }

    /// <summary>
    /// One previous line item plus whether it has already been carried over.
    /// </summary>
    /// <param name="product">The previously persisted line item.</param>
    private sealed class Entry(Product product)
    {
      internal Product Product { get; } = product;

      internal bool Consumed { get; set; }
    }
  }
}
