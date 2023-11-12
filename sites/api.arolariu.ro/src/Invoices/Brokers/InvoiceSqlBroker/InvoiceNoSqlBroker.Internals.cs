using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Threading.Tasks;
using System;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.Modules.ValueConverters;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Products;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

namespace arolariu.Backend.Domain.Invoices.Brokers.InvoiceSqlBroker;

public partial class InvoiceNoSqlBroker
{
    internal async ValueTask<T> InsertAsync<T>(T @object) =>
    await ChangeEntityStateAndSaveChangesAsync(@object, EntityState.Added)
            .ConfigureAwait(false);

    internal IQueryable<T> SelectAll<T>() where T : class => this.Set<T>();

    internal async ValueTask<T?> SelectAsync<T>(params object[] @objectIds) where T : class =>
    await this.FindAsync<T>(objectIds).ConfigureAwait(false);

    internal async ValueTask<T> UpdateAsync<T>(T @object) =>
    await ChangeEntityStateAndSaveChangesAsync(@object, EntityState.Modified)
            .ConfigureAwait(false);

    internal async ValueTask<T> DeleteAsync<T>(T @object) =>
    await ChangeEntityStateAndSaveChangesAsync(@object, EntityState.Deleted)
            .ConfigureAwait(false);

    internal async ValueTask<T> ChangeEntityStateAndSaveChangesAsync<T>(T @object, EntityState entityState)
    {
        ArgumentNullException.ThrowIfNull(@object);
        switch(entityState)
        {
            case EntityState.Added:
                if (@object is Invoice invoice)
                {
                    var merchant = invoice.Merchant;
                    await this.AddAsync(merchant).ConfigureAwait(false);
                }
                await this.AddAsync(@object).ConfigureAwait(false);
                break;
            case EntityState.Modified:
                await this.UpdateAsync(@object).ConfigureAwait(false);
                break;
            case EntityState.Deleted:
                await this.DeleteAsync(@object).ConfigureAwait(false);
                break;
        }
        await SaveChangesAsync().ConfigureAwait(false);
        return @object;
    }

    private static void SetModelReferences(ModelBuilder modelBuilder)
    {
        ArgumentNullException.ThrowIfNull(modelBuilder);

        // Map the merchant entity to the merchants container.
        modelBuilder.Entity<Merchant>(entity =>
        {
            entity.ToContainer("merchants");

            entity.Property(merchant => merchant.Id)
                .HasConversion<string>();

            entity.Property(merchant => merchant.ParentCompanyId)
                .HasConversion<string>();

            entity.Property(merchant => merchant.MerchantInformation)
                .IsRequired(true);

            entity.Property(merchant => merchant.Category)
                .IsRequired(true);

            entity.HasIndex(merchant => merchant.Id);
            entity.HasPartitionKey(merchant => merchant.ParentCompanyId);
            entity.HasNoDiscriminator();
        });

        // Map the invoice entity to the invoices container.
        modelBuilder.Entity<Invoice>(entity =>
        {
            entity.ToContainer("invoices");

            entity.Property(invoice => invoice.Id)
                .HasConversion<string>();

            entity.Property(invoice => invoice.UserIdentifier)
                .HasConversion<string>();

            entity.Property(invoice => invoice.PhotoLocation)
                .HasConversion<string>();

            entity.Property(invoice => invoice.Description)
                .IsRequired();

            entity.Property(invoice => invoice.TimeInformation)
                .HasConversion(new TimeInformationValueConverter());

            entity.Property(invoice => invoice.PaymentInformation)
                .HasConversion(new PaymentInformationValueConverter());

            entity.Property(invoice => invoice.Merchant)
                .HasConversion(new MerchantValueConverter());

            entity.Property(invoice => invoice.PossibleRecipes)
                .HasConversion(new IEnumerableOfStructTypeValueConverter<Recipe>());

            entity.Property(invoice => invoice.EstimatedSurvivalDays)
                .HasDefaultValue(int.MinValue);

            entity.Property(invoice => invoice.Metadata)
                .HasConversion(new MetadataValueConverter());

            entity.Property(invoice => invoice.AdditionalMetadata)
                .HasConversion(new IEnumerableOfStructTypeValueConverter<KeyValuePair<string, object>>());

            entity.HasIndex(invoice => invoice.Id);
            entity.HasPartitionKey(invoice => invoice.UserIdentifier);
        });

        // Embed the product entity into the invoice entity:
        modelBuilder.Entity<Invoice>().OwnsMany<Product>(invoice => invoice.Items,
        items =>
        {
            items.ToJsonProperty("Items");

            items.Property(item => item.RawName)
                .ToJsonProperty("RawName");

            items.Property(item => item.GenericName)
                .ToJsonProperty("GenericName");

            items.Property(item => item.Category)
                .ToJsonProperty("Category");

            items.Property(item => item.Quantity)
                .ToJsonProperty("Quantity");

            items.Property(item => item.QuantityUnit)
                .ToJsonProperty("QuantityUnit");

            items.Property(item => item.ProductCode)
                .ToJsonProperty("ProductCode");

            items.Property(item => item.Price)
                .ToJsonProperty("Price");

            items.Property(item => item.TotalPrice)
                .ToJsonProperty("TotalPrice");

            items.Property(item => item.DetectedAllergens)
                .ToJsonProperty("DetectedAllergens")
                .HasConversion(new IEnumerableOfStructTypeValueConverter<Allergen>());

            items.Property(item => item.Metadata)
                .ToJsonProperty("Metadata");
        });
    }

    /// <inheritdoc/>
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        SetModelReferences(modelBuilder);
    }
}
