namespace arolariu.Backend.Domain.Invoices.Brokers.DataBrokers.DatabaseBroker;

using System;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Domain.Invoices.Brokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Recipes;
using arolariu.Backend.Domain.Invoices.Brokers.DatabaseBroker.ValueConverters;
using arolariu.Backend.Domain.Invoices.Modules.ValueConverters;

using Microsoft.Azure.Cosmos;
using Microsoft.EntityFrameworkCore;

/// <summary>
/// Entity Framework Core (Cosmos provider) context declaring an EF model for invoice and merchant aggregates.
/// </summary>
/// <remarks>
/// <para><b>⚠ The EF model below is INACTIVE at runtime.</b> Every operation implemented by this broker
/// (<c>CosmosDatabaseBroker.Invoices.cs</c> and <c>CosmosDatabaseBroker.Merchants.cs</c>) goes through the raw
/// <see cref="CosmosClient"/> - <c>GetDatabase("primary").GetContainer(...)</c> followed by <c>CreateItemAsync</c>,
/// <c>ReadItemAsync&lt;T&gt;</c>, <c>GetItemQueryIterator&lt;T&gt;</c>, <c>UpsertItemAsync</c>, or
/// <c>ReplaceItemAsync</c>. There is no <c>DbSet</c>, no <c>Set&lt;T&gt;()</c>, and no <c>SaveChangesAsync</c> call
/// anywhere in this broker, so <see cref="OnModelCreating"/>, the container/partition-key mappings, the owned-type
/// configuration, and every value converter referenced here never participate in a production read or write.</para>
/// <para><b>Authoritative persistence behaviour:</b> The wire format is produced by the Cosmos SDK's own serializer.
/// <c>CosmosClientOptions</c> never sets <c>UseSystemTextJsonSerializerWithOptions</c>, so that is the SDK default
/// (Newtonsoft-based). The contract that actually governs stored documents is therefore the aggregates' JSON
/// attributes and constructors, pinned by <c>AnalysisPersistenceSerializationTests</c> - not this model. Changing a
/// value converter here changes nothing observable in production.</para>
/// <para><b>Why it is retained:</b> The model is kept as-is, deliberately, as dormant configuration for a possible
/// future migration onto EF Core. It has NOT been validated against EF's model-building rules and is known to
/// contain at least one unmapped member (<c>Invoice.AdditionalMetadata</c>). Anyone activating the EF path MUST
/// first build and validate the model rather than assuming it is correct.</para>
/// <para><b>Responsibilities (raw-SDK path):</b> Container selection, partition-key selection, Cosmos exception
/// translation, and telemetry. No domain validation or business rule enforcement.</para>
/// <para><b>Containers:</b> Invoices in <c>invoices</c> (partitioned by <c>UserIdentifier</c>); merchants in
/// <c>merchants</c> (partitioned by <c>ParentCompanyId</c>, where <see cref="Guid.Empty"/> is the valid partition of
/// an independent merchant).</para>
/// <para><b>Soft Delete:</b> Relies on <c>IsSoftDeleted</c> flags (invoice and product metadata); filtering is applied
/// by the broker's own queries and by higher layer query logic.</para>
/// <para><b>Thread-safety:</b> Inherits EF Core DbContext non-thread-safe semantics. Scope per logical unit-of-work.</para>
/// </remarks>
[ExcludeFromCodeCoverage]
public sealed partial class CosmosDatabaseBroker : DbContext, IDatabaseBroker
{
  /// <summary>
  /// Underlying Azure Cosmos DB client used for low-level container operations (point reads, queries outside EF tracking pipeline in partial implementations).
  /// </summary>
  /// <remarks><para>Injected externally to allow pooling and centralized configuration (retry policies, diagnostics).</para></remarks>
  private CosmosClient CosmosClient { get; }

  /// <summary>
  /// Initializes the broker with a pre-configured Cosmos DB client and default EF Core options.
  /// </summary>
  /// <remarks>
  /// This compatibility overload exists for focused unit tests that exercise the raw Cosmos regions directly
  /// without caring about dormant EF Core model configuration.
  /// </remarks>
  /// <param name="client">Shared <see cref="CosmosClient"/> instance.</param>
  public CosmosDatabaseBroker(CosmosClient client)
    : this(client, new DbContextOptionsBuilder<CosmosDatabaseBroker>().Options)
  {
  }

