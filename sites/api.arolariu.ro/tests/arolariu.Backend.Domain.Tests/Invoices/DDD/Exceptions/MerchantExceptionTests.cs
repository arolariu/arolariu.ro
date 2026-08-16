namespace arolariu.Backend.Domain.Tests.Invoices.DDD.Exceptions;

using System;

using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Outer.Orchestration;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Comprehensive unit tests for all Merchant exception classes.
/// Tests validate all constructors, serialization, and inheritance.
/// Method naming follows MethodName_Condition_ExpectedResult pattern per repository standards.
/// </summary>
[TestClass]
public sealed class MerchantExceptionTests
{
  #region MerchantIdNotSetException Tests

  /// <summary>
  /// Verifies default constructor creates instance.
  /// </summary>
  [TestMethod]
  public void MerchantIdNotSetException_DefaultConstructor_CreatesInstance()
  {
    // Act
    var exception = new MerchantIdNotSetException();

    // Assert
    Assert.IsNotNull(exception);
    Assert.IsExactInstanceOfType<MerchantIdNotSetException>(exception);
    Assert.IsInstanceOfType<Exception>(exception);
  }

  /// <summary>
  /// Verifies constructor with inner exception sets message and inner exception.
  /// </summary>
  [TestMethod]
  public void MerchantIdNotSetException_InnerExceptionConstructor_SetsPropertiesCorrectly()
  {
    // Arrange
    var innerException = new InvalidOperationException("Inner error");

    // Act
    var exception = new MerchantIdNotSetException(innerException);

    // Assert
    Assert.IsNotNull(exception);
    Assert.AreEqual("Merchant identifier not set Exception", exception.Message);
    Assert.AreSame(innerException, exception.InnerException);
  }

  /// <summary>
  /// Verifies constructor with null inner exception works.
  /// </summary>
  [TestMethod]
  public void MerchantIdNotSetException_NullInnerException_CreatesInstance()
  {
    // Act
    var exception = new MerchantIdNotSetException(null!);

    // Assert
    Assert.IsNotNull(exception);
    Assert.IsNull(exception.InnerException);
  }

  #endregion

  #region MerchantParentCompanyIdNotSetException Tests

  /// <summary>
  /// Verifies default constructor creates instance.
  /// </summary>
  [TestMethod]
  public void MerchantParentCompanyIdNotSetException_DefaultConstructor_CreatesInstance()
  {
    // Act
    var exception = new MerchantParentCompanyIdNotSetException();

    // Assert
    Assert.IsNotNull(exception);
    Assert.IsExactInstanceOfType<MerchantParentCompanyIdNotSetException>(exception);
  }

  /// <summary>
  /// Verifies constructor with inner exception sets properties correctly.
  /// </summary>
  [TestMethod]
  public void MerchantParentCompanyIdNotSetException_InnerExceptionConstructor_SetsPropertiesCorrectly()
  {
    // Arrange
    var innerException = new InvalidOperationException("Inner error");

    // Act
    var exception = new MerchantParentCompanyIdNotSetException(innerException);

    // Assert
    Assert.IsNotNull(exception);
    Assert.AreEqual("Merchant parent company identifier not set Exception", exception.Message);
    Assert.AreSame(innerException, exception.InnerException);
  }

  #endregion

  #region MerchantFoundationServiceValidationException Tests

  /// <summary>
  /// Verifies default constructor creates instance.
  /// </summary>
  [TestMethod]
  public void MerchantFoundationServiceValidationException_DefaultConstructor_CreatesInstance()
  {
    // Act
    var exception = new MerchantFoundationServiceValidationException();

    // Assert
    Assert.IsNotNull(exception);
    Assert.IsExactInstanceOfType<MerchantFoundationServiceValidationException>(exception);
  }

  /// <summary>
  /// Verifies constructor with inner exception sets properties correctly.
  /// </summary>
  [TestMethod]
  public void MerchantFoundationServiceValidationException_InnerExceptionConstructor_SetsPropertiesCorrectly()
  {
    // Arrange
    var innerException = new MerchantIdNotSetException();

    // Act
    var exception = new MerchantFoundationServiceValidationException(innerException);

    // Assert
    Assert.IsNotNull(exception);
    Assert.AreEqual("Merchant Foundation Service Validation Exception", exception.Message);
    Assert.AreSame(innerException, exception.InnerException);
  }

