namespace arolariu.Backend.Domain.Tests.Invoices.DDD.Exceptions;

using System;

using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Outer.Orchestration;

using Xunit;

/// <summary>
/// Comprehensive unit tests for all Merchant exception classes.
/// Tests validate all constructors, serialization, and inheritance.
/// Method naming follows MethodName_Condition_ExpectedResult pattern per repository standards.
/// </summary>
public sealed class MerchantExceptionTests
{
  #region MerchantIdNotSetException Tests

  /// <summary>
  /// Verifies default constructor creates instance.
  /// </summary>
  [Fact]
  public void MerchantIdNotSetException_DefaultConstructor_CreatesInstance()
  {
    // Act
    var exception = new MerchantIdNotSetException();

    // Assert
    Assert.NotNull(exception);
    Assert.IsType<MerchantIdNotSetException>(exception);
    Assert.IsAssignableFrom<Exception>(exception);
  }

  /// <summary>
  /// Verifies constructor with inner exception sets message and inner exception.
  /// </summary>
  [Fact]
  public void MerchantIdNotSetException_InnerExceptionConstructor_SetsPropertiesCorrectly()
  {
    // Arrange
    var innerException = new InvalidOperationException("Inner error");

    // Act
    var exception = new MerchantIdNotSetException(innerException);

    // Assert
    Assert.NotNull(exception);
    Assert.Equal("Merchant identifier not set Exception", exception.Message);
    Assert.Same(innerException, exception.InnerException);
  }

  /// <summary>
  /// Verifies constructor with null inner exception works.
  /// </summary>
  [Fact]
  public void MerchantIdNotSetException_NullInnerException_CreatesInstance()
  {
    // Act
    var exception = new MerchantIdNotSetException(null!);

    // Assert
    Assert.NotNull(exception);
    Assert.Null(exception.InnerException);
  }

  #endregion

  #region MerchantParentCompanyIdNotSetException Tests

  /// <summary>
  /// Verifies default constructor creates instance.
  /// </summary>
  [Fact]
  public void MerchantParentCompanyIdNotSetException_DefaultConstructor_CreatesInstance()
  {
    // Act
    var exception = new MerchantParentCompanyIdNotSetException();

    // Assert
    Assert.NotNull(exception);
    Assert.IsType<MerchantParentCompanyIdNotSetException>(exception);
  }

  /// <summary>
  /// Verifies constructor with inner exception sets properties correctly.
  /// </summary>
  [Fact]
  public void MerchantParentCompanyIdNotSetException_InnerExceptionConstructor_SetsPropertiesCorrectly()
  {
    // Arrange
    var innerException = new InvalidOperationException("Inner error");

    // Act
    var exception = new MerchantParentCompanyIdNotSetException(innerException);

    // Assert
    Assert.NotNull(exception);
    Assert.Equal("Merchant parent company identifier not set Exception", exception.Message);
    Assert.Same(innerException, exception.InnerException);
  }

  #endregion

  #region MerchantFoundationServiceValidationException Tests

  /// <summary>
  /// Verifies default constructor creates instance.
  /// </summary>
  [Fact]
  public void MerchantFoundationServiceValidationException_DefaultConstructor_CreatesInstance()
  {
    // Act
    var exception = new MerchantFoundationServiceValidationException();

    // Assert
    Assert.NotNull(exception);
    Assert.IsType<MerchantFoundationServiceValidationException>(exception);
  }

  /// <summary>
  /// Verifies constructor with inner exception sets properties correctly.
  /// </summary>
  [Fact]
  public void MerchantFoundationServiceValidationException_InnerExceptionConstructor_SetsPropertiesCorrectly()
  {
    // Arrange
    var innerException = new MerchantIdNotSetException();

    // Act
    var exception = new MerchantFoundationServiceValidationException(innerException);

    // Assert
    Assert.NotNull(exception);
    Assert.Equal("Merchant Foundation Service Validation Exception", exception.Message);
    Assert.Same(innerException, exception.InnerException);
  }