  /// <summary>
  /// Initializes the broker DbContext with a pre-configured Cosmos DB client and EF Core options.
  /// </summary>
  /// <remarks>
  /// <para>Does not open connections eagerly; defers to EF Core lazy initialization. Ensures required dependencies are non-null.</para>
  /// <para><b>Diagnostics:</b> Upstream configuration may attach logging / tracing interceptors; this constructor performs no instrumentation itself.</para>
  /// </remarks>
  /// <param name="client">Shared <see cref="CosmosClient"/> instance (pooled / singleton at composition root).</param>
  /// <param name="options">EF Core options including provider configuration (database name, connection mode).</param>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="client"/> or <paramref name="options"/> is null.</exception>
  public CosmosDatabaseBroker(CosmosClient client, DbContextOptions<CosmosDatabaseBroker> options) : base(options)
  {
    ArgumentNullException.ThrowIfNull(client);
    ArgumentNullException.ThrowIfNull(options);
    CosmosClient = client;
  }

  /// <summary>
  /// Configures the <see cref="Invoice"/> aggregate mapping for the Cosmos provider.
  /// </summary>
  /// <remarks>
  /// <para>Defines container name, partition key (<c>UserIdentifier</c>), JSON property naming, value conversions (including enumerable converters for
  /// collection serialization), indices and owned navigations (products, payment information).</para>
  /// <para><b>Design Notes:</b> <c>HasNoDiscriminator()</c> used to avoid adding a synthetic type field as only a single aggregate type resides in the container.</para>
  /// </remarks>
  /// <param name="modelBuilder">The mutable model builder.</param>
  private static void SetModelReferencesForInvoiceModel(ModelBuilder modelBuilder)
  {
    modelBuilder.Entity<Invoice>(entity =>
    {
      entity.ToContainer("invoices");

      entity.Property(i => i.id).ToJsonProperty("id").HasConversion<string>();
      entity.Property(i => i.UserIdentifier).HasConversion<string>();

      #region Base types
      entity.Property(i => i.Name).HasConversion<string>();
      entity.Property(i => i.CreatedBy).HasConversion<string>();
      entity.Property(i => i.IsImportant).HasConversion<bool>();
      entity.Property(i => i.IsSoftDeleted).HasConversion<bool>();
      entity.Property(i => i.Description).HasConversion<string>();
      entity.Property(i => i.NumberOfUpdates).HasConversion<int>();
      entity.Property(i => i.LastUpdatedBy).HasConversion<string>();
      entity.Property(i => i.MerchantReference).HasConversion<string>();
      entity.Property(i => i.CreatedAt).HasConversion<DateTimeOffset>();
      entity.Property(i => i.LastUpdatedAt).HasConversion<DateTimeOffset>();
      entity.Property(i => i.SharedWith).HasConversion(new ValueConverterForIEnumerableOf<Guid>());
      #endregion

      #region Analysis value objects
      entity.Property(i => i.Classification)
      .ToJsonProperty("Classification")
      .HasConversion(new ValueConverterForValueObjectOf<StandardClassification>());

      entity.Property(i => i.PossibleRecipes)
      .ToJsonProperty("PossibleRecipes")
      .HasConversion(new ValueConverterForIEnumerableOf<RecipeSuggestion>());
      #endregion

      entity.HasIndex(invoice => invoice.id);
      entity.HasPartitionKey(invoice => invoice.UserIdentifier);
      entity.HasNoDiscriminator(); // we will only store invoices in this container
    });

    modelBuilder.Entity<Invoice>().OwnsMany<Product>(navigationExpression: invoice => invoice.Items,
      buildAction: items =>
      {
        items.ToJsonProperty("Items");

        items.Property(item => item.Name)
        .ToJsonProperty("Name")
        .HasConversion<string>();

        items.Property(item => item.Classification)
        .ToJsonProperty("Classification")
        .HasConversion(new ValueConverterForValueObjectOf<StandardClassification>());

        items.Property(item => item.Quantity)
        .ToJsonProperty("Quantity")
        .HasConversion<decimal>();

        items.Property(items => items.QuantityUnit)
        .ToJsonProperty("QuantityUnit")
        .HasConversion<string>();

        items.Property(item => item.ProductCode)
        .ToJsonProperty("ProductCode")
        .HasConversion<string>();

        items.Property(item => item.Price)
        .ToJsonProperty("Price")
        .HasConversion<decimal>();

        items.Property(item => item.AllergenAssessment)
        .ToJsonProperty("AllergenAssessment")
        .HasConversion(new ValueConverterForValueObjectOf<AllergenAssessment>());
      });

    modelBuilder.Entity<Invoice>().OwnsOne<PaymentInformation>(navigationExpression: invoice => invoice.PaymentInformation,
      buildAction: paymentInformation =>
      {
        paymentInformation.ToJsonProperty("PaymentInformation");

        paymentInformation.Property(pi => pi.TransactionDate)
        .ToJsonProperty("TransactionDate")
        .HasConversion<DateTimeOffset>();

        paymentInformation.Property(pi => pi.PaymentType)
        .ToJsonProperty("PaymentType")
        .HasConversion<string>();

        paymentInformation.Property(pi => pi.Currency)
        .ToJsonProperty("Currency");

        paymentInformation.Property(pi => pi.TotalCostAmount)
        .ToJsonProperty("TotalCostAmount")
        .HasConversion<decimal>();

        paymentInformation.Property(pi => pi.TotalTaxAmount)
        .ToJsonProperty("TotalTaxAmount")
        .HasConversion<decimal>();
      });
  }

