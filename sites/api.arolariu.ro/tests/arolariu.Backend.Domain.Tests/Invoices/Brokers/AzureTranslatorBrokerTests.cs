namespace arolariu.Backend.Domain.Tests.Invoices.Brokers;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Common.Options;
using arolariu.Backend.Domain.Invoices.Brokers.TranslatorBroker;

using Microsoft.Extensions.Options;

using Moq;
using Moq.Protected;

using Xunit;

public class AzureTranslatorBrokerTests
{
	private readonly Mock<IOptionsMonitor<AzureOptions>> mockOptionsMonitor;
	private readonly Mock<HttpMessageHandler> mockHttpMessageHandler;
	private readonly AzureTranslatorBroker azureTranslatorBroker;
	private readonly AzureOptions azureOptions;
	private readonly HttpClient httpClient; // HttpClient that would use the mocked handler

	public AzureTranslatorBrokerTests()
	{
		azureOptions = new AzureOptions
		{
			CognitiveServicesKey = "test-key",
			CognitiveServicesEndpoint = "https://api.cognitive.microsofttranslator.com/",
		};

		mockOptionsMonitor = new Mock<IOptionsMonitor<AzureOptions>>();
		mockOptionsMonitor.Setup(opt => opt.CurrentValue).Returns(azureOptions);

		mockHttpMessageHandler = new Mock<HttpMessageHandler>();
		httpClient = new HttpClient(mockHttpMessageHandler.Object);

		azureTranslatorBroker = new AzureTranslatorBroker(mockOptionsMonitor.Object, httpClient);
		Console.WriteLine(azureTranslatorBroker.ToString());
	}
}