  /// <summary>
  /// Verifies constructor with nested inner exceptions preserves exception chain.
  /// </summary>
  [Fact]
  public void MerchantFoundationServiceValidationException_NestedInnerExceptions_PreservesExceptionChain()
  {
    // Arrange
    var rootCause = new ArgumentException("Root cause");
    var innerException = new MerchantIdNotSetException(rootCause);

    // Act
    var exception = new MerchantFoundationServiceValidationException(innerException);

    // Assert
    Assert.NotNull(exception.InnerException);
    Assert.NotNull(exception.InnerException.InnerException);
    Assert.IsType<ArgumentException>(exception.InnerException.InnerException);
  }

  #endregion

  #region MerchantFoundationServiceDependencyException Tests

  /// <summary>
  /// Verifies default constructor creates instance.
  /// </summary>
  [Fact]
  public void MerchantFoundationServiceDependencyException_DefaultConstructor_CreatesInstance()
  {
    // Act
    var exception = new MerchantFoundationServiceDependencyException();

    // Assert
    Assert.NotNull(exception);
    Assert.IsType<MerchantFoundationServiceDependencyException>(exception);
  }

  /// <summary>
  /// Verifies constructor with inner exception sets properties correctly.
  /// </summary>
  [Fact]
  public void MerchantFoundationServiceDependencyException_InnerExceptionConstructor_SetsPropertiesCorrectly()
  {
    // Arrange
    var innerException = new InvalidOperationException("Database error");

    // Act
    var exception = new MerchantFoundationServiceDependencyException(innerException);

    // Assert
    Assert.NotNull(exception);
    Assert.Equal("Merchant Foundation Service Dependency Exception", exception.Message);
    Assert.Same(innerException, exception.InnerException);
  }

  #endregion

  #region MerchantFoundationServiceDependencyValidationException Tests

  /// <summary>
  /// Verifies default constructor creates instance.
  /// </summary>
  [Fact]
  public void MerchantFoundationServiceDependencyValidationException_DefaultConstructor_CreatesInstance()
  {
    // Act
    var exception = new MerchantFoundationServiceDependencyValidationException();

    // Assert
    Assert.NotNull(exception);
    Assert.IsType<MerchantFoundationServiceDependencyValidationException>(exception);
  }

  /// <summary>
  /// Verifies constructor with inner exception sets properties correctly.
  /// </summary>
  [Fact]
  public void MerchantFoundationServiceDependencyValidationException_InnerExceptionConstructor_SetsPropertiesCorrectly()
  {
    // Arrange
    var innerException = new ArgumentNullException("parameter");

    // Act
    var exception = new MerchantFoundationServiceDependencyValidationException(innerException);

    // Assert
    Assert.NotNull(exception);
    Assert.Equal("Merchant Foundation Service Dependency Validation Exception", exception.Message);
    Assert.Same(innerException, exception.InnerException);
  }

  #endregion

  #region MerchantFoundationServiceException Tests

  /// <summary>
  /// Verifies default constructor creates instance.
  /// </summary>
  [Fact]
  public void MerchantFoundationServiceException_DefaultConstructor_CreatesInstance()
  {
    // Act
    var exception = new MerchantFoundationServiceException();

    // Assert
    Assert.NotNull(exception);
    Assert.IsType<MerchantFoundationServiceException>(exception);
  }

  /// <summary>
  /// Verifies constructor with inner exception sets properties correctly.
  /// </summary>
  [Fact]
  public void MerchantFoundationServiceException_InnerExceptionConstructor_SetsPropertiesCorrectly()
  {
    // Arrange
    var innerException = new InvalidOperationException("Service error");

    // Act
    var exception = new MerchantFoundationServiceException(innerException);

    // Assert
    Assert.NotNull(exception);
    Assert.Equal("Merchant Foundation Service Exception", exception.Message);
    Assert.Same(innerException, exception.InnerException);
  }

  #endregion

  #region MerchantOrchestrationServiceValidationException Tests

  /// <summary>
  /// Verifies default constructor creates instance.
  /// </summary>
  [Fact]
  public void MerchantOrchestrationServiceValidationException_DefaultConstructor_CreatesInstance()
  {
    // Act
    var exception = new MerchantOrchestrationServiceValidationException();

    // Assert
    Assert.NotNull(exception);
    Assert.IsType<MerchantOrchestrationServiceValidationException>(exception);
  }

