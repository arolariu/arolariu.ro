namespace arolariu.Backend.Domain.Tests.Invoices.Brokers;

using System;
using System.Net.Http;

using arolariu.Backend.Common.Options;
using arolariu.Backend.Domain.Invoices.Brokers.TranslatorBroker;

using Microsoft.Extensions.Options;

using Moq;

using Xunit;

/// <summary>
/// Test suite for AzureTranslatorBroker following "The Standard" test patterns.
/// Tests cover translation service integration, HTTP client exception handling, and configuration validation.
/// </summary>
public class AzureTranslatorBrokerBasicTests
{
	private readonly Mock<IOptionsMonitor<AzureOptions>> mockOptionsMonitor;
	private readonly Mock<HttpMessageHandler> mockHttpMessageHandler;
	private readonly AzureTranslatorBroker azureTranslatorBroker;
	private readonly AzureOptions azureOptions;
	private readonly HttpClient httpClient;

	public AzureTranslatorBrokerBasicTests()
	{
		azureOptions = new AzureOptions
		{
			CognitiveServicesKey = "test-cognitive-services-key",
			CognitiveServicesEndpoint = "https://api.cognitive.microsofttranslator.com/",
		};

		mockOptionsMonitor = new Mock<IOptionsMonitor<AzureOptions>>();
		mockOptionsMonitor.Setup(opt => opt.CurrentValue).Returns(azureOptions);

		mockHttpMessageHandler = new Mock<HttpMessageHandler>();
		httpClient = new HttpClient(mockHttpMessageHandler.Object);

		azureTranslatorBroker = new AzureTranslatorBroker(mockOptionsMonitor.Object, httpClient);
	}

	#region Constructor Tests

	[Fact]
	public void ShouldCreateAzureTranslatorBroker_WhenValidOptionsProvided()
	{
		// Given & When (constructor called in setup)

		// Then
		Assert.NotNull(azureTranslatorBroker);
		mockOptionsMonitor.Verify(opt => opt.CurrentValue, Times.AtLeastOnce);
	}

	[Fact]
	public void ShouldThrowArgumentNullException_WhenOptionsMonitorIsNull()
	{
		// Given
		IOptionsMonitor<AzureOptions>? nullOptionsMonitor = null;

		// When & Then
		Assert.Throws<ArgumentNullException>(() =>
			new AzureTranslatorBroker(nullOptionsMonitor!, httpClient));
	}

	[Fact]
	public void ShouldThrowArgumentNullException_WhenHttpClientIsNull()
	{
		// Given
		HttpClient? nullHttpClient = null;

		// When & Then
		Assert.Throws<ArgumentNullException>(() =>
			new AzureTranslatorBroker(mockOptionsMonitor.Object, nullHttpClient!));
	}

	#endregion
}