  /// <summary>
  /// Configures the <see cref="Merchant"/> entity mapping for the Cosmos provider.
  /// </summary>
  /// <remarks>
  /// <para>Defines container name, partition key (<c>ParentCompanyId</c>), JSON property conversions and indexing strategy on <c>id</c>.</para>
  /// <para>Currently no owned sub-collections. Soft delete flag present at entity level for parity with invoices (future enablement).</para>
  /// </remarks>
  /// <param name="modelBuilder">The mutable model builder.</param>
  private static void SetModelReferencesForMerchantModel(ModelBuilder modelBuilder) =>
    modelBuilder.Entity<Merchant>(entity =>
    {
      entity.ToContainer("merchants");

      entity.Property(m => m.id).ToJsonProperty("id").HasConversion<string>();
      entity.Property(m => m.ParentCompanyId).HasConversion<string>();

      #region Base types
      entity.Property(i => i.Name).HasConversion<string>();
      entity.Property(m => m.Classification)
      .ToJsonProperty("Classification")
      .HasConversion(new ValueConverterForValueObjectOf<StandardClassification>());
      entity.Property(i => i.CreatedBy).HasConversion<string>();
      entity.Property(i => i.IsImportant).HasConversion<bool>();
      entity.Property(i => i.IsSoftDeleted).HasConversion<bool>();
      entity.Property(i => i.Description).HasConversion<string>();
      entity.Property(i => i.NumberOfUpdates).HasConversion<int>();
      entity.Property(i => i.LastUpdatedBy).HasConversion<string>();
      entity.Property(i => i.CreatedAt).HasConversion<DateTimeOffset>();
      entity.Property(i => i.LastUpdatedAt).HasConversion<DateTimeOffset>();
      #endregion

      entity.HasIndex(merchant => merchant.id);
      entity.HasPartitionKey(merchant => merchant.ParentCompanyId);
      entity.HasNoDiscriminator(); // we will only store merchants in this container
    });

  /// <summary>
  /// Orchestrates model configuration for all aggregates/entities in this broker context.
  /// </summary>
  /// <remarks>
  /// <para>Delegates to specialized configuration methods to maintain separation of concerns and reduce method length.</para>
  /// </remarks>
  /// <param name="modelBuilder">The mutable model builder.</param>
  private static void SetModelReferences(ModelBuilder modelBuilder)
  {
    ArgumentNullException.ThrowIfNull(modelBuilder);

    // Map the invoice entity to the invoices container.
    SetModelReferencesForInvoiceModel(modelBuilder);

    // Map the merchant entity to the merchant container.
    SetModelReferencesForMerchantModel(modelBuilder);
  }

  /// <inheritdoc/>
  /// <remarks>
  /// <para><b>Never invoked on the production path.</b> This broker performs all persistence through the raw Cosmos
  /// SDK, so EF never builds this model. See the type-level remarks on <see cref="CosmosDatabaseBroker"/> before
  /// relying on anything configured here.</para>
  /// </remarks>
  protected override void OnModelCreating(ModelBuilder modelBuilder)
  {
    base.OnModelCreating(modelBuilder);
    SetModelReferences(modelBuilder);
  }
}
