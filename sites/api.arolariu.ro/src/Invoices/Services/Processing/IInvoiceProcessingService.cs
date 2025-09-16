namespace arolariu.Backend.Domain.Invoices.Services.Processing;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DTOs;

/// <summary>
/// This interface represents the invoice processing service.
/// </summary>
public interface IInvoiceProcessingService
{
	#region Invoice Orchestration Service

	#region Analyze Invoice API
	/// <summary>
	/// Analyze an invoice.
	/// </summary>
	/// <param name="options"></param>
	/// <param name="identifier"></param>
	/// <param name="userIdentifier"></param>
	/// <returns></returns>
	public Task AnalyzeInvoice(AnalysisOptions options, Guid identifier, Guid? userIdentifier = null);
	#endregion

	#region Create Invoice API
	/// <summary>
	/// Creates an invoice object, given the user identifier (partition key).
	/// </summary>
	/// <param name="invoice"></param>
	/// <param name="userIdentifier"></param>
	/// <returns></returns>
	public Task CreateInvoice(Invoice invoice, Guid? userIdentifier = null);
	#endregion

	#region Read Invoice API
	/// <summary>
	/// Reads an invoice object, given its identifier and the user identifier.
	/// </summary>
	/// <param name="identifier"></param>
	/// <param name="userIdentifier"></param>
	/// <returns></returns>
	public Task<Invoice> ReadInvoice(Guid identifier, Guid? userIdentifier = null);
	#endregion

	#region Read Invoices API
	/// <summary>
	/// Reads all invoice objects, given the user identifier (partition key).
	/// </summary>
	/// <param name="userIdentifier"></param>
	/// <returns></returns>
	public Task<IEnumerable<Invoice>> ReadInvoices(Guid? userIdentifier = null);
	#endregion

	#region Update Invoice API
	/// <summary>
	/// Updates an invoice object, given its identifier and the user identifier.
	/// </summary>
	/// <param name="updatedInvoice"></param>
	/// <param name="invoiceIdentifier"></param>
	/// <param name="userIdentifier"></param>
	/// <returns></returns>
	public Task<Invoice> UpdateInvoice(Invoice updatedInvoice, Guid invoiceIdentifier, Guid? userIdentifier = null);
	#endregion

	#region Delete Invoice API
	/// <summary>
	/// Deletes an invoice object, given its identifier and the user identifier.
	/// </summary>
	/// <param name="identifier"></param>
	/// <param name="userIdentifier"></param>
	/// <returns></returns>
	public Task DeleteInvoice(Guid identifier, Guid? userIdentifier = null);
	#endregion

	#region Delete Invoices API
	/// <summary>
	/// Deletes all invoices for a given user.
	/// </summary>
	/// <param name="userIdentifier"></param>
	/// <returns></returns>
	public Task DeleteInvoices(Guid userIdentifier);
	#endregion

	#region Add Invoice Product API
	/// <summary>
	/// Adds a product to an invoice.
	/// </summary>
	/// <param name="product"></param>
	/// <param name="invoiceIdentifier"></param>
	/// <param name="userIdentifier"></param>
	/// <returns></returns>
	public Task AddProduct(Product product, Guid invoiceIdentifier, Guid? userIdentifier = null);
	#endregion

	#region Get Invoice Products API
	/// <summary>
	/// Gets the products from an invoice.
	/// </summary>
	/// <param name="invoiceIdentifier"></param>
	/// <param name="userIdentifier"></param>
	/// <returns></returns>
	public Task<IEnumerable<Product>> GetProducts(Guid invoiceIdentifier, Guid? userIdentifier = null);
	#endregion

	#region Get Invoice Product API
	/// <summary>
	/// Gets the products from an invoice.
	/// </summary>
	/// <param name="productName"></param>
	/// <param name="invoiceIdentifier"></param>
	/// <param name="userIdentifier"></param>
	/// <returns></returns>
	public Task<Product> GetProduct(string productName, Guid invoiceIdentifier, Guid? userIdentifier = null);
	#endregion

	#region Delete Invoice Product API
	/// <summary>
	/// Deletes a product.
	/// </summary>
	/// <param name="productName"></param>
	/// <param name="invoiceIdentifier"></param>
	/// <param name="userIdentifier"></param>
	/// <returns></returns>
	public Task DeleteProduct(string productName, Guid invoiceIdentifier, Guid? userIdentifier = null);

	/// <summary>
	/// Deletes a product.
	/// </summary>
	/// <param name="product"></param>
	/// <param name="invoiceIdentifier"></param>
	/// <param name="userIdentifier"></param>
	/// <returns></returns>
	public Task DeleteProduct(Product product, Guid invoiceIdentifier, Guid? userIdentifier = null);
	#endregion

	#region Create Invoice Scan API
	/// <summary>
	/// Creates a scan for an invoice.
	/// </summary>
	/// <param name="scan"></param>
	/// <param name="invoiceIdentifier"></param>
	/// <param name="userIdentifier"></param>
	/// <returns></returns>
	public Task CreateInvoiceScan(InvoiceScan scan, Guid invoiceIdentifier, Guid? userIdentifier = null);
	#endregion

