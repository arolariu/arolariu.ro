using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Threading.Tasks;
using System;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.Modules.ValueConverters;

namespace arolariu.Backend.Domain.Invoices.Brokers.InvoiceSqlBroker;

public partial class InvoiceNoSqlBroker
{
    /// <summary>
    /// The invoices DbSet.
    /// </summary>
    public DbSet<Invoice> Invoices => Set<Invoice>();

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
        this.Entry(@object).State = entityState;
        await SaveChangesAsync().ConfigureAwait(false);
        return @object;
    }

    private static void SetModelReferences(ModelBuilder modelBuilder)
    {
        ArgumentNullException.ThrowIfNull(modelBuilder);
        modelBuilder.Entity<Invoice>(entity =>
        {
            entity.ToContainer("invoices");

            entity.Property(invoice => invoice.Id)
                .HasConversion<string>();

            entity.Property(invoice => invoice.PhotoLocation)
                .HasConversion<string>();

            entity.Property(invoice => invoice.Description)
                .IsRequired();

            entity.Property(invoice => invoice.PaymentInformation)
                .HasConversion(new PaymentInformationValueConverter());

            entity.Property(invoice => invoice.EstimatedSurvivalDays)
                .HasDefaultValue(int.MinValue);

            entity.Property(invoice => invoice.PossibleRecipes)
                .HasConversion(new IEnumerableOfRecipeValueConverter());

            entity.Property(invoice => invoice.UserIdentifier)
                .HasConversion<string>();

            entity.Property(invoice => invoice.Merchant)
                .HasConversion(new MerchantValueConverter());

            entity.OwnsMany(invoice => invoice.Items,
            items =>
            {
                items.Property(item => item.DetectedAllergens)
                    .HasConversion(new IEnumerableOfAllergenValueConverter());
            });

            entity.Property(invoice => invoice.TimeInformation)
                .HasConversion(new TimeInformationValueConverter());

            entity.Property(invoice => invoice.Metadata)
                .HasConversion(new MetadataValueConverter());

            entity.Property(invoice => invoice.AdditionalMetadata)
                .HasConversion(new IEnumerableOfKVPairValueConverter());

            entity.HasIndex(invoice => invoice.Id);
            entity.HasPartitionKey(invoice => invoice.UserIdentifier);
            entity.HasNoDiscriminator();
        });
    }
    /// <inheritdoc/>
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        SetModelReferences(modelBuilder);
    }
}
