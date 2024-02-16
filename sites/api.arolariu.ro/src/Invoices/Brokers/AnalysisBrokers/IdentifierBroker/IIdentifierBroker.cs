using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Products;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;

using System.Collections.Generic;
using System.Threading.Tasks;

namespace arolariu.Backend.Domain.Invoices.Brokers.AnalysisBrokers.IdentifierBroker
{
    /// <summary>
    /// Interface for the receipt recognizer broker.
    /// This interface is used to recognize the merchant, payment information and products from an invoice photo.
    /// </summary>
    public interface IIdentifierBroker<in TPhoto>
        where TPhoto : class
    {
        /// <summary>
        /// Recognize the merchant from an invoice photo.
        /// </summary>
        /// <param name="photo"></param>
        /// <returns></returns>
        public Task<Merchant> IdentifyMerchant(TPhoto photo);

        /// <summary>
        /// Recognize the payment information from an invoice photo.
        /// </summary>
        /// <param name="photo"></param>
        /// <returns></returns>
        public Task<PaymentInformation> IdentifyPaymentInformation(TPhoto photo);

        /// <summary>
        /// Recognize the products from an invoice photo.
        /// </summary>
        /// <param name="photo"></param>
        /// <returns></returns>
        public Task<IEnumerable<Product>> IdentifyProducts(TPhoto photo);
    }
}