	#region Read Invoice Scan API
	/// <summary>
	/// Reads the scan data for an invoice.
	/// </summary>
	/// <param name="invoiceIdentifier"></param>
	/// <param name="userIdentifier"></param>
	/// <returns></returns>
	public Task<InvoiceScan> ReadInvoiceScan(Guid invoiceIdentifier, Guid? userIdentifier = null);
	#endregion

	#region Update Invoice Scan API
	/// <summary>
	/// Updates the scan data for an invoice.
	/// </summary>
	/// <param name="scan"></param>
	/// <param name="invoiceIdentifier"></param>
	/// <param name="userIdentifier"></param>
	/// <returns></returns>
	public Task<InvoiceScan> UpdateInvoiceScan(InvoiceScan scan, Guid invoiceIdentifier, Guid? userIdentifier = null);
	#endregion

	#region Delete Invoice Scan API
	/// <summary>
	/// Deletes the scan data for an invoice.
	/// </summary>
	/// <param name="invoiceIdentifier"></param>
	/// <param name="userIdentifier"></param>
	/// <returns></returns>
	public Task DeleteInvoiceScan(Guid invoiceIdentifier, Guid? userIdentifier = null);
	#endregion

	#region Create Invoice Metadata API
	/// <summary>
	/// Adds a metadata entry to an invoice.
	/// </summary>
	/// <param name="metadata"></param>
	/// <param name="invoiceIdentifier"></param>
	/// <param name="userIdentifier"></param>
	/// <returns></returns>
	public Task AddMetadataToInvoice(IDictionary<string, object> metadata, Guid invoiceIdentifier, Guid? userIdentifier = null);
	#endregion

	#region Update Invoice Metadata API
	/// <summary>
	/// Updates metadata entries on an invoice. If a key does not exist, it will be created.
	/// </summary>
	/// <param name="metadata"></param>
	/// <param name="invoiceIdentifier"></param>
	/// <param name="userIdentifier"></param>
	/// <returns></returns>
	public Task<IDictionary<string, object>> UpdateMetadataOnInvoice(IDictionary<string, object> metadata, Guid invoiceIdentifier, Guid? userIdentifier = null);
	#endregion

	#region Get Invoice Metadata API
	/// <summary>
	/// Gets all metadata entries from an invoice.
	/// </summary>
	/// <param name="invoiceIdentifier"></param>
	/// <param name="userIdentifier"></param>
	/// <returns></returns>
	public Task<IDictionary<string, object>> GetMetadataFromInvoice(Guid invoiceIdentifier, Guid? userIdentifier = null);
	#endregion

	#region Delete Invoice Metadata API
	/// <summary>
	/// Deletes metadata entries from an invoice, given their keys.
	/// </summary>
	/// <param name="metadataKeys"></param>
	/// <param name="invoiceIdentifier"></param>
	/// <param name="userIdentifier"></param>
	/// <returns></returns>
	public Task DeleteMetadataFromInvoice(IEnumerable<string> metadataKeys, Guid invoiceIdentifier, Guid? userIdentifier = null);
	#endregion

	#endregion

	#region Merchant Orchestration Service

	#region Create Merchant API
	/// <summary>
	/// Creates a merchant object.
	/// </summary>
	/// <param name="merchant"></param>
	/// <param name="parentCompanyId"></param>
	/// <returns></returns>
	public Task CreateMerchant(Merchant merchant, Guid? parentCompanyId = null);
	#endregion

	#region Read Merchant API
	/// <summary>
	/// Reads a merchant object, given its identifier and the parent company identifier.
	/// </summary>
	/// <param name="identifier"></param>
	/// <param name="parentCompanyId"></param>
	/// <returns></returns>
	public Task<Merchant> ReadMerchant(Guid identifier, Guid? parentCompanyId = null);
	#endregion

	#region Read Merchants API
	/// <summary>
	/// Reads all merchant objects.
	/// </summary>
	/// <param name="parentCompanyId"></param>
	/// <returns></returns>
	public Task<IEnumerable<Merchant>> ReadMerchants(Guid? parentCompanyId = null);
	#endregion

	#region Update Merchant API
	/// <summary>
	/// Updates a merchant object.
	/// </summary>
	/// <param name="identifier"></param>
	/// <param name="parentCompanyId"></param>
	/// <param name="updatedMerchant"></param>
	/// <returns></returns>
	public Task<Merchant> UpdateMerchant(Merchant updatedMerchant, Guid identifier, Guid? parentCompanyId = null);
	#endregion

	#region Delete Merchant API
	/// <summary>
	/// Deletes a merchant object.
	/// </summary>
	/// <param name="identifier"></param>
	/// <param name="parentCompanyId"></param>
	/// <returns></returns>
	public Task DeleteMerchant(Guid identifier, Guid? parentCompanyId = null);
	#endregion

	#endregion
}
