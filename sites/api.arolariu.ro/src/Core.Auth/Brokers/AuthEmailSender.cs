namespace arolariu.Backend.Core.Auth.Brokers;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;

using arolariu.Backend.Common.Options;
using arolariu.Backend.Core.Auth.Models;

using MailKit.Net.Smtp;
using MailKit.Security;

using Microsoft.AspNetCore.Identity.UI.Services;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

using MimeKit;

/// <summary>
/// The email sender for the authentication module.
/// </summary>
/// 
[SuppressMessage("Performance", "CA1812:Avoid uninstantiated internal classes", Justification = "Instantiated by DI.")]
internal sealed class AuthEmailSender : IEmailSender
{
	private readonly ILogger _logger;
	private readonly AzureOptions _azureOptions;
	private readonly AuthOptions _authOptions;

	public AuthEmailSender(
		ILoggerFactory logger,
		IOptions<AzureOptions> azureOptions,
		IOptions<AuthOptions> authOptions)
	{
		_logger = logger.CreateLogger<AuthEmailSender>();
		_azureOptions = azureOptions.Value;
		_authOptions = authOptions.Value;
	}

	public async Task SendEmailAsync(string email, string subject, string htmlMessage)
	{
		_logger.LogPreparingEmail(email, subject);

		using var message = new MimeMessage();
		message.From.Add(new MailboxAddress("arolariu.ro", "admin@arolariu.ro"));
		message.To.Add(new MailboxAddress("Recipient", email));
		message.Subject = subject;
		message.Body = new TextPart("html") { Text = htmlMessage };

		using var client = new SmtpClient();
		var accessToken = await GetAccessTokenAsync().ConfigureAwait(false);
		var oauth2 = new SaslMechanismOAuth2("admin@arolariu.ro", accessToken.access_token);

		await client.ConnectAsync("smtp.office365.com", 587, SecureSocketOptions.Auto)
					.ConfigureAwait(false);

		await client.AuthenticateAsync(oauth2)
					.ConfigureAwait(false);

		await client.SendAsync(message)
					.ConfigureAwait(false);

		await client.DisconnectAsync(true)
					.ConfigureAwait(false);
	}


	private async Task<MailAccessToken> GetAccessTokenAsync()
	{
		var tenantId = _azureOptions.TenantId;
		var clientId = _authOptions.SmtpUserId;
		var clientSecret = _authOptions.SmtpUserPass;

		var url = new Uri($"https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token");

		var data = new Dictionary<string, string>
		{
			["grant_type"] = "client_credentials",
			["scope"] = "https://outlook.office365.com/.default",
			["client_id"] = clientId,
			["client_secret"] = clientSecret
		};

		using HttpClient client = new();
		using FormUrlEncodedContent formContent = new FormUrlEncodedContent(data);
		using HttpResponseMessage response = await client.PostAsync(url, formContent)
														.ConfigureAwait(false);

		var content = await response.Content.ReadAsStringAsync()
									.ConfigureAwait(false);

		return JsonSerializer.Deserialize<MailAccessToken>(content)!;
	}
}