  /// <summary>
  /// Verifies constructor with inner exception sets properties correctly.
  /// </summary>
  [Fact]
  public void MerchantOrchestrationServiceValidationException_InnerExceptionConstructor_SetsPropertiesCorrectly()
  {
    // Arrange
    var innerException = new MerchantFoundationServiceValidationException();

    // Act
    var exception = new MerchantOrchestrationServiceValidationException(innerException);

    // Assert
    Assert.NotNull(exception);
    Assert.Equal("Merchant Orchestration Service Validation Exception", exception.Message);
    Assert.Same(innerException, exception.InnerException);
  }

  #endregion

  #region MerchantOrchestrationServiceDependencyException Tests

  /// <summary>
  /// Verifies default constructor creates instance.
  /// </summary>
  [Fact]
  public void MerchantOrchestrationServiceDependencyException_DefaultConstructor_CreatesInstance()
  {
    // Act
    var exception = new MerchantOrchestrationServiceDependencyException();

    // Assert
    Assert.NotNull(exception);
    Assert.IsType<MerchantOrchestrationServiceDependencyException>(exception);
  }

  /// <summary>
  /// Verifies constructor with inner exception sets properties correctly.
  /// </summary>
  [Fact]
  public void MerchantOrchestrationServiceDependencyException_InnerExceptionConstructor_SetsPropertiesCorrectly()
  {
    // Arrange
    var innerException = new MerchantFoundationServiceDependencyException();

    // Act
    var exception = new MerchantOrchestrationServiceDependencyException(innerException);

    // Assert
    Assert.NotNull(exception);
    Assert.Equal("Merchant Orchestration Service Dependency Exception", exception.Message);
    Assert.Same(innerException, exception.InnerException);
  }

  #endregion

  #region MerchantOrchestrationServiceDependencyValidationException Tests

  /// <summary>
  /// Verifies default constructor creates instance.
  /// </summary>
  [Fact]
  public void MerchantOrchestrationServiceDependencyValidationException_DefaultConstructor_CreatesInstance()
  {
    // Act
    var exception = new MerchantOrchestrationServiceDependencyValidationException();

    // Assert
    Assert.NotNull(exception);
    Assert.IsType<MerchantOrchestrationServiceDependencyValidationException>(exception);
  }

  /// <summary>
  /// Verifies constructor with inner exception sets properties correctly.
  /// </summary>
  [Fact]
  public void MerchantOrchestrationServiceDependencyValidationException_InnerExceptionConstructor_SetsPropertiesCorrectly()
  {
    // Arrange
    var innerException = new MerchantFoundationServiceDependencyValidationException();

    // Act
    var exception = new MerchantOrchestrationServiceDependencyValidationException(innerException);

    // Assert
    Assert.NotNull(exception);
    Assert.Equal("Merchant Orchestration Service Dependency Validation Exception", exception.Message);
    Assert.Same(innerException, exception.InnerException);
  }

  #endregion

  #region MerchantOrchestrationServiceException Tests

  /// <summary>
  /// Verifies default constructor creates instance.
  /// </summary>
  [Fact]
  public void MerchantOrchestrationServiceException_DefaultConstructor_CreatesInstance()
  {
    // Act
    var exception = new MerchantOrchestrationServiceException();

    // Assert
    Assert.NotNull(exception);
    Assert.IsType<MerchantOrchestrationServiceException>(exception);
  }

  /// <summary>
  /// Verifies constructor with inner exception sets properties correctly.
  /// </summary>
  [Fact]
  public void MerchantOrchestrationServiceException_InnerExceptionConstructor_SetsPropertiesCorrectly()
  {
    // Arrange
    var innerException = new MerchantFoundationServiceException();

    // Act
    var exception = new MerchantOrchestrationServiceException(innerException);

    // Assert
    Assert.NotNull(exception);
    Assert.Equal("Merchant Orchestration Service Exception", exception.Message);
    Assert.Same(innerException, exception.InnerException);
  }

  #endregion

  #region Exception Hierarchy Tests

  /// <summary>
  /// Verifies all inner exceptions inherit from Exception base class.
  /// </summary>
  [Theory]
  [InlineData(typeof(MerchantIdNotSetException))]
  [InlineData(typeof(MerchantParentCompanyIdNotSetException))]
  public void InnerExceptions_InheritFromException_TypeVerification(Type exceptionType)
  {
    // Assert
    Assert.True(typeof(Exception).IsAssignableFrom(exceptionType));
  }

