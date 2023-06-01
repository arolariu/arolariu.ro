using System.Net.Http;
using System.Threading.Tasks;

namespace ContainerBackend.Domain.Invoices.Services
{
    /// <summary>
    /// Invoice reader service.
    /// </summary>
    public static class InvoiceReaderService
    {
        private const string endpoint = "https://localhost:5001/api/invoices";

        /// <summary>
        /// Send invoice for analysis.
        /// </summary>
        /// <param name="blob"></param>
        /// <returns></returns>
        public static async Task<string> SendInvoiceForAnalysis(byte[] blob)
        {
            using var client = new HttpClient();
            var content = new ByteArrayContent(blob);
            var response = await client.PostAsync(endpoint, content);
            var responseContent = await response.Content.ReadAsStringAsync();
            return responseContent;
        }
    }
}
