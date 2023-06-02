using Azure;
using Azure.AI.FormRecognizer.DocumentAnalysis;
using ContainerBackend.Domain.General.Services.KeyVault;
using ContainerBackend.Domain.Invoices.DTOs;
using Microsoft.Azure.CognitiveServices.Vision.ComputerVision;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;

namespace ContainerBackend.Domain.Invoices.Services.InvoiceReader
{
    /// <summary>
    /// Invoice reader service.
    /// </summary>
    public class InvoiceReaderService : IInvoiceReaderService
    {
        private readonly DocumentAnalysisClient client;

        /// <summary>
        /// Constructor.
        /// </summary>
        /// <param name="keyVaultService"></param>
        public InvoiceReaderService(IKeyVaultService keyVaultService)
        {
            var endpoint = new Uri(keyVaultService.GetSecret("arolariu-cognitive-services-endpoint"));
            var credentials = new AzureKeyCredential(keyVaultService.GetSecret("arolariu-cognitive-services-connString"));
            this.client = new DocumentAnalysisClient(endpoint, credentials);
        }

        /// <inheritdoc/>
        public async Task<IReadOnlyList<DocumentTable>> SendInvoiceForAnalysis(Uri invoiceBlobUri)
        {
            AnalyzeDocumentOperation operation = await client.AnalyzeDocumentFromUriAsync(WaitUntil.Completed, "prebuilt-document", invoiceBlobUri);
            AnalyzeResult result = operation.Value;
            return result.Tables;
        }
    }
}
