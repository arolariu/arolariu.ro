namespace arolariu.Backend.Common.Azure;

using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading;
using System.Threading.Tasks;

using global::Azure.Core;

/// <summary>
/// DelegatingHandler that acquires a Bearer token from Azure Identity
/// and attaches it to outgoing HTTP requests.
/// </summary>
/// <param name="credential">The Azure token credential used to acquire tokens.</param>
/// <param name="scope">The scope to request when acquiring the token.</param>
public sealed class BearerTokenHandler(TokenCredential credential, string scope) : DelegatingHandler
{
  private readonly TokenRequestContext _tokenContext = new([scope]);

  /// <inheritdoc />
  protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
  {
    ArgumentNullException.ThrowIfNull(request);

    var token = await credential.GetTokenAsync(_tokenContext, cancellationToken).ConfigureAwait(false);
    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token.Token);
    return await base.SendAsync(request, cancellationToken).ConfigureAwait(false);
  }
}
