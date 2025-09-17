namespace arolariu.Backend.Domain.Invoices.Brokers.DataBrokers.DatabaseBroker;

using System;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Domain.Invoices.Brokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.Modules.ValueConverters;

using Microsoft.Azure.Cosmos;
using Microsoft.EntityFrameworkCore;

/// <summary>
/// Entity Framework Core (Cosmos provider) context implementing the <see cref="IInvoiceNoSqlBroker"/> contract for invoice and merchant aggregates.
/// </summary>
/// <remarks>
/// <para><b>Responsibilities:</b> Configures entity-to-container mappings, JSON property names, value conversions for strongly typed / value object
/// members, owned collections, and partition key assignments. Performs no domain validation or business rule enforcement.</para>
/// <para><b>Containers:</b> Invoices mapped to <c>invoices</c> (partitioned by <c>UserIdentifier</c>); Merchants mapped to <c>merchants</c>
/// (partitioned by <c>ParentCompanyId</c>).</para>
/// <para><b>Owned Types:</b> <c>Items</c> (products), <c>PossibleRecipes</c>, and <c>PaymentInformation</c> configured as owned to ensure embedded
/// document structure in Cosmos JSON.</para>
/// <para><b>Soft Delete:</b> Relies on <c>IsSoftDeleted</c> flags (invoice and product metadata) — filtering is applied by higher layer query logic; the context
/// does not automatically filter them out.</para>
/// <para><b>Performance:</b> Explicit JSON property names and conversions reduce implicit reflection cost and ensure stable persisted schema.</para>
/// <para><b>Thread-safety:</b> Inherits EF Core DbContext non-thread-safe semantics. Scope per logical unit-of-work.</para>
/// </remarks>
[ExcludeFromCodeCoverage]
public sealed partial class InvoiceNoSqlBroker : DbContext, IInvoiceNoSqlBroker
{
	/// <summary>
	/// Underlying Azure Cosmos DB client used for low-level container operations (point reads, queries outside EF tracking pipeline in partial implementations).
	/// </summary>
	/// <remarks><para>Injected externally to allow pooling and centralized configuration (retry policies, diagnostics).</para></remarks>
	private CosmosClient CosmosClient { get; }

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
	public InvoiceNoSqlBroker(CosmosClient client, DbContextOptions<InvoiceNoSqlBroker> options) : base(options)
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
	/// collection serialization), indices and owned navigations (products, recipes, payment information).</para>
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
			entity.Property(i => i.Category).HasConversion<string>();
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

			entity.HasIndex(invoice => invoice.id);
			entity.HasPartitionKey(invoice => invoice.UserIdentifier);
			entity.HasNoDiscriminator(); // we will only store invoices in this container
		});

		modelBuilder.Entity<Invoice>().OwnsMany<Product>(navigationExpression: invoice => invoice.Items,
			buildAction: items =>
			{
				items.ToJsonProperty("Items");

				items.Property(item => item.RawName)
				.ToJsonProperty("RawName")
				.HasConversion<string>();

				items.Property(item => item.GenericName)
				.ToJsonProperty("GenericName")
				.HasConversion<string>();

				items.Property(item => item.Category)
				.ToJsonProperty("Category")
				.HasConversion<string>();

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

				items.Property(item => item.DetectedAllergens)
				.ToJsonProperty("DetectedAllergens")
				.HasConversion(new ValueConverterForIEnumerableOf<Allergen>());
			});

		modelBuilder.Entity<Invoice>().OwnsMany<Recipe>(navigationExpression: invoice => invoice.PossibleRecipes,
			buildAction: recipes =>
			{
				recipes.ToJsonProperty("PossibleRecipes");

				recipes.Property(recipe => recipe.Name)
				.ToJsonProperty("Name")
				.HasConversion<string>();

				recipes.Property(recipe => recipe.Description)
				.ToJsonProperty("Description")
				.HasConversion<string>();

				recipes.Property(recipe => recipe.ApproximateTotalDuration)
				.ToJsonProperty("ApproximateTotalDuration")
				.HasConversion<int>();

				recipes.Property(recipe => recipe.Complexity)
				.ToJsonProperty("Complexity")
				.HasConversion<string>();

				recipes.Property(recipe => recipe.Ingredients)
				.ToJsonProperty("Ingredients")
				.HasConversion(new ValueConverterForIEnumerableOf<string>());

				recipes.Property(recipe => recipe.ReferenceForMoreDetails)
				.ToJsonProperty("ReferenceForMoreDetails")
				.HasConversion<string>();
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
	private static void SetModelReferencesForMerchantModel(ModelBuilder modelBuilder)
	{
		modelBuilder.Entity<Merchant>(entity =>
		{
			entity.ToContainer("merchants");

			entity.Property(m => m.id).ToJsonProperty("id").HasConversion<string>();
			entity.Property(m => m.ParentCompanyId).HasConversion<string>();

			#region Base types
			entity.Property(i => i.Name).HasConversion<string>();
			entity.Property(i => i.Category).HasConversion<string>();
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
	}

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
	/// <para>Adds custom entity and owned-type mapping after base configuration. Intentionally idempotent and safe for repeated model cache usage.</para>
	/// </remarks>
	protected override void OnModelCreating(ModelBuilder modelBuilder)
	{
		base.OnModelCreating(modelBuilder);
		SetModelReferences(modelBuilder);
	}
}