  /// <summary>
  /// Verifies all foundation exceptions inherit from Exception base class.
  /// </summary>
  [Theory]
  [InlineData(typeof(MerchantFoundationServiceValidationException))]
  [InlineData(typeof(MerchantFoundationServiceDependencyException))]
  [InlineData(typeof(MerchantFoundationServiceDependencyValidationException))]
  [InlineData(typeof(MerchantFoundationServiceException))]
  public void FoundationExceptions_InheritFromException_TypeVerification(Type exceptionType)
  {
    // Assert
    Assert.True(typeof(Exception).IsAssignableFrom(exceptionType));
  }

  /// <summary>
  /// Verifies all orchestration exceptions inherit from Exception base class.
  /// </summary>
  [Theory]
  [InlineData(typeof(MerchantOrchestrationServiceValidationException))]
  [InlineData(typeof(MerchantOrchestrationServiceDependencyException))]
  [InlineData(typeof(MerchantOrchestrationServiceDependencyValidationException))]
  [InlineData(typeof(MerchantOrchestrationServiceException))]
  public void OrchestrationExceptions_InheritFromException_TypeVerification(Type exceptionType)
  {
    // Assert
    Assert.True(typeof(Exception).IsAssignableFrom(exceptionType));
  }

  /// <summary>
  /// Verifies all merchant exceptions have the Serializable attribute.
  /// </summary>
  [Theory]
  [InlineData(typeof(MerchantIdNotSetException))]
  [InlineData(typeof(MerchantParentCompanyIdNotSetException))]
  [InlineData(typeof(MerchantFoundationServiceValidationException))]
  [InlineData(typeof(MerchantFoundationServiceDependencyException))]
  [InlineData(typeof(MerchantFoundationServiceDependencyValidationException))]
  [InlineData(typeof(MerchantFoundationServiceException))]
  [InlineData(typeof(MerchantOrchestrationServiceValidationException))]
  [InlineData(typeof(MerchantOrchestrationServiceDependencyException))]
  [InlineData(typeof(MerchantOrchestrationServiceDependencyValidationException))]
  [InlineData(typeof(MerchantOrchestrationServiceException))]
  public void AllExceptions_HaveSerializableAttribute_AttributeVerification(Type exceptionType)
  {
    // Assert
    Assert.True(Attribute.IsDefined(exceptionType, typeof(SerializableAttribute)));
  }

  #endregion

  #region Exception Chaining Tests

  /// <summary>
  /// Verifies full exception chain from Orchestration to Foundation layers.
  /// </summary>
  [Fact]
  public void ExceptionChain_OrchestrationToFoundation_PreservesFullChain()
  {
    // Arrange
    var rootCause = new ArgumentException("Invalid argument");
    var innerException = new MerchantIdNotSetException(rootCause);
    var foundationException = new MerchantFoundationServiceValidationException(innerException);

    // Act
    var orchestrationException = new MerchantOrchestrationServiceValidationException(foundationException);

    // Assert
    Assert.NotNull(orchestrationException.InnerException);
    Assert.IsType<MerchantFoundationServiceValidationException>(orchestrationException.InnerException);

    var foundation = orchestrationException.InnerException;
    Assert.NotNull(foundation.InnerException);
    Assert.IsType<MerchantIdNotSetException>(foundation.InnerException);

    var inner = foundation.InnerException;
    Assert.NotNull(inner.InnerException);
    Assert.IsType<ArgumentException>(inner.InnerException);
  }

  /// <summary>
  /// Verifies dependency exception chain preservation.
  /// </summary>
  [Fact]
  public void DependencyExceptionChain_OrchestrationToFoundation_PreservesFullChain()
  {
    // Arrange
    var dbException = new InvalidOperationException("Database connection failed");
    var foundationException = new MerchantFoundationServiceDependencyException(dbException);

    // Act
    var orchestrationException = new MerchantOrchestrationServiceDependencyException(foundationException);

    // Assert
    Assert.NotNull(orchestrationException.InnerException);
    Assert.IsType<MerchantFoundationServiceDependencyException>(orchestrationException.InnerException);

    var foundation = orchestrationException.InnerException;
    Assert.NotNull(foundation.InnerException);
    Assert.IsType<InvalidOperationException>(foundation.InnerException);
  }

  #endregion
}
