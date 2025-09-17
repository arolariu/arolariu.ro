namespace arolariu.Backend.Domain.Invoices.Services.Foundation.MerchantStorage;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

/// <summary>
/// Foundation storage contract for persisting and retrieving <see cref="Merchant"/> aggregates.
/// </summary>
/// <remarks>
/// <para><b>Layer Role (The Standard):</b> Direct broker-mediated CRUD plus invariant enforcement for a single aggregate type.
/// NO cross-aggregate orchestration, NO multi-step workflows, NO external side-effects besides persistence.</para>
/// <para><b>Responsibilities:</b></para>
/// <list type="bullet">
///   <item><description>Create, read, enumerate, update, delete merchants.</description></item>
///   <item><description>Validate structural and domain invariants (identifier, category validity, reference list initialization / bounds).</description></item>
///   <item><description>Normalize or sanitize simple fields (e.g. trimming display names) when required.</description></item>
/// </list>
/// <para><b>Partitioning:</b> Optional <c>parentCompanyId</c> acts as logical partition / tenancy discriminator. Implementations SHOULD route queries through this key for cost efficiency. Null may trigger cross-partition scans (backlog: disallow).</para>
/// <para><b>Thread-Safety:</b> Implementations SHOULD be stateless; any caching must be concurrency-safe.</para>
/// <para><b>Idempotency:</b> Create is non-idempotent (duplicate ids rejected); delete and update are idempotent with respect to final persisted state.</para>
/// <para><b>Soft Delete:</b> If soft deletion is adopted in future, this contract MAY evolve; current semantics imply physical or logical removal as defined by implementation.</para>
/// </remarks>
public interface IMerchantStorageFoundationService
{
	#region Create Merchant Object API
	/// <summary>
	/// Persists a new <see cref="Merchant"/> aggregate.
	/// </summary>
	/// <remarks>
	/// <para><b>Validation:</b> Ensures merchant id not empty, required collections (e.g. <c>ReferencedInvoices</c>) initialized, and category values within allowed domain.</para>
	/// <para><b>Failure Modes:</b> Throws validation exceptions on invariant breach, dependency / dependency validation exceptions on broker-level persistence failures (conflicts, connectivity, serialization).</para>
	/// </remarks>
	/// <param name="merchant">Merchant aggregate to persist (MUST NOT be null).</param>
	/// <param name="parentCompanyId">Optional tenancy / partition discriminator.</param>
	/// <returns>Asynchronous task.</returns>
	public Task CreateMerchantObject(Merchant merchant, Guid? parentCompanyId = null);
	#endregion

	#region Read Merchant Object API
	/// <summary>
	/// Retrieves a merchant by identifier (and optional partition).
	/// </summary>
	/// <remarks>
	/// <para><b>Return Semantics:</b> Returns merchant or null if not found (implementations MAY alternatively raise a not-found validation exception depending on policy consistency with invoice storage).</para>
	/// <para><b>Performance:</b> SHOULD use point read within partition; cross-partition read when <c>parentCompanyId</c> absent may degrade throughput.</para>
	/// </remarks>
	/// <param name="identifier">Merchant identifier.</param>
	/// <param name="parentCompanyId">Optional partition discriminator.</param>
	/// <returns>The merchant or null.</returns>
	public Task<Merchant> ReadMerchantObject(Guid identifier, Guid? parentCompanyId = null);
	#endregion

	#region Read Merchant Objects API
	/// <summary>
	/// Enumerates all merchants under a partition (or across all when partition omitted).
	/// </summary>
	/// <remarks>
	/// <para><b>Pagination:</b> Not implemented; large sets could be expensive (backlog: add paging and continuation tokens).</para>
	/// <para><b>Filtering:</b> Soft-deleted entities SHOULD be excluded if soft delete introduced.</para>
	/// </remarks>
	/// <param name="parentCompanyId">Partition discriminator; null may imply cross-partition enumeration.</param>
	/// <returns>Enumerable (empty if none).</returns>
	public Task<IEnumerable<Merchant>> ReadAllMerchantObjects(Guid? parentCompanyId = null);
	#endregion

	#region Update Merchant Object API
	/// <summary>
	/// Replaces existing merchant state with provided aggregate.
	/// </summary>
	/// <remarks>
	/// <para><b>Preconditions:</b> Merchant MUST already exist; invariants re-validated for updated state.</para>
	/// <para><b>Concurrency:</b> No optimistic concurrency yet (backlog: ETag / version field).</para>
	/// </remarks>
	/// <param name="updatedMerchant">New merchant state.</param>
	/// <param name="merchantIdentifier">Identifier of merchant being updated.</param>
	/// <param name="parentCompanyId">Optional partition discriminator.</param>
	/// <returns>Updated merchant.</returns>
	public Task<Merchant> UpdateMerchantObject(Merchant updatedMerchant, Guid merchantIdentifier, Guid? parentCompanyId = null);
	#endregion

	#region Delete Merchant Object API
	/// <summary>
	/// Deletes (logical or physical) a merchant.
	/// </summary>
	/// <remarks>
	/// <para><b>Idempotency:</b> Repeated deletes yield same terminal state (absent / marked deleted).</para>
	/// <para><b>Referential Integrity:</b> This layer DOES NOT cascade / clean invoice references (belongs to orchestration / processing layers).</para>
	/// </remarks>
	/// <param name="identifier">Merchant identifier.</param>
	/// <param name="parentCompanyId">Optional partition discriminator.</param>
	/// <returns>Asynchronous task.</returns>
	public Task DeleteMerchantObject(Guid identifier, Guid? parentCompanyId = null);
	#endregion
}
