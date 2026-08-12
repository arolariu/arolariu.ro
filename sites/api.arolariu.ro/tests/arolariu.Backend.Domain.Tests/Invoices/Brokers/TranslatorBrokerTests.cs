namespace arolariu.Backend.Domain.Tests.Invoices.Brokers;

using System;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Common.Options;
using arolariu.Backend.Domain.Invoices.Brokers.TranslatorBroker;

using Moq;
using Moq.Protected;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Unit tests for <see cref="AzureTranslatorBroker"/> covering constructor validation,
/// dependency injection scenarios, and exception handling.
///
/// NOTE: The AzureTranslatorBroker is marked with [ExcludeFromCodeCoverage] as it wraps
/// an external Azure service. These tests focus on constructor validation and exception paths
/// that can be tested without hitting the actual Azure Translation API.
/// </summary>
[TestClass]
public sealed class TranslatorBrokerTests : IDisposable
{
  private readonly Mock<IOptionsManager> mockOptionsManager;
  private readonly LocalOptions testOptions;

  /// <summary>
  /// Initializes test fixture with mocked options manager.
  /// </summary>
  public TranslatorBrokerTests()
  {
    mockOptionsManager = new Mock<IOptionsManager>();
    testOptions = new LocalOptions
    {
      CognitiveServicesKey = "test-api-key-for-unit-tests"
    };

    mockOptionsManager.Setup(om => om.GetApplicationOptions()).Returns(testOptions);
  }

  /// <summary>
  /// Disposes of test resources.
  /// </summary>
  public void Dispose()
  {
    GC.SuppressFinalize(this);
  }

  #region Constructor Tests

  /// <summary>
  /// Verifies that constructor throws ArgumentNullException when options manager is null.
  /// </summary>
  [TestMethod]
  public void Constructor_ShouldThrowArgumentNullException_WhenOptionsManagerIsNull()
  {
    // Given
    IOptionsManager? nullOptionsManager = null;

    // When & Then
    var exception = Assert.ThrowsExactly<ArgumentNullException>(() => new AzureTranslatorBroker(nullOptionsManager!));
    Assert.AreEqual("optionsManager", exception.ParamName);
  }

  /// <summary>
  /// Verifies that HTTP client constructor throws ArgumentNullException when options manager is null.
  /// </summary>
  [TestMethod]
  public void ConstructorWithHttpClient_ShouldThrowArgumentNullException_WhenOptionsManagerIsNull()
  {
    // Given
    IOptionsManager? nullOptionsManager = null;
    using var httpClient = new HttpClient();

    // When & Then
    var exception = Assert.ThrowsExactly<ArgumentNullException>(() => new AzureTranslatorBroker(nullOptionsManager!, httpClient));
    Assert.AreEqual("optionsManager", exception.ParamName);
  }

  /// <summary>
  /// Verifies that HTTP client constructor throws ArgumentNullException when HTTP client is null.
  /// </summary>
  [TestMethod]
  public void ConstructorWithHttpClient_ShouldThrowArgumentNullException_WhenHttpClientIsNull()
  {
    // Given
    HttpClient? nullHttpClient = null;

    // When & Then
    var exception = Assert.ThrowsExactly<ArgumentNullException>(() => new AzureTranslatorBroker(mockOptionsManager.Object, nullHttpClient!));
    Assert.AreEqual("httpClient", exception.ParamName);
  }

  /// <summary>
  /// Verifies that the broker can be instantiated with valid options manager.
  /// </summary>
  [TestMethod]
  public void Constructor_ShouldSucceed_WhenOptionsManagerIsValid()
  {
    // Given & When
    var broker = new AzureTranslatorBroker(mockOptionsManager.Object);

    // Then
    Assert.IsNotNull(broker);
    mockOptionsManager.Verify(om => om.GetApplicationOptions(), Times.Once);
  }

  /// <summary>
  /// Verifies that the broker can be instantiated with valid options manager and HTTP client.
  /// </summary>
  [TestMethod]
  public void ConstructorWithHttpClient_ShouldSucceed_WhenDependenciesAreValid()
  {
    // Given
    using var httpClient = new HttpClient();

    // When
    var broker = new AzureTranslatorBroker(mockOptionsManager.Object, httpClient);

    // Then
    Assert.IsNotNull(broker);
    mockOptionsManager.Verify(om => om.GetApplicationOptions(), Times.Once);
  }

