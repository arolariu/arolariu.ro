using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Threading.Tasks;
using System;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;

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
        this.Entry(@object).State = entityState;
        await SaveChangesAsync().ConfigureAwait(false);
        return @object;
    }

    private static void SetModelReferences(ModelBuilder modelBuilder)
    {
        ArgumentNullException.ThrowIfNull(modelBuilder);
        modelBuilder.Entity<Invoice>(entity =>
        {
            entity.ToContainer("Invoices");

            entity.Property(invoice => invoice.UserIdentifier)
                .HasConversion<string>();

            entity.Property(invoice => invoice.Id)
                .HasConversion<string>();

            entity.HasPartitionKey(invoice => invoice.UserIdentifier);
            entity.HasNoDiscriminator();
            entity.HasIndex(invoice => invoice.Id);
        });
    }
    /// <inheritdoc/>
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        SetModelReferences(modelBuilder);
    }
}
