using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace arolariu.Backend.Domain.Invoices.Brokers.InvoiceAnalysisBroker
{
    public partial interface IAnalysisBroker
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
        /// <param name="invoice"></param>
        /// <returns></returns>
        public Task<IEnumerable<Recipe>> GeneratePossibleRecipes(Invoice invoice);

        /// <summary>
        /// This method will generate and populate the Invoice `PossibleSurvivalDays` property.
        /// </summary>
        /// <param name="invoice"></param>
        /// <returns></returns>
        public Task<int> GeneratePossibleSurvivalDays(Invoice invoice);
    }
}
