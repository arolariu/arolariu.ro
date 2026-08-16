namespace arolariu.Backend.Domain.Tests.Invoices.Helpers;

using System;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.GenerativeAiBroker;
using arolariu.Backend.Common.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.Services.Foundation.GenerativeAnalysis;
using arolariu.Backend.Domain.Tests.Builders;

using Microsoft.Extensions.Logging.Abstractions;

/// <summary>
/// Builds <see cref="GenerativeAnalysisFoundationService"/> instances wired to deterministic merchant description scripts.
/// </summary>
internal sealed class MerchantDescriptionHarness
{
  private MerchantDescriptionHarness(ScriptedGenerativeAiBroker broker, Merchant merchant, Guid sourceRunId)
  {
    Broker = broker;
    Merchant = merchant;
    SourceRunId = sourceRunId;
    Service = new GenerativeAnalysisFoundationService(broker, TaxonomyBrokerTestFactory.Create(), NullLoggerFactory.Instance);
  }

  /// <summary>Gets the foundation service under test.</summary>
  public GenerativeAnalysisFoundationService Service { get; }

  /// <summary>Gets the scripted generative broker backing the service.</summary>
  public ScriptedGenerativeAiBroker Broker { get; }

  /// <summary>Gets the merchant supplied to the service.</summary>
  public Merchant Merchant { get; }

  /// <summary>Gets the source analysis run identifier used for the request.</summary>
  public Guid SourceRunId { get; }

  /// <summary>
  /// Executes the merchant description generation flow for the harness merchant.
  /// </summary>
  /// <param name="cancellationToken">The cancellation token that aborts generation.</param>
  /// <returns>The generated merchant description result.</returns>
  public Task<MerchantDescriptionResult> ExecuteAsync(CancellationToken cancellationToken = default) =>
    Service.GenerateMerchantDescriptionAsync(Merchant, SourceRunId, cancellationToken);

  /// <summary>
  /// Creates a harness scripted to return one merchant description response.
  /// </summary>
  /// <param name="description">The scripted merchant description returned by the provider.</param>
  /// <param name="merchant">The merchant submitted to the service.</param>
  /// <param name="sourceRunId">The source analysis run identifier.</param>
  /// <returns>A harness ready for merchant description generation tests.</returns>
  public static MerchantDescriptionHarness WithResponse(
    string description,
    Merchant? merchant = null,
    Guid? sourceRunId = null)
  {
    object response = CreateMerchantDescriptionOutput(description);
    var broker = new ScriptedGenerativeAiBroker(ScriptedGenerativeAiBroker.Success(response));

    return new MerchantDescriptionHarness(
      broker,
      merchant ?? CreateMerchant(),
      sourceRunId ?? Guid.NewGuid());
  }

  /// <summary>
  /// Creates a harness scripted to return one merchant description response for a sparse-evidence merchant.
  /// </summary>
  /// <param name="description">The scripted merchant description returned by the provider.</param>
  /// <param name="sourceRunId">The source analysis run identifier.</param>
  /// <returns>A harness ready for sparse-evidence merchant description generation tests.</returns>
  public static MerchantDescriptionHarness WithSparseResponse(
    string description,
    Guid? sourceRunId = null) =>
    WithResponse(
      description,
      CreateSparseMerchant(),
      sourceRunId);

  /// <summary>
  /// Returns the captured structured request payload.
  /// </summary>
  /// <returns>The first captured request.</returns>
  public GenerativeRequest CapturedRequest() => Broker.CapturedRequests[0];

  private static Merchant CreateMerchant() =>
    new()
    {
      Name = "Corner Shop SRL",
      Description = "Neighborhood grocery retailer.",
      Classification = ClassificationTestData.Nace("47.11", "Retail sale in non-specialised stores"),
      Address = new ContactInformation
      {
        FullName = "Corner Shop SRL",
        Address = "Strada Exemplu 1, Bucharest, Romania",
        PhoneNumber = "+40 21 000 0000",
        EmailAddress = "contact@example.test",
        Website = string.Empty,
      },
      ParentCompanyId = Guid.Empty,
      ReferencedInvoices = [Guid.NewGuid()],
    };

  private static Merchant CreateSparseMerchant() =>
    new()
    {
      Name = "Market",
      Description = string.Empty,
      Classification = null,
      Address = new ContactInformation(),
      ParentCompanyId = Guid.Empty,
      ReferencedInvoices = [],
    };

  private static object CreateMerchantDescriptionOutput(string description)
  {
    Type? outputType = typeof(GenerativeAnalysisFoundationService).GetNestedType(
      "MerchantDescriptionOutput",
      BindingFlags.NonPublic);

    if (outputType is null)
    {
      throw new InvalidOperationException("Merchant description output type could not be located.");
    }

    return Activator.CreateInstance(
      outputType,
      BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic,
      binder: null,
      args: [description],
      culture: null)
      ?? throw new InvalidOperationException("Merchant description output type could not be constructed.");
  }
}
