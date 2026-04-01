namespace arolariu.Backend.Domain.Invoices.Brokers.AnalysisBrokers.ClassifierBroker;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Linq;
using System.Threading.Tasks;

using arolariu.Backend.Common.Options;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DTOs;

using Azure.AI.OpenAI;

using Microsoft.Extensions.Logging;

/// <summary>
/// Azure AI Foundry concrete broker responsible for Large Language Model (LLM) backed enrichment of invoice domain aggregates.
/// </summary>
/// <remarks>
/// <para><b>Role (The Standard):</b> Implements the <see cref="IClassifierBroker"/> abstraction by issuing chat completion
/// requests to Azure AI Foundry (Cognitive Services) model router and mapping raw responses back into domain objects. Provides ONLY translation and graceful
/// degradation — NO orchestration, persistence, retry policy, caching, or domain validation (handled upstream).</para>
/// <para><b>Enrichment Pipeline:</b> Parallelizes LLM calls into 3 batches (when enabled by <see cref="AnalysisOptions"/>): 
/// Batch 1 (invoice name + description), Batch 2 (all product categories + allergens), Batch 3 (possible recipes + invoice category). 
/// Each prompt failure (e.g. content filter rejection) results in a default / empty fallback without aborting the remaining steps.</para>
/// <para><b>Resilience:</b> Catches <c>ClientResultException</c> (Azure SDK) per step and converts it to silent fallback (empty string /
/// default enum / empty collection) to keep a best-effort enrichment model. Upstream layers MAY introduce logging or metrics decorators.</para>
/// <para><b>Determinism:</b> Non-deterministic by design; repeated executions can yield variant textual outputs. Upstream caching or
/// freeze-on-first-success strategies SHOULD be applied if immutability is desired.</para>
/// <para><b>Thread Safety:</b> Reuses a single <see cref="AzureOpenAIClient"/> instance which is thread-safe; the class itself contains no mutable shared state.</para>
/// <para><b>Security:</b> Uses <see cref="Azure.AzureKeyCredential"/> with the AI Foundry (Cognitive Services) endpoint and API key from application configuration.
/// Ensure environment variables are correctly provisioned in deployment.</para>
/// </remarks>
[ExcludeFromCodeCoverage] // brokers are not tested - they are wrappers over external services.
public sealed partial class AzureClassifierBroker : IClassifierBroker
{
  private readonly AzureOpenAIClient openAIClient;
  private readonly ILogger<AzureClassifierBroker> logger;

  /// <summary>
  /// Initializes the broker with configuration-driven Azure AI Foundry (Cognitive Services) client settings and logger.
  /// </summary>
  /// <remarks>
  /// <para>Retrieves application options via <paramref name="optionsManager"/> (endpoint + credentials context) and builds a single
  /// long-lived <see cref="AzureOpenAIClient"/> instance connected to Azure AI Foundry model router.</para>
  /// <para>Throws fast on null dependency to fail early in composition root.</para>
  /// </remarks>
  /// <param name="optionsManager">Abstraction supplying strongly typed application options (MUST NOT be null).</param>
  /// <param name="loggerFactory">Logger factory for creating category-specific loggers (MUST NOT be null).</param>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="optionsManager"/> or <paramref name="loggerFactory"/> is null.</exception>
  public AzureClassifierBroker(IOptionsManager optionsManager, ILoggerFactory loggerFactory)
  {
    ArgumentNullException.ThrowIfNull(optionsManager);
    ArgumentNullException.ThrowIfNull(loggerFactory);

    this.logger = loggerFactory.CreateLogger<AzureClassifierBroker>();

    ApplicationOptions options = optionsManager.GetApplicationOptions();

    var endpoint = options.CognitiveServicesEndpoint;  // AI Foundry endpoint
    var apiKey = options.CognitiveServicesKey;          // AI Foundry key

    // Use AzureKeyCredential (same pattern as FormRecognizer + Translator brokers)
    var credentials = new Azure.AzureKeyCredential(apiKey);

    openAIClient = new AzureOpenAIClient(
      endpoint: new Uri(endpoint),
      credential: credentials);
  }

