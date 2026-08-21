namespace arolariu.Backend.Domain.Invoices.Brokers.GenerativeAnalysisBroker;

using Microsoft.Extensions.AI;

public sealed partial class AzureFoundryBroker
{
  private static GenerativeUsage? MapUsage(UsageDetails? usage) =>
    usage is null
      ? null
      : new GenerativeUsage(usage.InputTokenCount, usage.OutputTokenCount, usage.TotalTokenCount);

}
