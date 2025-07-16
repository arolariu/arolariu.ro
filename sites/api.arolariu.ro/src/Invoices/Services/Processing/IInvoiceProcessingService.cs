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
	/// <summary>
	/// Analyze an invoice.
	/// </summary>
	/// <param name="identifier"></param>
	/// <param name="options"></param>
	/// <returns></returns>
	public Task AnalyzeInvoice(Guid identifier, AnalysisOptions options);

	/// <summary>
	/// Analyze an invoice.
	/// </summary>
	/// <param name="identifier"></param>
	/// <param name="userIdentifier"></param>
	/// <param name="options"></param>
	/// <returns></returns>
	public Task AnalyzeInvoice(Guid identifier, Guid userIdentifier, AnalysisOptions options);

	/// <summary>
	/// Analyze an invoice.
	/// </summary>
	/// <param name="invoice"></param>
	/// <param name="options"></param>
	/// <returns></returns>
	public Task AnalyzeInvoice(Invoice invoice, AnalysisOptions options);

	/// <summary>
	/// Creates an invoice object.
	/// </summary>
	/// <param name="invoice"></param>
	/// <returns></returns>
	public Task<Invoice> CreateInvoice(Invoice invoice);

	/// <summary>
	/// Reads an invoice object, given only its identifier.
	/// </summary>
	/// <param name="identifier"></param>
	/// <returns></returns>
	public Task<Invoice> ReadInvoice(Guid identifier);

	/// <summary>
	/// Reads an invoice object, given its identifier and the user identifier.
	/// </summary>
	/// <param name="identifier"></param>
	/// <param name="userIdentifier"></param>
	/// <returns></returns>
	public Task<Invoice> ReadInvoice(Guid identifier, Guid userIdentifier);

	/// <summary>
	/// Reads all invoice objects, regardless of the user identifier.
	/// This method should be called by superusers only.
	/// </summary>
	/// <returns></returns>
	public Task<IEnumerable<Invoice>> ReadInvoices();

	/// <summary>
	/// Reads all invoice objects, given the user identifier (partition key).
	/// </summary>
	/// <param name="userIdentifier"></param>
	/// <returns></returns>
	public Task<IEnumerable<Invoice>> ReadInvoices(Guid userIdentifier);

	/// <summary>
	/// Updates an invoice object, given only its identifier.
	/// </summary>
	/// <param name="invoiceIdentifier"></param>
	/// <param name="updatedInvoice"></param>
	/// <returns></returns>
	public Task<Invoice> UpdateInvoice(Guid invoiceIdentifier, Invoice updatedInvoice);

	/// <summary>
	/// Deletes an invoice object, given only its identifier.
	/// This method should be called by superusers only.
	/// </summary>
	/// <param name="identifier"></param>
	/// <returns></returns>
	public Task DeleteInvoice(Guid identifier);

	/// <summary>
	/// Deletes an invoice object, given its identifier and the user identifier.
	/// </summary>
	/// <param name="identifier"></param>
	/// <param name="userIdentifier"></param>
	/// <returns></returns>
	public Task DeleteInvoice(Guid identifier, Guid userIdentifier);

	/// <summary>
	/// Adds a product to an invoice.
	/// </summary>
	/// <param name="invoiceIdentifier"></param>
	/// <param name="product"></param>
	/// <returns></returns>
	public Task<Invoice> AddProduct(Guid invoiceIdentifier, Product product);

	/// <summary>
	/// Adds a product to an invoice.
	/// </summary>
	/// <param name="invoice"></param>
	/// <param name="product"></param>
	/// <returns></returns>
	public Task<Invoice> AddProduct(Invoice invoice, Product product);

	/// <summary>
	/// Gets the products from an invoice.
	/// </summary>
	/// <param name="invoiceIdentifier"></param>
	/// <returns></returns>
	public Task<IEnumerable<Product>> GetProducts(Guid invoiceIdentifier);

	/// <summary>
	/// Gets the products from an invoice.
	/// </summary>
	/// <param name="invoiceIdentifier"></param>
	/// <param name="userIdentifier"></param>
	/// <returns></returns>
	public Task<IEnumerable<Product>> GetProducts(Guid invoiceIdentifier, Guid userIdentifier);

	/// <summary>
	/// Gets the products from an invoice.
	/// </summary>
	/// <param name="invoice"></param>
	/// <returns></returns>
	public Task<IEnumerable<Product>> GetProducts(Invoice invoice);

	/// <summary>
	/// Gets the products from an invoice.
	/// </summary>
	/// <param name="invoiceIdentifier"></param>
	/// <param name="productName"></param>
	/// <returns></returns>
	public Task<Product> GetProduct(Guid invoiceIdentifier, string productName);

	/// <summary>
	/// Gets a product from an invoice.
	/// </summary>
	/// <param name="invoice"></param>
	/// <param name="productName"></param>
	/// <returns></returns>
	public Task<Product> GetProduct(Invoice invoice, string productName);

	/// <summary>
	/// Deletes a product.
	/// </summary>
	/// <param name="invoiceIdentifier"></param>
	/// <param name="productName"></param>
	/// <returns></returns>
	public Task<Invoice> DeleteProduct(Guid invoiceIdentifier, string productName);

	/// <summary>
	/// Deletes a product.
	/// </summary>
	/// <param name="invoiceIdentifier"></param>
	/// <param name="product"></param>
	/// <returns></returns>
	public Task<Invoice> DeleteProduct(Guid invoiceIdentifier, Product product);

	/// <summary>
	/// Deletes a product.
	/// </summary>
	/// <param name="invoice"></param>
	/// <param name="product"></param>
	/// <returns></returns>
	public Task<Invoice> DeleteProduct(Invoice invoice, Product product);

	/// <summary>
	/// Deletes a product.
	/// </summary>
	/// <param name="invoice"></param>
	/// <param name="productName"></param>
	/// <returns></returns>
	public Task<Invoice> DeleteProduct(Invoice invoice, string productName);
	#endregion

	#region Merchant Orchestration Service
	/// <summary>
	/// Creates a merchant object.
	/// </summary>
	/// <param name="merchant"></param>
	/// <returns></returns>
	public Task<Merchant> CreateMerchant(Merchant merchant);

	/// <summary>
	/// Reads a merchant object, given only its identifier.
	/// </summary>
	/// <param name="identifier"></param>
	/// <returns></returns>
	public Task<Merchant> ReadMerchant(Guid identifier);

	/// <summary>
	/// Reads a merchant object, given its identifier and the parent company identifier.
	/// </summary>
	/// <param name="identifier"></param>
	/// <param name="parentCompanyId"></param>
	/// <returns></returns>
	public Task<Merchant> ReadMerchant(Guid identifier, Guid parentCompanyId);

	/// <summary>
	/// Reads all merchant objects, regardless of the parent company identifier.
	/// This method should be called by superusers only.
	/// </summary>
	/// <returns></returns>
	public Task<IEnumerable<Merchant>> ReadMerchants();

	/// <summary>
	/// Reads all merchant objects.
	/// </summary>
	/// <param name="parentCompanyId"></param>
	/// <returns></returns>
	public Task<IEnumerable<Merchant>> ReadMerchants(Guid parentCompanyId);

	/// <summary>
	/// Updates a merchant object.
	/// </summary>
	/// <param name="identifier"></param>
	/// <param name="updatedMerchant"></param>
	/// <returns></returns>
	public Task<Merchant> UpdateMerchant(Guid identifier, Merchant updatedMerchant);

	/// <summary>
	/// Deletes a merchant object, given only its identifier.
	/// This method should be called by superusers only.
	/// </summary>
	/// <param name="identifier"></param>
	/// <returns></returns>
	public Task DeleteMerchant(Guid identifier);

	/// <summary>
	/// Deletes a merchant object.
	/// </summary>
	/// <param name="identifier"></param>
	/// <param name="parentCompanyId"></param>
	/// <returns></returns>
	public Task DeleteMerchant(Guid identifier, Guid parentCompanyId);
	#endregion
}