  /// <summary>
  /// Executes the full enrichment sequence over a single invoice aggregate.
  /// </summary>
  /// <remarks>
  /// <para><b>Sequence (Parallelized):</b> Batch 1: Name + Description (parallel) -> Batch 2: All products (category + allergens per product in parallel) -> Batch 3: Recipes + Invoice category (parallel).</para>
  /// <para><b>Performance:</b> Parallelizes 24+ sequential API calls into 3 parallel batches, reducing latency from ~40s to ~12-15s for typical 10-item invoices.</para>
  /// <para><b>Graceful Degradation:</b> Each discrete LLM call is isolated; on content filter or transient provider exception the step
  /// yields a default and processing continues. No aggregate rollback is attempted.</para>
  /// <para><b>Mutation:</b> Operates on the supplied <paramref name="invoice"/> instance in-place (returns same reference) to avoid
  /// unnecessary allocations. Callers expecting immutability SHOULD clone prior to invocation.</para>
  /// <para><b>Thread Safety:</b> Each product task writes to its own product instance with no shared state mutation, making parallelization safe.</para>
  /// <para><b>Options:</b> Current implementation does not yet conditionally branch by <paramref name="options"/> flags (backlog: selective
  /// enrichment to reduce token spend).</para>
  /// </remarks>
  /// <param name="invoice">Invoice aggregate to enrich (MUST NOT be null; MUST have initialized <c>Items</c> collection).</param>
  /// <param name="options">Analysis directives (currently advisory; future selective gating).</param>
  /// <returns>Mutated invoice aggregate (same instance) after best-effort enrichment.</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="invoice"/> is null.</exception>
  public async ValueTask<Invoice> PerformGptAnalysisOnSingleInvoice(Invoice invoice, AnalysisOptions options)
  {
    ArgumentNullException.ThrowIfNull(invoice);

    logger.LogGptAnalysisStarted(ChatModelDeploymentName);

    // Batch 1: Invoice-level metadata (parallel — independent calls)
    var nameTask = GenerateInvoiceName(invoice);
    var descriptionTask = GenerateInvoiceDescription(invoice);
    await Task.WhenAll(nameTask, descriptionTask).ConfigureAwait(false);
    invoice.Name = await nameTask.ConfigureAwait(false);
    invoice.Description = await descriptionTask.ConfigureAwait(false);

    // Batch 2: Per-product classification (all products in parallel, category + allergens in parallel per product)
    #region Generate possible products
    var productTasks = invoice.Items.Select(async product =>
    {
      var categoryTask = GenerateProductCategory(product);
      var allergensTask = GenerateProductAllergens(product);
      await Task.WhenAll(categoryTask, allergensTask).ConfigureAwait(false);
      product.Category = await categoryTask.ConfigureAwait(false);
      product.DetectedAllergens = await allergensTask.ConfigureAwait(false);
    });
    await Task.WhenAll(productTasks).ConfigureAwait(false);
    #endregion

    // Batch 3: Post-classification (parallel — recipes + category)
    #region Generate possible recipes and invoice category.
    var recipesTask = GenerateInvoiceRecipes(invoice);
    var categoryTask = GenerateInvoiceCategory(invoice);
    await Task.WhenAll(recipesTask, categoryTask).ConfigureAwait(false);

    var possibleRecipesCollection = await recipesTask.ConfigureAwait(false);
    foreach (var recipe in possibleRecipesCollection)
    {
      invoice.PossibleRecipes.Add(recipe);
    }
    invoice.Category = await categoryTask.ConfigureAwait(false);
    #endregion

    // Batch 4: GPT fallback for empty OCR fields (parallel when applicable)
    #region Fallback for empty ReceiptType and CountryRegion
    var fallbackTasks = new List<Task>();

    if (string.IsNullOrEmpty(invoice.ReceiptType))
    {
      fallbackTasks.Add(Task.Run(async () =>
      {
        invoice.ReceiptType = await GenerateReceiptType(invoice).ConfigureAwait(false);
      }));
    }

    if (string.IsNullOrEmpty(invoice.CountryRegion))
    {
      fallbackTasks.Add(Task.Run(async () =>
      {
        invoice.CountryRegion = await GenerateCountryRegion(invoice).ConfigureAwait(false);
      }));
    }

    if (fallbackTasks.Count > 0)
    {
      await Task.WhenAll(fallbackTasks).ConfigureAwait(false);
    }
    #endregion

    return invoice;
  }

  /// <summary>
  /// Executes merchant enrichment sequence including category classification and description generation.
  /// </summary>
  /// <remarks>
  /// <para><b>Sequence:</b> Category classification -> Description generation.</para>
  /// <para><b>Graceful Degradation:</b> Failures yield default category (OTHER) and empty description.</para>
  /// <para><b>Mutation:</b> Operates on supplied <paramref name="merchant"/> in-place (returns same reference).</para>
  /// <para><b>Integration Point:</b> Should be called from <c>MerchantOrchestrationService</c> during merchant 
  /// creation/update flows to ensure category is populated before persistence.</para>
  /// </remarks>
  /// <param name="merchant">Merchant entity to enrich (MUST NOT be null; MUST have Name populated).</param>
  /// <returns>Mutated merchant entity (same instance) with enriched category and description.</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="merchant"/> is null.</exception>
  public async ValueTask<Merchant> PerformGptAnalysisOnSingleMerchant(Merchant merchant)
  {
    ArgumentNullException.ThrowIfNull(merchant);

#pragma warning disable CA1031 // Do not catch general exception types - intentional for graceful degradation contract
    try
    {
      merchant.Category = await GenerateMerchantCategory(merchant).ConfigureAwait(false);
    }
    catch (Exception ex)
    {
      logger.LogGptMethodFailedWithContext(nameof(GenerateMerchantCategory), merchant.Name, ex.Message);
      // Graceful degradation: default to OTHER on any failure (including non-ClientResultException)
      merchant.Category = MerchantCategory.OTHER;
    }
#pragma warning restore CA1031 // Do not catch general exception types

    // Generate description for non-OTHER categories or for OTHER merchants with a known name
    if (merchant.Category != MerchantCategory.OTHER || !string.IsNullOrWhiteSpace(merchant.Name))
    {
#pragma warning disable CA1031 // Do not catch general exception types - intentional for graceful degradation contract
      try
      {
        var description = await GenerateMerchantDescription(merchant).ConfigureAwait(false);
        if (!string.IsNullOrWhiteSpace(description))
        {
          merchant.AdditionalMetadata["ai.description"] = description;
        }
      }
      catch (Exception ex)
      {
        logger.LogGptMethodFailedWithContext(nameof(GenerateMerchantDescription), merchant.Name, ex.Message);
        // Graceful degradation: skip description on any failure (including non-ClientResultException)
        // No action needed - description remains absent from metadata
      }
#pragma warning restore CA1031 // Do not catch general exception types
    }

    return merchant;
  }
}
