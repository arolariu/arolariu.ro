namespace arolariu.Backend.Domain.Invoices.Brokers.GenerativeAnalysisBroker;

using Microsoft.Extensions.AI;
using Microsoft.Extensions.Logging;

public sealed partial class AzureFoundryBroker
{
  private static GenerativeUsage? MapUsage(UsageDetails? usage) =>
    usage is null
      ? null
      : new GenerativeUsage(usage.InputTokenCount, usage.OutputTokenCount, usage.TotalTokenCount);

  [LoggerMessage(
    Level = LogLevel.Debug,
    Message = "A structured generative analysis provider call is starting.")]
  private static partial void LogStructuredGenerationStarted(ILogger logger);
}