  /// <summary>
  /// Verifies constructor with nested inner exceptions preserves exception chain.
  /// </summary>
  [TestMethod]
  public void MerchantFoundationServiceValidationException_NestedInnerExceptions_PreservesExceptionChain()
  {
    // Arrange
    var rootCause = new ArgumentException("Root cause");
    var innerException = new MerchantIdNotSetException(rootCause);

    // Act
    var exception = new MerchantFoundationServiceValidationException(innerException);

    // Assert
    Assert.IsNotNull(exception.InnerException);
    Assert.IsNotNull(exception.InnerException.InnerException);
    Assert.IsExactInstanceOfType<ArgumentException>(exception.InnerException.InnerException);
  }

  #endregion

  #region MerchantFoundationServiceDependencyException Tests

  /// <summary>
  /// Verifies default constructor creates instance.
  /// </summary>
  [TestMethod]
  public void MerchantFoundationServiceDependencyException_DefaultConstructor_CreatesInstance()
  {
    // Act
    var exception = new MerchantFoundationServiceDependencyException();

    // Assert
    Assert.IsNotNull(exception);
    Assert.IsExactInstanceOfType<MerchantFoundationServiceDependencyException>(exception);
  }

  /// <summary>
  /// Verifies constructor with inner exception sets properties correctly.
  /// </summary>
  [TestMethod]
  public void MerchantFoundationServiceDependencyException_InnerExceptionConstructor_SetsPropertiesCorrectly()
  {
    // Arrange
    var innerException = new InvalidOperationException("Database error");

    // Act
    var exception = new MerchantFoundationServiceDependencyException(innerException);

    // Assert
    Assert.IsNotNull(exception);
    Assert.AreEqual("Merchant Foundation Service Dependency Exception", exception.Message);
    Assert.AreSame(innerException, exception.InnerException);
  }

  #endregion

  #region MerchantFoundationServiceDependencyValidationException Tests

  /// <summary>
  /// Verifies default constructor creates instance.
  /// </summary>
  [TestMethod]
  public void MerchantFoundationServiceDependencyValidationException_DefaultConstructor_CreatesInstance()
  {
    // Act
    var exception = new MerchantFoundationServiceDependencyValidationException();

    // Assert
    Assert.IsNotNull(exception);
    Assert.IsExactInstanceOfType<MerchantFoundationServiceDependencyValidationException>(exception);
  }

  /// <summary>
  /// Verifies constructor with inner exception sets properties correctly.
  /// </summary>
  [TestMethod]
  public void MerchantFoundationServiceDependencyValidationException_InnerExceptionConstructor_SetsPropertiesCorrectly()
  {
    // Arrange
    var innerException = new ArgumentNullException("parameter");

    // Act
    var exception = new MerchantFoundationServiceDependencyValidationException(innerException);

    // Assert
    Assert.IsNotNull(exception);
    Assert.AreEqual("Merchant Foundation Service Dependency Validation Exception", exception.Message);
    Assert.AreSame(innerException, exception.InnerException);
  }

  #endregion

  #region MerchantFoundationServiceException Tests

  /// <summary>
  /// Verifies default constructor creates instance.
  /// </summary>
  [TestMethod]
  public void MerchantFoundationServiceException_DefaultConstructor_CreatesInstance()
  {
    // Act
    var exception = new MerchantFoundationServiceException();

    // Assert
    Assert.IsNotNull(exception);
    Assert.IsExactInstanceOfType<MerchantFoundationServiceException>(exception);
  }

  /// <summary>
  /// Verifies constructor with inner exception sets properties correctly.
  /// </summary>
  [TestMethod]
  public void MerchantFoundationServiceException_InnerExceptionConstructor_SetsPropertiesCorrectly()
  {
    // Arrange
    var innerException = new InvalidOperationException("Service error");

    // Act
    var exception = new MerchantFoundationServiceException(innerException);

    // Assert
    Assert.IsNotNull(exception);
    Assert.AreEqual("Merchant Foundation Service Exception", exception.Message);
    Assert.AreSame(innerException, exception.InnerException);
  }

  #endregion

  #region MerchantOrchestrationServiceValidationException Tests

  /// <summary>
  /// Verifies default constructor creates instance.
  /// </summary>
  [TestMethod]
  public void MerchantOrchestrationServiceValidationException_DefaultConstructor_CreatesInstance()
  {
    // Act
    var exception = new MerchantOrchestrationServiceValidationException();

    // Assert
    Assert.IsNotNull(exception);
    Assert.IsExactInstanceOfType<MerchantOrchestrationServiceValidationException>(exception);
  }

