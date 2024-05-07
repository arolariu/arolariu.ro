namespace arolariu.Backend.Core.Auth.Brokers;

using System.Threading.Tasks;

using arolariu.Backend.Common.Options;

using Microsoft.AspNetCore.Identity.UI.Services;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

internal class AuthEmailSender : IEmailSender
{
	private readonly ILogger _logger;

	public AuthEmailSender(ILogger logger, IOptionsMonitor<AzureOptions> azureOptions)
	{
		_logger = logger;
		_azureOptions = azureOptions.CurrentValue;
	}

	public AuthEmailSender(ILogger logger)
	{
		_logger = logger;
	}

	public async Task SendEmailAsync(string email, string subject, string htmlMessage)
	{
		throw new System.NotImplementedException();
	}

	public async Task PrepareEmail(string email, string subject, string htmlMessage)
	{
		_logger.LogPreparingEmail(email, subject);
	}
}
