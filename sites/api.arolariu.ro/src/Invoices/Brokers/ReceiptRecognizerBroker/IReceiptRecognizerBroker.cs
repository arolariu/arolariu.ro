using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Products;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using Microsoft.AspNetCore.Http;

using System.Collections;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace arolariu.Backend.Domain.Invoices.Brokers.ReceiptRecognizerBroker
{
    internal interface IReceiptRecognizerBroker
    {
        /// <summary>
        /// Recognize the products from an invoice photo.
        /// </summary>
        /// <typeparam name="T"></typeparam>
        /// <param name="photoContent"></param>
        /// <returns></returns>
        public Task<IEnumerable<Product>> RecognizeProductsAsync<T>(T photoContent);

        /// <summary>
        /// Recognize the merchant from an invoice photo.
        /// </summary>
        /// <param name="photoContent"></param>
        /// <returns></returns>
        public Task<Merchant> RecognizeMerchantAsync<T>(T photoContent);

        /// <summary>
        /// Recognize the currency from an invoice photo.
        /// </summary>
        /// <param name="photoContent"></param>
        /// <returns></returns>
        public Task<Currency> RecognizeCurrencyAsync<T>(T photoContent);

        /// <summary>
        /// Recognize the payment information from an invoice photo.
        /// </summary>
        /// <param name="photoContent"></param>
        /// <returns></returns>
        public Task<PaymentInformation> RecognizePaymentInformationAsync<T>(T photoContent);
    }
}