  /// <summary>
  /// Verifies constructor with inner exception sets properties correctly.
  /// </summary>
  [TestMethod]
  public void MerchantOrchestrationServiceValidationException_InnerExceptionConstructor_SetsPropertiesCorrectly()
  {
    // Arrange
    var innerException = new MerchantFoundationServiceValidationException();

    // Act
    var exception = new MerchantOrchestrationServiceValidationException(innerException);

    // Assert
    Assert.IsNotNull(exception);
    Assert.AreEqual("Merchant Orchestration Service Validation Exception", exception.Message);
    Assert.AreSame(innerException, exception.InnerException);
  }

  #endregion

  #region MerchantOrchestrationServiceDependencyException Tests

  /// <summary>
  /// Verifies default constructor creates instance.
  /// </summary>
  [TestMethod]
  public void MerchantOrchestrationServiceDependencyException_DefaultConstructor_CreatesInstance()
  {
    // Act
    var exception = new MerchantOrchestrationServiceDependencyException();

    // Assert
    Assert.IsNotNull(exception);
    Assert.IsExactInstanceOfType<MerchantOrchestrationServiceDependencyException>(exception);
  }

  /// <summary>
  /// Verifies constructor with inner exception sets properties correctly.
  /// </summary>
  [TestMethod]
  public void MerchantOrchestrationServiceDependencyException_InnerExceptionConstructor_SetsPropertiesCorrectly()
  {
    // Arrange
    var innerException = new MerchantFoundationServiceDependencyException();

    // Act
    var exception = new MerchantOrchestrationServiceDependencyException(innerException);

    // Assert
    Assert.IsNotNull(exception);
    Assert.AreEqual("Merchant Orchestration Service Dependency Exception", exception.Message);
    Assert.AreSame(innerException, exception.InnerException);
  }

  #endregion

  #region MerchantOrchestrationServiceDependencyValidationException Tests

  /// <summary>
  /// Verifies default constructor creates instance.
  /// </summary>
  [TestMethod]
  public void MerchantOrchestrationServiceDependencyValidationException_DefaultConstructor_CreatesInstance()
  {
    // Act
    var exception = new MerchantOrchestrationServiceDependencyValidationException();

    // Assert
    Assert.IsNotNull(exception);
    Assert.IsExactInstanceOfType<MerchantOrchestrationServiceDependencyValidationException>(exception);
  }

  /// <summary>
  /// Verifies constructor with inner exception sets properties correctly.
  /// </summary>
  [TestMethod]
  public void MerchantOrchestrationServiceDependencyValidationException_InnerExceptionConstructor_SetsPropertiesCorrectly()
  {
    // Arrange
    var innerException = new MerchantFoundationServiceDependencyValidationException();

    // Act
    var exception = new MerchantOrchestrationServiceDependencyValidationException(innerException);

    // Assert
    Assert.IsNotNull(exception);
    Assert.AreEqual("Merchant Orchestration Service Dependency Validation Exception", exception.Message);
    Assert.AreSame(innerException, exception.InnerException);
  }

  #endregion

  #region MerchantOrchestrationServiceException Tests

  /// <summary>
  /// Verifies default constructor creates instance.
  /// </summary>
  [TestMethod]
  public void MerchantOrchestrationServiceException_DefaultConstructor_CreatesInstance()
  {
    // Act
    var exception = new MerchantOrchestrationServiceException();

    // Assert
    Assert.IsNotNull(exception);
    Assert.IsExactInstanceOfType<MerchantOrchestrationServiceException>(exception);
  }

  /// <summary>
  /// Verifies constructor with inner exception sets properties correctly.
  /// </summary>
  [TestMethod]
  public void MerchantOrchestrationServiceException_InnerExceptionConstructor_SetsPropertiesCorrectly()
  {
    // Arrange
    var innerException = new MerchantFoundationServiceException();

    // Act
    var exception = new MerchantOrchestrationServiceException(innerException);

    // Assert
    Assert.IsNotNull(exception);
    Assert.AreEqual("Merchant Orchestration Service Exception", exception.Message);
    Assert.AreSame(innerException, exception.InnerException);
  }

  #endregion

  #region Exception Hierarchy Tests

  /// <summary>
  /// Verifies all inner exceptions inherit from Exception base class.
  /// </summary>
  [TestMethod]
  [DataRow(typeof(MerchantIdNotSetException))]
  [DataRow(typeof(MerchantParentCompanyIdNotSetException))]
  public void InnerExceptions_InheritFromException_TypeVerification(Type exceptionType)
  {
    // Assert
    Assert.IsTrue(typeof(Exception).IsAssignableFrom(exceptionType));
  }

