namespace arolariu.Backend.Domain.Invoices.Modules;

using arolariu.Backend.Domain.Invoices.Endpoints;

using Microsoft.AspNetCore.Builder;

/// <summary>
/// Extensions for the web application.
/// </summary>
public static class WebApplicationExtensions
{
  /// <summary>
  /// Extension method to add the invoice domain configuration.
  /// </summary>
  /// <param name="app"></param>
  public static void AddInvoiceDomainConfiguration(this WebApplication app) => app.MapInvoiceEndpoints();
}
