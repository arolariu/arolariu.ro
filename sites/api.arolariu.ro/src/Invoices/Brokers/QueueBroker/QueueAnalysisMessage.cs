namespace arolariu.Backend.Domain.Invoices.Brokers.QueueBroker;

using System;
using System.Diagnostics;
using System.Text.Json.Serialization;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;

/// <summary>
/// Represents one provider-neutral analysis request carried by Azure Storage Queue.
/// </summary>
public sealed record QueueAnalysisMessage
{
  /// <summary>
  /// Initializes a new analysis queue message.
  /// </summary>
  [JsonConstructor]
  public QueueAnalysisMessage(
    Guid correlationId,
    AnalysisTargetType targetType,
    Guid targetId,
    Guid requestedBy,
    Guid? targetPartitionIdentifier,
    InvoiceAnalysisOptions? invoiceOptions,
    MerchantAnalysisOptions? merchantOptions,
    string traceParent,
    int attemptNumber = 1)
  {
    RequireNonEmpty(correlationId, nameof(correlationId));
    RequireNonEmpty(targetId, nameof(targetId));
    RequireNonEmpty(requestedBy, nameof(requestedBy));
    ArgumentException.ThrowIfNullOrWhiteSpace(traceParent);

    if (!ActivityContext.TryParse(traceParent, traceState: null, isRemote: true, out _))
    {
      throw new ArgumentException("Trace parent must be valid W3C trace context.", nameof(traceParent));
    }

    if (targetType == AnalysisTargetType.Invoice
        && (invoiceOptions is null || merchantOptions is not null))
    {
      throw new ArgumentException(
        "Invoice analysis messages require invoice options only.",
        nameof(invoiceOptions));
    }

    if (targetType == AnalysisTargetType.Merchant
        && (merchantOptions is null || invoiceOptions is not null))
    {
      throw new ArgumentException(
        "Merchant analysis messages require merchant options only.",
        nameof(merchantOptions));
    }

    if (targetType is not AnalysisTargetType.Invoice and not AnalysisTargetType.Merchant)
    {
      throw new ArgumentOutOfRangeException(
        nameof(targetType),
        targetType,
        "Only invoice and merchant targets can be queued for aggregate analysis.");
    }

    if (attemptNumber is < 1 or > 3)
    {
      throw new ArgumentOutOfRangeException(
        nameof(attemptNumber),
        attemptNumber,
        "Analysis attempt number must be in the inclusive range 1 to 3.");
    }

    CorrelationId = correlationId;
    TargetType = targetType;
    TargetId = targetId;
    RequestedBy = requestedBy;
    TargetPartitionIdentifier = targetPartitionIdentifier;
    InvoiceOptions = invoiceOptions;
    MerchantOptions = merchantOptions;
    TraceParent = traceParent;
    AttemptNumber = attemptNumber;
  }

  /// <summary>Gets the stable application correlation identifier.</summary>
  public Guid CorrelationId { get; }

  /// <summary>Gets the target aggregate type.</summary>
  public AnalysisTargetType TargetType { get; }

  /// <summary>Gets the target aggregate identifier.</summary>
  public Guid TargetId { get; }

  /// <summary>Gets the identifier of the user who requested analysis.</summary>
  public Guid RequestedBy { get; }

  /// <summary>Gets the optional target partition identifier.</summary>
  public Guid? TargetPartitionIdentifier { get; }

  /// <summary>Gets invoice analysis options when the target is an invoice.</summary>
  public InvoiceAnalysisOptions? InvoiceOptions { get; }

  /// <summary>Gets merchant analysis options when the target is a merchant.</summary>
  public MerchantAnalysisOptions? MerchantOptions { get; }

  /// <summary>Gets the W3C trace context captured when the message was enqueued.</summary>
  public string TraceParent { get; }

  /// <summary>Gets the logical selective-retry attempt number.</summary>
  public int AttemptNumber { get; }

  /// <summary>Creates an invoice analysis queue message.</summary>
  public static QueueAnalysisMessage CreateInvoiceMessage(
    Guid targetId,
    Guid requestedBy,
    Guid correlationId,
    InvoiceAnalysisOptions options,
    string traceParent,
    int attemptNumber = 1)
  {
    ArgumentNullException.ThrowIfNull(options);

    return new QueueAnalysisMessage(
      correlationId,
      AnalysisTargetType.Invoice,
      targetId,
      requestedBy,
      targetPartitionIdentifier: null,
      options,
      merchantOptions: null,
      traceParent,
      attemptNumber);
  }

  /// <summary>Creates a merchant analysis queue message.</summary>
  public static QueueAnalysisMessage CreateMerchantMessage(
    Guid targetId,
    Guid requestedBy,
    Guid correlationId,
    Guid? targetPartitionIdentifier,
    MerchantAnalysisOptions options,
    string traceParent,
    int attemptNumber = 1)
  {
    ArgumentNullException.ThrowIfNull(options);

    return new QueueAnalysisMessage(
      correlationId,
      AnalysisTargetType.Merchant,
      targetId,
      requestedBy,
      targetPartitionIdentifier,
      invoiceOptions: null,
      options,
      traceParent,
      attemptNumber);
  }

  private static void RequireNonEmpty(Guid identifier, string parameterName)
  {
    if (identifier == Guid.Empty)
    {
      throw new ArgumentException("Identifier must not be empty.", parameterName);
    }
  }
}
