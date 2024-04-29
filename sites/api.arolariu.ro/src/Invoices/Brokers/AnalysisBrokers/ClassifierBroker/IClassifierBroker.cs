namespace arolariu.Backend.Domain.Invoices.Brokers.AnalysisBrokers.ClassifierBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Products;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;

using System.Collections.Generic;
using System.Threading.Tasks;

/// <summary>
/// The invoice analysis broker interface.
/// </summary>
public partial interface IClassifierBroker
{
	/// <summary>
	/// This method will generate and populate the Invoice `Description` property.
	/// </summary>
	/// <param name="invoice"></param>
	/// <returns></returns>
	public Task<string> GenerateInvoiceDescription(Invoice invoice);

	/// <summary>
	/// This method will generate and populate the Invoice `PossibleReceipts` property.
	/// </summary>
	/// <param name="products"></param>
	/// <returns></returns>
	public Task<IEnumerable<Recipe>> GeneratePossibleRecipes(IEnumerable<Product> products);

	/// <summary>
	/// This method will generate and populate the Invoice `PossibleSurvivalDays` property.
	/// </summary>
	/// <param name="products"></param>
	/// <returns></returns>
	public Task<int> GeneratePossibleSurvivalDays(IEnumerable<Product> products);

	/// <summary>
	/// This method will generate and populate the InvoiceItem `PossibleSurvivalDays` property.
	/// </summary>
	/// <param name="product"></param>
	/// <returns></returns>
	public Task<string> GenerateProductGenericName(Product product);

	/// <summary>
	/// This method will generate and populate the InvoiceItem `Category` property.
	/// </summary>
	/// <param name="product"></param>
	/// <returns></returns>
	public Task<ProductCategory> GenerateProductCategory(Product product);

	/// <summary>
	/// This method will generate and populate the Invoice `PossibleAllergens` property.
	/// </summary>
	/// <param name="product"></param>
	/// <returns></returns>
	public Task<IEnumerable<Allergen>> GeneratePossibleAllergens(Product product);
}
