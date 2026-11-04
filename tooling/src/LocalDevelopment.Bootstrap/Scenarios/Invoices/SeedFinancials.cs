namespace LocalDevelopment.Bootstrap.Scenarios.Invoices;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;

/// <summary>Reconciles gross-priced seed products into deterministic VAT groups.</summary>
internal static class SeedFinancials
{
  internal static List<TaxDetail> CreateTaxDetails(IReadOnlyList<SeedProductDefinition> products) =>
    products.GroupBy(product => product.TaxRate)
      .OrderBy(group => group.Key)
      .Select(group =>
      {
        decimal gross = group.Sum(product => product.Quantity * product.Price);
        decimal tax = decimal.Round(gross * group.Key / (100m + group.Key), 2, MidpointRounding.AwayFromZero);
        return new TaxDetail
        {
          Rate = group.Key,
          Amount = tax,
          NetAmount = gross - tax,
          Description = "VAT",
        };
      }).ToList();
}
