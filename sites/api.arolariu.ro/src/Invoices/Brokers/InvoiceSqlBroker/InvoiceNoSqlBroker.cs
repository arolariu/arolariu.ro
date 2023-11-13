using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Products;
using arolariu.Backend.Domain.Invoices.Modules.ValueConverters;

using Microsoft.EntityFrameworkCore;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Linq;
using System.Threading.Tasks;


namespace arolariu.Backend.Domain.Invoices.Brokers.InvoiceSqlBroker;

/// <summary>
/// The Entity Framework Invoice SQL broker.
/// </summary>
[ExcludeFromCodeCoverage]
public partial class InvoiceNoSqlBroker(DbContextOptions options) : DbContext(options), IInvoiceNoSqlBroker
{
    internal async ValueTask<T> InsertAsync<T>(T @object) =>
    await ChangeEntityStateAndSaveChangesAsync(@object, EntityState.Added)
            .ConfigureAwait(false);

    internal async ValueTask<T> UpdateAsync<T>(T @object) =>
    await ChangeEntityStateAndSaveChangesAsync(@object, EntityState.Modified)
            .ConfigureAwait(false);

    internal async ValueTask<T> DeleteAsync<T>(T @object) =>
    await ChangeEntityStateAndSaveChangesAsync(@object, EntityState.Deleted)
            .ConfigureAwait(false);

    internal IQueryable<T> SelectAll<T>() where T : class => this.Set<T>();

    internal async ValueTask<T?> SelectAsync<T>(params object[] @objectIds) where T : class =>
    await this.FindAsync<T>(objectIds).ConfigureAwait(false);

    internal async ValueTask<T> ChangeEntityStateAndSaveChangesAsync<T>(T @object, EntityState entityState)
    {
        ArgumentNullException.ThrowIfNull(@object);

        switch (entityState)
        {
            case EntityState.Added:
                Add(@object);
                break;
            case EntityState.Modified:
                Update(@object);
                break;
            case EntityState.Deleted:
                Remove(@object);
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

            entity.Property(invoice => invoice.PaymentInformation)
                .HasConversion(new PaymentInformationValueConverter());

            entity.Property(invoice => invoice.PossibleRecipes)
                .HasConversion(new IEnumerableOfStructTypeValueConverter<Recipe>());

            entity.Property(invoice => invoice.AdditionalMetadata)
                .HasConversion(new IEnumerableOfStructTypeValueConverter<KeyValuePair<string, object>>());

            entity.HasIndex(invoice => invoice.Id);
            entity.HasPartitionKey(invoice => invoice.UserIdentifier);
            entity.HasNoDiscriminator();
        });

        // Embed the merchant entity into the invoice entity:
        modelBuilder.Entity<Invoice>()
            .HasOne(invoice => invoice.Merchant)
            .WithMany(merchant => merchant.Invoices)
            .HasForeignKey("MerchantId", "MerchantParentCompanyId")
            .OnDelete(DeleteBehavior.NoAction);

        // Embed the product entity into the invoice entity:
        modelBuilder.Entity<Invoice>().OwnsMany<Product>(invoice => invoice.Items,
        items =>
        {
            items.ToJsonProperty("Items");

            items.Property(item => item.DetectedAllergens)
                .ToJsonProperty("DetectedAllergens")
                .HasConversion(new IEnumerableOfStructTypeValueConverter<Allergen>());
        });
    }

    /// <inheritdoc/>
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        SetModelReferences(modelBuilder);
    }
}
