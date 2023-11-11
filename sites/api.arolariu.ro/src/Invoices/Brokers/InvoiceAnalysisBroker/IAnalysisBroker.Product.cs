using arolariu.Backend.Domain.Invoices.DDD.Entities.Products;
using System.Collections.Generic;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;

using System.Threading.Tasks;

namespace arolariu.Backend.Domain.Invoices.Brokers.InvoiceAnalysisBroker
{
    internal partial interface IAnalysisBroker
    {
        /// <summary>
        /// This method will generate and populate the InvoiceItem `PossibleSurvivalDays` property.
        /// </summary>
        /// <param name="itemName"></param>
        /// <returns></returns>
        public Task<string> GenerateItemGenericName(string itemName);

        /// <summary>
        /// This method will generate and populate the InvoiceItem `Category` property.
        /// </summary>
        /// <param name="itemName"></param>
        /// <returns></returns>
        public Task<ProductCategory> GenerateItemCategory(string itemName);

        /// <summary>
        /// This method will generate and populate the Invoice `PossibleAllergens` property.
        /// </summary>
        /// <param name="product"></param>
        /// <returns></returns>
        public Task<IEnumerable<Allergen>> GeneratePossibleAllergens(Product product);
    }
}