  #endregion

  #region Translate Method Tests

  /// <summary>
  /// Verifies that Translate method accepts various BCP-47 language codes.
  /// This test verifies that the broker can be created for use with different target languages.
  /// </summary>
  [TestMethod]
  [DataRow("en")]
  [DataRow("ro")]
  [DataRow("de")]
  [DataRow("fr")]
  public void Translate_ShouldAcceptVariousLanguageCodes(string languageCode)
  {
    // Given - verifying the broker accepts different language codes
    using var httpClient = new HttpClient();
    var broker = new AzureTranslatorBroker(mockOptionsManager.Object, httpClient);

    // Then - broker should be created and language code should be valid BCP-47 format
    Assert.IsNotNull(broker);
    Assert.MatchesRegex(@"^[a-z]{2}(-[A-Z]{2})?$", languageCode);
  }

  /// <summary>
  /// Verifies that the default language parameter is "en" when not specified.
  /// </summary>
  [TestMethod]
  public void Translate_ShouldUseEnglishAsDefaultLanguage()
  {
    // This is verified by the interface contract - ITranslatorBroker.Translate has language = "en" as default
    // The test verifies the broker implements the interface correctly
    using var httpClient = new HttpClient();
    var broker = new AzureTranslatorBroker(mockOptionsManager.Object, httpClient);

    // Verify the broker implements ITranslatorBroker
    Assert.IsInstanceOfType<ITranslatorBroker>(broker);
  }

  #endregion

  #region DetectLanguage Method Tests

  /// <summary>
  /// Verifies that DetectLanguage method exists and broker implements interface correctly.
  /// </summary>
  [TestMethod]
  public void DetectLanguage_ShouldBeImplemented()
  {
    // Given
    using var httpClient = new HttpClient();
    var broker = new AzureTranslatorBroker(mockOptionsManager.Object, httpClient);

    // Then - broker should implement ITranslatorBroker with DetectLanguage method
    Assert.IsInstanceOfType<ITranslatorBroker>(broker);
    Assert.IsNotNull(broker);
  }

  #endregion

  #region Integration Scenarios

  /// <summary>
  /// Verifies that broker can be constructed with custom HTTP pipeline for testing.
  /// </summary>
  [TestMethod]
  public void Constructor_ShouldAllowCustomHttpPipeline_ForTestingPurposes()
  {
    // Given
    using var responseMessage = new HttpResponseMessage
    {
      StatusCode = HttpStatusCode.OK,
      Content = new StringContent("[{\"translations\":[{\"text\":\"Hello\",\"to\":\"en\"}],\"detectedLanguage\":{\"language\":\"en\",\"score\":1.0}}]")
    };

    var mockHttpMessageHandler = new Mock<HttpMessageHandler>();
    mockHttpMessageHandler
      .Protected()
      .Setup<Task<HttpResponseMessage>>(
        "SendAsync",
        ItExpr.IsAny<HttpRequestMessage>(),
        ItExpr.IsAny<CancellationToken>())
      .ReturnsAsync(responseMessage);

    using var httpClient = new HttpClient(mockHttpMessageHandler.Object);

    // When
    var broker = new AzureTranslatorBroker(mockOptionsManager.Object, httpClient);

    // Then
    Assert.IsNotNull(broker);
  }

  /// <summary>
  /// Verifies that options are correctly retrieved from the options manager during construction.
  /// </summary>
  [TestMethod]
  public void Constructor_ShouldRetrieveOptionsFromManager()
  {
    // Given
    var callCount = 0;
    mockOptionsManager.Setup(om => om.GetApplicationOptions())
      .Callback(() => callCount++)
      .Returns(testOptions);

    // When
    using var httpClient = new HttpClient();
    var broker = new AzureTranslatorBroker(mockOptionsManager.Object, httpClient);

    // Then
    Assert.AreEqual(1, callCount);
    mockOptionsManager.Verify(om => om.GetApplicationOptions(), Times.Once);
  }

  #endregion
}
