namespace arolariu.Backend.Domain.Tests.Integration;

using System;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;

using arolariu.Backend.Common.Http;

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

using Xunit;

/// <summary>
/// Integration-style tests asserting that the ASP.NET Core pipeline wiring of
/// <see cref="ExceptionMappingHandler"/> (via <c>AddExceptionHandler</c> + <c>AddProblemDetails</c>
/// at composition, and <c>UseExceptionHandler()</c> as the first middleware) produces
/// RFC 7807 ProblemDetails responses for exceptions that escape endpoint handlers —
/// including pre-handler faults such as malformed JSON model binding.
/// </summary>
/// <remarks>
/// <para>
/// <b>Why not <c>WebApplicationFactory&lt;Program&gt;</c>?</b> The production <c>Program.cs</c>
/// boots Azure Key Vault, Cosmos DB, SQL Server, and Application Insights during startup,
/// none of which are available in unit/CI environments. This fixture constructs a minimal
/// <see cref="WebApplication"/> that mirrors just the exception-handler wiring from
/// <c>WebApplicationBuilderExtensions</c> / <c>WebApplicationExtensions</c>, plus a single
/// JSON-accepting endpoint, so the test verifies the middleware contract without dragging
/// in infrastructure dependencies.
/// </para>
/// <para>
/// <b>What this guards:</b> Regressions where the pipeline wiring is accidentally removed
/// or reordered (e.g., <c>UseExceptionHandler</c> moved after model binding / auth), which
/// would let binding faults bubble up as framework plain-text responses rather than the
/// standardised ProblemDetails contract.
/// </para>
/// </remarks>
public sealed class ExceptionHandlerPipelineTests
{
  /// <summary>
  /// Builds a minimal in-test <see cref="WebApplication"/> that registers
  /// <see cref="ExceptionMappingHandler"/> through <c>AddExceptionHandler</c>, enables
  /// <c>AddProblemDetails</c>, installs <c>UseExceptionHandler()</c> as the first middleware,
  /// and maps a single JSON-bound POST endpoint at <c>/rest/v1/invoices</c>. The app is hosted
  /// in-memory via <see cref="TestServer"/> so the returned <see cref="HttpClient"/> exercises
  /// the real middleware pipeline without Kestrel or infrastructure services.
  /// </summary>
  /// <returns>
  /// Tuple of the running <see cref="IHost"/> (the caller disposes it) and an
  /// <see cref="HttpClient"/> bound to the <see cref="TestServer"/>.
  /// </returns>
  private static async Task<(IHost Host, HttpClient Client)> CreateTestHostAsync()
  {
    var builder = WebApplication.CreateBuilder();
    builder.WebHost.UseTestServer();

    // Mirror the production wiring for the exception-handler pipeline — see
    // WebApplicationBuilderExtensions.AddGeneralDomainConfiguration.
    builder.Services.AddExceptionHandler<ExceptionMappingHandler>();
    builder.Services.AddProblemDetails();

    // Force Minimal API body-binding failures (malformed JSON) to throw
    // BadHttpRequestException instead of writing a silent 400 — this is what causes
    // the exception to escape into the middleware pipeline and hit UseExceptionHandler.
    // Production code sees the equivalent behaviour because it throws from the
    // invoice processing services; here we route the pre-handler fault through the
    // same door to exercise the exact handler path.
    builder.Services.Configure<Microsoft.AspNetCore.Routing.RouteHandlerOptions>(
      opts => opts.ThrowOnBadRequest = true);

    var app = builder.Build();

    // UseExceptionHandler must be the first middleware — mirrors WebApplicationExtensions.
    app.UseExceptionHandler();

    // A minimal JSON-bound endpoint that exercises model binding. Malformed JSON throws
    // a BadHttpRequestException during binding; the exception escapes into the pipeline,
    // UseExceptionHandler routes it through ExceptionMappingHandler, and a ProblemDetails
    // response is written back instead of a framework-default plain-text body.
    app.MapPost("/rest/v1/invoices", (Payload _) => Results.Ok());

    await app.StartAsync().ConfigureAwait(false);

    var client = app.GetTestClient();
    return (app, client);
  }

  /// <summary>
  /// Minimal body record so the endpoint requires JSON model binding; the shape does not
  /// matter because the test sends an intentionally malformed body and asserts the pre-handler
  /// error path. The type is instantiated reflectively by the JSON model binder, so the
  /// analyzer's "never instantiated" heuristic is a false positive here.
  /// </summary>
  [System.Diagnostics.CodeAnalysis.SuppressMessage(
    "Performance",
    "CA1812:Avoid uninstantiated internal classes",
    Justification = "Instantiated reflectively by the ASP.NET Core JSON model binder.")]
  private sealed record Payload(string Name);

  /// <summary>
  /// Verifies that a malformed JSON body posted to a JSON-bound endpoint produces an
  /// RFC 7807 ProblemDetails response (content-type <c>application/problem+json</c>),
  /// not a framework plain-text fallback. This is the belt-and-suspenders contract the
  /// pipeline wiring exists to guarantee — endpoint try/catch blocks cannot see these
  /// faults because they occur before the handler runs.
  /// </summary>
  [Fact]
  public async Task MalformedJsonBody_ReturnsProblemDetails_NotPlainText()
  {
    // Arrange
    var (host, client) = await CreateTestHostAsync().ConfigureAwait(false);
    using (host)
    using (client)
    {
      using var malformed = new StringContent("{ invalid json", System.Text.Encoding.UTF8, "application/json");

      // Act
      using var response = await client.PostAsync(new Uri("/rest/v1/invoices", UriKind.Relative), malformed).ConfigureAwait(false);
      var body = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
      var contentTypeString = response.Content.Headers.ContentType?.ToString() ?? "(null)";

      // Primary contract: ProblemDetails content-type (tolerate charset suffix).
      Assert.Contains(
        "application/problem+json",
        contentTypeString,
        StringComparison.Ordinal);

      // Sanity — the body should be a JSON document (RFC 7807 shape), not plain text.
      Assert.StartsWith("{", body.TrimStart(), StringComparison.Ordinal);

      // Prove the custom ExceptionMappingHandler (not the framework fallback) actually ran
      // by asserting the body contains our custom ProblemTypeUris domain, which the default
      // IProblemDetailsService does not emit.
      Assert.Contains("api.arolariu.ro/problems", body, StringComparison.Ordinal);

      Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
  }
}