  /// <summary>
  /// Verifies all foundation exceptions inherit from Exception base class.
  /// </summary>
  [TestMethod]
  [DataRow(typeof(MerchantFoundationServiceValidationException))]
  [DataRow(typeof(MerchantFoundationServiceDependencyException))]
  [DataRow(typeof(MerchantFoundationServiceDependencyValidationException))]
  [DataRow(typeof(MerchantFoundationServiceException))]
  public void FoundationExceptions_InheritFromException_TypeVerification(Type exceptionType)
  {
    // Assert
    Assert.IsTrue(typeof(Exception).IsAssignableFrom(exceptionType));
  }

  /// <summary>
  /// Verifies all orchestration exceptions inherit from Exception base class.
  /// </summary>
  [TestMethod]
  [DataRow(typeof(MerchantOrchestrationServiceValidationException))]
  [DataRow(typeof(MerchantOrchestrationServiceDependencyException))]
  [DataRow(typeof(MerchantOrchestrationServiceDependencyValidationException))]
  [DataRow(typeof(MerchantOrchestrationServiceException))]
  public void OrchestrationExceptions_InheritFromException_TypeVerification(Type exceptionType)
  {
    // Assert
    Assert.IsTrue(typeof(Exception).IsAssignableFrom(exceptionType));
  }

  /// <summary>
  /// Verifies all merchant exceptions have the Serializable attribute.
  /// </summary>
  [TestMethod]
  [DataRow(typeof(MerchantIdNotSetException))]
  [DataRow(typeof(MerchantParentCompanyIdNotSetException))]
  [DataRow(typeof(MerchantFoundationServiceValidationException))]
  [DataRow(typeof(MerchantFoundationServiceDependencyException))]
  [DataRow(typeof(MerchantFoundationServiceDependencyValidationException))]
  [DataRow(typeof(MerchantFoundationServiceException))]
  [DataRow(typeof(MerchantOrchestrationServiceValidationException))]
  [DataRow(typeof(MerchantOrchestrationServiceDependencyException))]
  [DataRow(typeof(MerchantOrchestrationServiceDependencyValidationException))]
  [DataRow(typeof(MerchantOrchestrationServiceException))]
  public void AllExceptions_HaveSerializableAttribute_AttributeVerification(Type exceptionType)
  {
    // Assert
    Assert.IsTrue(Attribute.IsDefined(exceptionType, typeof(SerializableAttribute)));
  }

  #endregion

  #region Exception Chaining Tests

  /// <summary>
  /// Verifies full exception chain from Orchestration to Foundation layers.
  /// </summary>
  [TestMethod]
  public void ExceptionChain_OrchestrationToFoundation_PreservesFullChain()
  {
    // Arrange
    var rootCause = new ArgumentException("Invalid argument");
    var innerException = new MerchantIdNotSetException(rootCause);
    var foundationException = new MerchantFoundationServiceValidationException(innerException);

    // Act
    var orchestrationException = new MerchantOrchestrationServiceValidationException(foundationException);

    // Assert
    Assert.IsNotNull(orchestrationException.InnerException);
    Assert.IsExactInstanceOfType<MerchantFoundationServiceValidationException>(orchestrationException.InnerException);

    var foundation = orchestrationException.InnerException;
    Assert.IsNotNull(foundation.InnerException);
    Assert.IsExactInstanceOfType<MerchantIdNotSetException>(foundation.InnerException);

    var inner = foundation.InnerException;
    Assert.IsNotNull(inner.InnerException);
    Assert.IsExactInstanceOfType<ArgumentException>(inner.InnerException);
  }

  /// <summary>
  /// Verifies dependency exception chain preservation.
  /// </summary>
  [TestMethod]
  public void DependencyExceptionChain_OrchestrationToFoundation_PreservesFullChain()
  {
    // Arrange
    var dbException = new InvalidOperationException("Database connection failed");
    var foundationException = new MerchantFoundationServiceDependencyException(dbException);

    // Act
    var orchestrationException = new MerchantOrchestrationServiceDependencyException(foundationException);

    // Assert
    Assert.IsNotNull(orchestrationException.InnerException);
    Assert.IsExactInstanceOfType<MerchantFoundationServiceDependencyException>(orchestrationException.InnerException);

    var foundation = orchestrationException.InnerException;
    Assert.IsNotNull(foundation.InnerException);
    Assert.IsExactInstanceOfType<InvalidOperationException>(foundation.InnerException);
  }

  #endregion
}
