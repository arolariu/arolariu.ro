namespace arolariu.Backend.Domain.Invoices.Brokers.DataBrokers.DatabaseBroker;
using System;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Domain.Invoices.Brokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Products;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
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

    private static void SetModelReferences(ModelBuilder modelBuilder)
	{
		ArgumentNullException.ThrowIfNull(modelBuilder);

		#region Map the invoice entity to the invoices container.
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
			entity.Property(i => i.PhotoLocation).HasConversion<string>();
			entity.Property(i => i.CreatedAt).HasConversion<DateTimeOffset>();
			entity.Property(i => i.LastUpdatedAt).HasConversion<DateTimeOffset>();
			#endregion

			entity.HasIndex(invoice => invoice.id);
			entity.HasPartitionKey(invoice => invoice.UserIdentifier);
			entity.HasNoDiscriminator(); // we will only store invoices in this container
		});

		modelBuilder.Entity<Invoice>().OwnsMany<Product>(navigationExpression: invoice => invoice.Items,
			buildAction: items =>
		{
			items.ToTable("products");
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
				.HasConversion(new IEnumerableOfXTypeValueConverter<Allergen>());
		});

		modelBuilder.Entity<Invoice>().OwnsMany<Recipe>(navigationExpression: invoice => invoice.PossibleRecipes,
			buildAction: recipes =>
		{
			recipes.ToJsonProperty("PossibleRecipes");

			recipes.Property(recipe => recipe.Name)
				.ToJsonProperty("Name")
				.HasConversion<string>();

			recipes.Property(recipe => recipe.Duration)
				.ToJsonProperty("Duration")
				.HasConversion<TimeOnly>();

			recipes.Property(recipe => recipe.Complexity)
				.ToJsonProperty("Complexity")
				.HasConversion<string>();

			recipes.Property(recipe => recipe.Ingredients)
				.ToJsonProperty("Ingredients")
				.HasConversion(new IEnumerableOfXTypeValueConverter<string>());

			recipes.Property(recipe => recipe.Observations)
				.ToJsonProperty("Observations")
				.HasConversion(new IEnumerableOfXTypeValueConverter<string>());
		});

		modelBuilder.Entity<Invoice>().OwnsOne<PaymentInformation>(navigationExpression: invoice => invoice.PaymentInformation,
			buildAction: paymentInformation =>
		{
			paymentInformation.ToJsonProperty("PaymentInformation");

			paymentInformation.Property(pi => pi.DateOfPurchase)
				.ToJsonProperty("DateOfPurchase")
				.HasConversion<DateTimeOffset>();

			paymentInformation.Property(pi => pi.PaymentType)
				.ToJsonProperty("PaymentType")
				.HasConversion<string>();

			paymentInformation.Property(pi => pi.CurrencyName)
				.ToJsonProperty("CurrencyName")
				.HasConversion<string>();

			paymentInformation.Property(pi => pi.CurrencySymbol)
				.ToJsonProperty("CurrencySymbol")
				.HasConversion<string>();

			paymentInformation.Property(pi => pi.TotalAmount)
				.ToJsonProperty("TotalAmount")
				.HasConversion<decimal>();

			paymentInformation.Property(pi => pi.TotalTax)
				.ToJsonProperty("TotalTax")
				.HasConversion<decimal>();
		});

		modelBuilder.Entity<Invoice>().OwnsOne<Merchant>(navigationExpression: invoice => invoice.Merchant,
			buildAction: merchant =>
		{
			merchant.ToTable("merchants");
			merchant.ToJsonProperty("Merchant");

			merchant.Property(m => m.id).ToJsonProperty("id").HasConversion<string>();
			merchant.Property(m => m.ParentCompanyId).HasConversion<string>();

			#region Base types
			merchant.Property(m => m.Name).HasConversion<string>();
			merchant.Property(m => m.Address).HasConversion<string>();
			merchant.Property(m => m.Category).HasConversion<string>();
			merchant.Property(m => m.CreatedBy).HasConversion<string>();
			merchant.Property(m => m.IsImportant).HasConversion<bool>();
			merchant.Property(m => m.IsSoftDeleted).HasConversion<bool>();
			merchant.Property(m => m.Description).HasConversion<string>();
			merchant.Property(m => m.PhoneNumber).HasConversion<string>();
			merchant.Property(m => m.NumberOfUpdates).HasConversion<int>();
			merchant.Property(m => m.LastUpdatedBy).HasConversion<string>();
			merchant.Property(m => m.CreatedAt).HasConversion<DateTimeOffset>();
			merchant.Property(m => m.LastUpdatedAt).HasConversion<DateTimeOffset>();
			#endregion
		});
		#endregion

		/* 
		 * The following code is used to map the merchant and product entities to their respective containers.
		 * The merchant and product entities are stored in separate containers.
		 * The merchant entity is stored in the "merchants" container.
		 * The product entity is stored in the "products" container.
			#region Map the merchant entity to the merchant container.
			modelBuilder.Entity<Merchant>(entity =>
			{
				entity.ToContainer("merchants");

				entity.Property(m => m.Id).ToJsonProperty("id").HasConversion<string>();
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

				entity.HasIndex(merchant => merchant.Id);
				entity.HasPartitionKey(merchant => merchant.ParentCompanyId);
				entity.HasNoDiscriminator(); // we will only store merchants in this container
			});
			#endregion

			#region Map the product entity to the products container.
			modelBuilder.Entity<Product>(entity =>
			{
				entity.ToContainer("products");

				entity.Property(i => i.Id).ToJsonProperty("id").HasConversion<string>();

				#region Base types
				entity.Property(i => i.RawName).HasConversion<string>();
				entity.Property(i => i.GenericName).HasConversion<string>();
				entity.Property(i => i.Category).HasConversion<string>();
				entity.Property(i => i.Quantity).HasConversion<decimal>();
				entity.Property(i => i.QuantityUnit).HasConversion<string>();
				entity.Property(i => i.ProductCode).HasConversion<string>();
				entity.Property(i => i.Price).HasConversion<decimal>();
				#endregion

				entity.HasIndex(product => product.Id);
				entity.HasPartitionKey(product => product.Id);
				entity.HasNoDiscriminator(); // we will only store products in this container
			});
			#endregion
		*/
	}

	/// <inheritdoc/>
	protected override void OnModelCreating(ModelBuilder modelBuilder)
	{
		base.OnModelCreating(modelBuilder);
		SetModelReferences(modelBuilder);
	}
}
