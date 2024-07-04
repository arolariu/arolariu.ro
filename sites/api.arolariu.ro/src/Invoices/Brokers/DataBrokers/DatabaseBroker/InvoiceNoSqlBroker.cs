namespace arolariu.Backend.Domain.Invoices.Brokers.DataBrokers.DatabaseBroker;
using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Products;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.Modules.ValueConverters;

using Microsoft.EntityFrameworkCore;

/// <summary>
/// The Entity Framework Invoice SQL broker.
/// </summary>
[ExcludeFromCodeCoverage]
public sealed partial class InvoiceNoSqlBroker(DbContextOptions<InvoiceNoSqlBroker> options)
	: DbContext(options), IInvoiceNoSqlBroker
{
	private DbSet<Invoice> InvoicesContext => Set<Invoice>();

	private DbSet<Merchant> MerchantContext => Set<Merchant>();

	private static void SetModelReferences(ModelBuilder modelBuilder)
	{
		ArgumentNullException.ThrowIfNull(modelBuilder);

		// Map the invoice entity to the invoices container.
		modelBuilder.Entity<Invoice>(entity =>
		{
			entity.ToContainer("invoices");

			entity.Property(i => i.Id).HasConversion<string>();
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

			#region Complex types
			entity.Property(i => i.PaymentInformation)
				.HasConversion(new PaymentInformationValueConverter());
			entity.Property(i => i.PossibleRecipes)
				.HasConversion(new IEnumerableOfXTypeValueConverter<Recipe>());
			entity.Property(i => i.AdditionalMetadata)
				.HasConversion(new IEnumerableOfXTypeValueConverter<KeyValuePair<string, object>>());
			#endregion

			entity.HasIndex(invoice => invoice.Id);
			entity.HasPartitionKey(invoice => invoice.UserIdentifier);
			entity.HasNoDiscriminator(); // we will only store invoices in this container
		});

		modelBuilder.Entity<Invoice>().OwnsMany<Product>(invoice => invoice.Items,
		items =>
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

			items.Property(item => item.TotalPrice)
				.ToJsonProperty("TotalPrice")
				.HasConversion<decimal>();

			items.Property(item => item.DetectedAllergens)
				.ToJsonProperty("DetectedAllergens")
				.HasConversion(new IEnumerableOfXTypeValueConverter<Allergen>());
		});

		modelBuilder.Entity<Invoice>().OwnsOne<Merchant>(invoice => invoice.Merchant,
			merchant =>
		{
			merchant.ToJsonProperty("Merchant");
			merchant.Property(m => m.Id).HasConversion<string>();
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
	}

	/// <inheritdoc/>
	protected override void OnModelCreating(ModelBuilder modelBuilder)
	{
		base.OnModelCreating(modelBuilder);
		SetModelReferences(modelBuilder);
	}
}
