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
/// The Entity Framework Invoice SQL broker.
/// </summary>
[ExcludeFromCodeCoverage]
public sealed partial class InvoiceNoSqlBroker : DbContext, IInvoiceNoSqlBroker
{
	private CosmosClient CosmosClient { get; }

	/// <summary>
	/// Entity Framework Invoice NoSQL broker constructor.
	/// </summary>
	/// <param name="client"></param>
	/// <param name="options"></param>
	public InvoiceNoSqlBroker(CosmosClient client, DbContextOptions<InvoiceNoSqlBroker> options) : base(options)
	{
		ArgumentNullException.ThrowIfNull(client);
		ArgumentNullException.ThrowIfNull(options);
		CosmosClient = client;
	}

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

	private static void SetModelReferences(ModelBuilder modelBuilder)
	{
		ArgumentNullException.ThrowIfNull(modelBuilder);

		// Map the invoice entity to the invoices container.
		SetModelReferencesForInvoiceModel(modelBuilder);

		// Map the merchant entity to the merchant container.
		SetModelReferencesForMerchantModel(modelBuilder);
	}

	/// <inheritdoc/>
	protected override void OnModelCreating(ModelBuilder modelBuilder)
	{
		base.OnModelCreating(modelBuilder);
		SetModelReferences(modelBuilder);
	}
}
