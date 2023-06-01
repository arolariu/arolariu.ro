using ContainerBackend.Domain.General.Services.KeyVault;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using System;
using System.IO;
using System.Threading.Tasks;

namespace ContainerBackend.Domain.Invoices.Endpoints
{
    /// <summary>
    /// The invoice endpoints.
    /// </summary>
    public static class InvoiceEndpoints
    {

        /// <summary>
        /// The map invoice endpoints static method, called by the app builder.
        /// </summary>
        /// <param name="router"></param>
        public static void MapInvoiceEndpoints(this IEndpointRouteBuilder router)
        {
            router.MapPost("/api/invoices", PostBlobToSqlDb)
                .WithName("PostBlobToSqlDb")
                .Produces<IResult>(StatusCodes.Status200OK)
                .WithOpenApi();

            router.MapGet("/api/invoices/{id}", RetrieveInvoiceAsync)
                .WithName("RetrieveInvoiceAsync")
                .Produces<IResult>(StatusCodes.Status200OK)
                .WithOpenApi();
        }


        private static async Task<IResult> PostBlobToSqlDb(HttpRequest request)
        {
            var stream = new MemoryStream();
            await request.Body.CopyToAsync(stream);
            var blob = stream.ToArray();
            return Results.Ok("Received blob of size: " + blob.Length);
        }

        private static async Task<IResult> RetrieveInvoiceAsync([FromRoute] Guid id, IKeyVaultService keyVaultService)
        {
            Task.Delay(1000);
            return Results.Ok("Received id: " + secret + "\n from Id: " + id);
        }
    }
}
