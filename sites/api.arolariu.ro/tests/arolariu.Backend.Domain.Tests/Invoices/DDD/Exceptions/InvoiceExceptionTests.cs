namespace arolariu.Backend.Domain.Tests.Invoices.DDD.Exceptions;

using System;
using System.IO;
using System.Runtime.Serialization.Formatters.Binary;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Orchestration;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Comprehensive unit tests for all Invoice exception classes.
/// Tests validate all constructors, serialization, and inheritance.
/// Method naming follows MethodName_Condition_ExpectedResult pattern per repository standards.
/// </summary>
[TestClass]
public sealed class InvoiceExceptionTests
{
  #region InvoiceIdNotSetException Tests

  /// <summary>
  /// Verifies default constructor creates instance.
  /// </summary>
  [TestMethod]
  public void InvoiceIdNotSetException_DefaultConstructor_CreatesInstance()
  {
    // Act
    var exception = new InvoiceIdNotSetException();

    // Assert
    Assert.IsNotNull(exception);
    Assert.IsExactInstanceOfType<InvoiceIdNotSetException>(exception);
    Assert.IsInstanceOfType<Exception>(exception);
  }

  /// <summary>
  /// Verifies constructor with inner exception sets message and inner exception.
  /// </summary>
  [TestMethod]
  public void InvoiceIdNotSetException_InnerExceptionConstructor_SetsPropertiesCorrectly()
  {
    // Arrange
    var innerException = new InvalidOperationException("Inner error");

    // Act
    var exception = new InvoiceIdNotSetException(innerException);

    // Assert
    Assert.IsNotNull(exception);
    Assert.AreEqual("Invoice identifier not set Exception", exception.Message);
    Assert.AreSame(innerException, exception.InnerException);
  }

  /// <summary>
  /// Verifies constructor with null inner exception works.
  /// </summary>
  [TestMethod]
  public void InvoiceIdNotSetException_NullInnerException_CreatesInstance()
  {
    // Act
    var exception = new InvoiceIdNotSetException(null!);

    // Assert
    Assert.IsNotNull(exception);
    Assert.IsNull(exception.InnerException);
  }

  #endregion

  #region InvoiceDescriptionNotSetException Tests

  /// <summary>
  /// Verifies default constructor creates instance.
  /// </summary>
  [TestMethod]
  public void InvoiceDescriptionNotSetException_DefaultConstructor_CreatesInstance()
  {
    // Act
    var exception = new InvoiceDescriptionNotSetException();

    // Assert
    Assert.IsNotNull(exception);
    Assert.IsExactInstanceOfType<InvoiceDescriptionNotSetException>(exception);
  }

  /// <summary>
  /// Verifies constructor with inner exception sets properties correctly.
  /// </summary>
  [TestMethod]
  public void InvoiceDescriptionNotSetException_InnerExceptionConstructor_SetsPropertiesCorrectly()
  {
    // Arrange
    var innerException = new InvalidOperationException("Inner error");

    // Act
    var exception = new InvoiceDescriptionNotSetException(innerException);

    // Assert
    Assert.IsNotNull(exception);
    Assert.AreEqual("Invoice description not set Exception", exception.Message);
    Assert.AreSame(innerException, exception.InnerException);
  }

  #endregion

  #region InvoicePaymentInformationNotCorrectException Tests

  /// <summary>
  /// Verifies default constructor creates instance.
  /// </summary>
  [TestMethod]
  public void InvoicePaymentInformationNotCorrectException_DefaultConstructor_CreatesInstance()
  {
    // Act
    var exception = new InvoicePaymentInformationNotCorrectException();

    // Assert
    Assert.IsNotNull(exception);
    Assert.IsExactInstanceOfType<InvoicePaymentInformationNotCorrectException>(exception);
  }

  /// <summary>
  /// Verifies constructor with inner exception sets properties correctly.
  /// </summary>
  [TestMethod]
  public void InvoicePaymentInformationNotCorrectException_InnerExceptionConstructor_SetsPropertiesCorrectly()
  {
    // Arrange
    var innerException = new InvalidOperationException("Inner error");

    // Act
    var exception = new InvoicePaymentInformationNotCorrectException(innerException);

    // Assert
    Assert.IsNotNull(exception);
    Assert.AreEqual("Invoice payment information not correct Exception", exception.Message);
    Assert.AreSame(innerException, exception.InnerException);
  }

  #endregion

  #region InvoicePhotoLocationNotCorrectException Tests

  /// <summary>
  /// Verifies default constructor creates instance.
  /// </summary>
  [TestMethod]
  public void InvoicePhotoLocationNotCorrectException_DefaultConstructor_CreatesInstance()
  {
    // Act
    var exception = new InvoicePhotoLocationNotCorrectException();

    // Assert
    Assert.IsNotNull(exception);
    Assert.IsExactInstanceOfType<InvoicePhotoLocationNotCorrectException>(exception);
  }

  /// <summary>
  /// Verifies constructor with inner exception sets properties correctly.
  /// </summary>
  [TestMethod]
  public void InvoicePhotoLocationNotCorrectException_InnerExceptionConstructor_SetsPropertiesCorrectly()
  {
    // Arrange
    var innerException = new InvalidOperationException("Inner error");

    // Act
    var exception = new InvoicePhotoLocationNotCorrectException(innerException);

    // Assert
    Assert.IsNotNull(exception);
    Assert.AreEqual("Invoice photo location not correct Exception", exception.Message);
    Assert.AreSame(innerException, exception.InnerException);
  }

  #endregion

  #region InvoiceTimeInformationNotCorrectException Tests

  /// <summary>
  /// Verifies default constructor creates instance.
  /// </summary>
  [TestMethod]
  public void InvoiceTimeInformationNotCorrectException_DefaultConstructor_CreatesInstance()
  {
    // Act
    var exception = new InvoiceTimeInformationNotCorrectException();

    // Assert
    Assert.IsNotNull(exception);
    Assert.IsExactInstanceOfType<InvoiceTimeInformationNotCorrectException>(exception);
  }

  /// <summary>
  /// Verifies constructor with inner exception sets properties correctly.
  /// </summary>
  [TestMethod]
  public void InvoiceTimeInformationNotCorrectException_InnerExceptionConstructor_SetsPropertiesCorrectly()
  {
    // Arrange
    var innerException = new InvalidOperationException("Inner error");

    // Act
    var exception = new InvoiceTimeInformationNotCorrectException(innerException);

    // Assert
    Assert.IsNotNull(exception);
    Assert.AreEqual("Invoice time information not correct Exception", exception.Message);
    Assert.AreSame(innerException, exception.InnerException);
  }

  #endregion

  #region InvoiceFoundationValidationException Tests

  /// <summary>
  /// Verifies default constructor creates instance.
  /// </summary>
  [TestMethod]
  public void InvoiceFoundationValidationException_DefaultConstructor_CreatesInstance()
  {
    // Act
    var exception = new InvoiceFoundationValidationException();

    // Assert
    Assert.IsNotNull(exception);
    Assert.IsExactInstanceOfType<InvoiceFoundationValidationException>(exception);
  }

  /// <summary>
  /// Verifies constructor with inner exception sets properties correctly.
  /// </summary>
  [TestMethod]
  public void InvoiceFoundationValidationException_InnerExceptionConstructor_SetsPropertiesCorrectly()
  {
    // Arrange
    var innerException = new InvoiceIdNotSetException();

    // Act
    var exception = new InvoiceFoundationValidationException(innerException);

    // Assert
    Assert.IsNotNull(exception);
    Assert.AreEqual("Invoice Validation Exception", exception.Message);
    Assert.AreSame(innerException, exception.InnerException);
  }

  /// <summary>
  /// Verifies constructor with nested inner exceptions preserves exception chain.
  /// </summary>
  [TestMethod]
  public void InvoiceFoundationValidationException_NestedInnerExceptions_PreservesExceptionChain()
  {
    // Arrange
    var rootCause = new ArgumentException("Root cause");
    var innerException = new InvoiceIdNotSetException(rootCause);

    // Act
    var exception = new InvoiceFoundationValidationException(innerException);

    // Assert
    Assert.IsNotNull(exception.InnerException);
    Assert.IsNotNull(exception.InnerException.InnerException);
    Assert.IsExactInstanceOfType<ArgumentException>(exception.InnerException.InnerException);
  }

  #endregion

  #region InvoiceFoundationDependencyException Tests

  /// <summary>
  /// Verifies default constructor creates instance.
  /// </summary>
  [TestMethod]
  public void InvoiceFoundationDependencyException_DefaultConstructor_CreatesInstance()
  {
    // Act
    var exception = new InvoiceFoundationDependencyException();

    // Assert
    Assert.IsNotNull(exception);
    Assert.IsExactInstanceOfType<InvoiceFoundationDependencyException>(exception);
  }

  /// <summary>
  /// Verifies constructor with inner exception sets properties correctly.
  /// </summary>
  [TestMethod]
  public void InvoiceFoundationDependencyException_InnerExceptionConstructor_SetsPropertiesCorrectly()
  {
    // Arrange
    var innerException = new InvalidOperationException("Database error");

    // Act
    var exception = new InvoiceFoundationDependencyException(innerException);

    // Assert
    Assert.IsNotNull(exception);
    Assert.AreEqual("Invoice Dependency Exception", exception.Message);
    Assert.AreSame(innerException, exception.InnerException);
  }

  #endregion

  #region InvoiceFoundationDependencyValidationException Tests

  /// <summary>
  /// Verifies default constructor creates instance.
  /// </summary>
  [TestMethod]
  public void InvoiceFoundationDependencyValidationException_DefaultConstructor_CreatesInstance()
  {
    // Act
    var exception = new InvoiceFoundationDependencyValidationException();

    // Assert
    Assert.IsNotNull(exception);
    Assert.IsExactInstanceOfType<InvoiceFoundationDependencyValidationException>(exception);
  }

  /// <summary>
  /// Verifies constructor with inner exception sets properties correctly.
  /// </summary>
  [TestMethod]
  public void InvoiceFoundationDependencyValidationException_InnerExceptionConstructor_SetsPropertiesCorrectly()
  {
    // Arrange
    var innerException = new ArgumentNullException("parameter");

    // Act
    var exception = new InvoiceFoundationDependencyValidationException(innerException);

    // Assert
    Assert.IsNotNull(exception);
    Assert.AreEqual("Invoice Dependency Validation Exception", exception.Message);
    Assert.AreSame(innerException, exception.InnerException);
  }

  #endregion

  #region InvoiceFoundationServiceException Tests

  /// <summary>
  /// Verifies default constructor creates instance.
  /// </summary>
  [TestMethod]
  public void InvoiceFoundationServiceException_DefaultConstructor_CreatesInstance()
  {
    // Act
    var exception = new InvoiceFoundationServiceException();

    // Assert
    Assert.IsNotNull(exception);
    Assert.IsExactInstanceOfType<InvoiceFoundationServiceException>(exception);
  }

  /// <summary>
  /// Verifies constructor with inner exception sets properties correctly.
  /// </summary>
  [TestMethod]
  public void InvoiceFoundationServiceException_InnerExceptionConstructor_SetsPropertiesCorrectly()
  {
    // Arrange
    var innerException = new InvalidOperationException("Service error");

    // Act
    var exception = new InvoiceFoundationServiceException(innerException);

    // Assert
    Assert.IsNotNull(exception);
    Assert.AreEqual("Invoice Service Exception", exception.Message);
    Assert.AreSame(innerException, exception.InnerException);
  }

  #endregion

  #region InvoiceOrchestrationValidationException Tests

  /// <summary>
  /// Verifies default constructor creates instance.
  /// </summary>
  [TestMethod]
  public void InvoiceOrchestrationValidationException_DefaultConstructor_CreatesInstance()
  {
    // Act
    var exception = new InvoiceOrchestrationValidationException();

    // Assert
    Assert.IsNotNull(exception);
    Assert.IsExactInstanceOfType<InvoiceOrchestrationValidationException>(exception);
  }

  /// <summary>
  /// Verifies constructor with inner exception sets properties correctly.
  /// </summary>
  [TestMethod]
  public void InvoiceOrchestrationValidationException_InnerExceptionConstructor_SetsPropertiesCorrectly()
  {
    // Arrange
    var innerException = new InvoiceFoundationValidationException();

    // Act
    var exception = new InvoiceOrchestrationValidationException(innerException);

    // Assert
    Assert.IsNotNull(exception);
    Assert.AreEqual("Invoice Orchestration Validation Exception", exception.Message);
    Assert.AreSame(innerException, exception.InnerException);
  }

  #endregion

  #region InvoiceOrchestrationDependencyException Tests

  /// <summary>
  /// Verifies default constructor creates instance.
  /// </summary>
  [TestMethod]
  public void InvoiceOrchestrationDependencyException_DefaultConstructor_CreatesInstance()
  {
    // Act
    var exception = new InvoiceOrchestrationDependencyException();

    // Assert
    Assert.IsNotNull(exception);
    Assert.IsExactInstanceOfType<InvoiceOrchestrationDependencyException>(exception);
  }

  /// <summary>
  /// Verifies constructor with inner exception sets properties correctly.
  /// </summary>
  [TestMethod]
  public void InvoiceOrchestrationDependencyException_InnerExceptionConstructor_SetsPropertiesCorrectly()
  {
    // Arrange
    var innerException = new InvoiceFoundationDependencyException();

    // Act
    var exception = new InvoiceOrchestrationDependencyException(innerException);

    // Assert
    Assert.IsNotNull(exception);
    Assert.AreEqual("Invoice Orchestration Dependency Exception", exception.Message);
    Assert.AreSame(innerException, exception.InnerException);
  }

  #endregion

  #region InvoiceOrchestrationDependencyValidationException Tests

  /// <summary>
  /// Verifies default constructor creates instance.
  /// </summary>
  [TestMethod]
  public void InvoiceOrchestrationDependencyValidationException_DefaultConstructor_CreatesInstance()
  {
    // Act
    var exception = new InvoiceOrchestrationDependencyValidationException();

    // Assert
    Assert.IsNotNull(exception);
    Assert.IsExactInstanceOfType<InvoiceOrchestrationDependencyValidationException>(exception);
  }

  /// <summary>
  /// Verifies constructor with inner exception sets properties correctly.
  /// </summary>
  [TestMethod]
  public void InvoiceOrchestrationDependencyValidationException_InnerExceptionConstructor_SetsPropertiesCorrectly()
  {
    // Arrange
    var innerException = new InvoiceFoundationDependencyValidationException();

    // Act
    var exception = new InvoiceOrchestrationDependencyValidationException(innerException);

    // Assert
    Assert.IsNotNull(exception);
    Assert.AreEqual("Invoice Orchestration Dependency Validation Exception", exception.Message);
    Assert.AreSame(innerException, exception.InnerException);
  }

  #endregion

  #region InvoiceOrchestrationServiceException Tests

  /// <summary>
  /// Verifies default constructor creates instance.
  /// </summary>
  [TestMethod]
  public void InvoiceOrchestrationServiceException_DefaultConstructor_CreatesInstance()
  {
    // Act
    var exception = new InvoiceOrchestrationServiceException();

    // Assert
    Assert.IsNotNull(exception);
    Assert.IsExactInstanceOfType<InvoiceOrchestrationServiceException>(exception);
  }

  /// <summary>
  /// Verifies constructor with inner exception sets properties correctly.
  /// </summary>
  [TestMethod]
  public void InvoiceOrchestrationServiceException_InnerExceptionConstructor_SetsPropertiesCorrectly()
  {
    // Arrange
    var innerException = new InvoiceFoundationServiceException();

    // Act
    var exception = new InvoiceOrchestrationServiceException(innerException);

    // Assert
    Assert.IsNotNull(exception);
    Assert.AreEqual("Invoice Orchestration Service Exception", exception.Message);
    Assert.AreSame(innerException, exception.InnerException);
  }

  #endregion

  #region CrudProcessingServiceValidationException Tests

  /// <summary>
  /// Verifies default constructor creates instance.
  /// </summary>
  [TestMethod]
  public void CrudProcessingServiceValidationException_DefaultConstructor_CreatesInstance()
  {
    // Act
    var exception = new CrudProcessingServiceValidationException();

    // Assert
    Assert.IsNotNull(exception);
    Assert.IsExactInstanceOfType<CrudProcessingServiceValidationException>(exception);
  }

  /// <summary>
  /// Verifies constructor with inner exception sets properties correctly.
  /// </summary>
  [TestMethod]
  public void CrudProcessingServiceValidationException_InnerExceptionConstructor_SetsPropertiesCorrectly()
  {
    // Arrange
    var innerException = new InvoiceOrchestrationValidationException();

    // Act
    var exception = new CrudProcessingServiceValidationException(innerException);

    // Assert
    Assert.IsNotNull(exception);
    Assert.AreEqual("CRUD Processing Validation Exception", exception.Message);
    Assert.AreSame(innerException, exception.InnerException);
  }

  #endregion

  #region CrudProcessingServiceDependencyException Tests

  /// <summary>
  /// Verifies default constructor creates instance.
  /// </summary>
  [TestMethod]
  public void CrudProcessingServiceDependencyException_DefaultConstructor_CreatesInstance()
  {
    // Act
    var exception = new CrudProcessingServiceDependencyException();

    // Assert
    Assert.IsNotNull(exception);
    Assert.IsExactInstanceOfType<CrudProcessingServiceDependencyException>(exception);
  }

  /// <summary>
  /// Verifies constructor with inner exception sets properties correctly.
  /// </summary>
  [TestMethod]
  public void CrudProcessingServiceDependencyException_InnerExceptionConstructor_SetsPropertiesCorrectly()
  {
    // Arrange
    var innerException = new InvoiceOrchestrationDependencyException();

    // Act
    var exception = new CrudProcessingServiceDependencyException(innerException);

    // Assert
    Assert.IsNotNull(exception);
    Assert.AreEqual("CRUD Processing Dependency Exception", exception.Message);
    Assert.AreSame(innerException, exception.InnerException);
  }

  #endregion

  #region CrudProcessingServiceDependencyValidationException Tests

  /// <summary>
  /// Verifies default constructor creates instance.
  /// </summary>
  [TestMethod]
  public void CrudProcessingServiceDependencyValidationException_DefaultConstructor_CreatesInstance()
  {
    // Act
    var exception = new CrudProcessingServiceDependencyValidationException();

    // Assert
    Assert.IsNotNull(exception);
    Assert.IsExactInstanceOfType<CrudProcessingServiceDependencyValidationException>(exception);
  }

  /// <summary>
  /// Verifies constructor with inner exception sets properties correctly.
  /// </summary>
  [TestMethod]
  public void CrudProcessingServiceDependencyValidationException_InnerExceptionConstructor_SetsPropertiesCorrectly()
  {
    // Arrange
    var innerException = new InvoiceOrchestrationDependencyValidationException();

    // Act
    var exception = new CrudProcessingServiceDependencyValidationException(innerException);

    // Assert
    Assert.IsNotNull(exception);
    Assert.AreEqual("CRUD Processing Dependency Validation Exception", exception.Message);
    Assert.AreSame(innerException, exception.InnerException);
  }

  #endregion

  #region CrudProcessingServiceException Tests

  /// <summary>
  /// Verifies default constructor creates instance.
  /// </summary>
  [TestMethod]
  public void CrudProcessingServiceException_DefaultConstructor_CreatesInstance()
  {
    // Act
    var exception = new CrudProcessingServiceException();

    // Assert
    Assert.IsNotNull(exception);
    Assert.IsExactInstanceOfType<CrudProcessingServiceException>(exception);
  }

  /// <summary>
  /// Verifies constructor with inner exception sets properties correctly.
  /// </summary>
  [TestMethod]
  public void CrudProcessingServiceException_InnerExceptionConstructor_SetsPropertiesCorrectly()
  {
    // Arrange
    var innerException = new InvoiceOrchestrationServiceException();

    // Act
    var exception = new CrudProcessingServiceException(innerException);

    // Assert
    Assert.IsNotNull(exception);
    Assert.AreEqual("CRUD Processing Exception", exception.Message);
    Assert.AreSame(innerException, exception.InnerException);
  }

  #endregion

  #region Exception Hierarchy Tests

  /// <summary>
  /// Verifies all inner exceptions inherit from Exception base class.
  /// </summary>
  [TestMethod]
  [DataRow(typeof(InvoiceIdNotSetException))]
  [DataRow(typeof(InvoiceDescriptionNotSetException))]
  [DataRow(typeof(InvoicePaymentInformationNotCorrectException))]
  [DataRow(typeof(InvoicePhotoLocationNotCorrectException))]
  [DataRow(typeof(InvoiceTimeInformationNotCorrectException))]
  public void InnerExceptions_InheritFromException_TypeVerification(Type exceptionType)
  {
    // Assert
    Assert.IsTrue(typeof(Exception).IsAssignableFrom(exceptionType));
  }

  /// <summary>
  /// Verifies all foundation exceptions inherit from Exception base class.
  /// </summary>
  [TestMethod]
  [DataRow(typeof(InvoiceFoundationValidationException))]
  [DataRow(typeof(InvoiceFoundationDependencyException))]
  [DataRow(typeof(InvoiceFoundationDependencyValidationException))]
  [DataRow(typeof(InvoiceFoundationServiceException))]
  public void FoundationExceptions_InheritFromException_TypeVerification(Type exceptionType)
  {
    // Assert
    Assert.IsTrue(typeof(Exception).IsAssignableFrom(exceptionType));
  }

  /// <summary>
  /// Verifies all orchestration exceptions inherit from Exception base class.
  /// </summary>
  [TestMethod]
  [DataRow(typeof(InvoiceOrchestrationValidationException))]
  [DataRow(typeof(InvoiceOrchestrationDependencyException))]
  [DataRow(typeof(InvoiceOrchestrationDependencyValidationException))]
  [DataRow(typeof(InvoiceOrchestrationServiceException))]
  public void OrchestrationExceptions_InheritFromException_TypeVerification(Type exceptionType)
  {
    // Assert
    Assert.IsTrue(typeof(Exception).IsAssignableFrom(exceptionType));
  }

  /// <summary>
  /// Verifies all processing exceptions inherit from Exception base class.
  /// </summary>
  [TestMethod]
  [DataRow(typeof(CrudProcessingServiceValidationException))]
  [DataRow(typeof(CrudProcessingServiceDependencyException))]
  [DataRow(typeof(CrudProcessingServiceDependencyValidationException))]
  [DataRow(typeof(CrudProcessingServiceException))]
  public void ProcessingExceptions_InheritFromException_TypeVerification(Type exceptionType)
  {
    // Assert
    Assert.IsTrue(typeof(Exception).IsAssignableFrom(exceptionType));
  }

  /// <summary>
  /// Verifies all invoice exceptions have the Serializable attribute.
  /// </summary>
  [TestMethod]
  [DataRow(typeof(InvoiceIdNotSetException))]
  [DataRow(typeof(InvoiceDescriptionNotSetException))]
  [DataRow(typeof(InvoicePaymentInformationNotCorrectException))]
  [DataRow(typeof(InvoicePhotoLocationNotCorrectException))]
  [DataRow(typeof(InvoiceTimeInformationNotCorrectException))]
  [DataRow(typeof(InvoiceFoundationValidationException))]
  [DataRow(typeof(InvoiceFoundationDependencyException))]
  [DataRow(typeof(InvoiceFoundationDependencyValidationException))]
  [DataRow(typeof(InvoiceFoundationServiceException))]
  [DataRow(typeof(InvoiceOrchestrationValidationException))]
  [DataRow(typeof(InvoiceOrchestrationDependencyException))]
  [DataRow(typeof(InvoiceOrchestrationDependencyValidationException))]
  [DataRow(typeof(InvoiceOrchestrationServiceException))]
  [DataRow(typeof(CrudProcessingServiceValidationException))]
  [DataRow(typeof(CrudProcessingServiceDependencyException))]
  [DataRow(typeof(CrudProcessingServiceDependencyValidationException))]
  [DataRow(typeof(CrudProcessingServiceException))]
  public void AllExceptions_HaveSerializableAttribute_AttributeVerification(Type exceptionType)
  {
    // Assert
    Assert.IsTrue(Attribute.IsDefined(exceptionType, typeof(SerializableAttribute)));
  }

  #endregion

  #region Exception Chaining Tests

  /// <summary>
  /// Verifies full exception chain from Processing to Foundation layers.
  /// </summary>
  [TestMethod]
  public void ExceptionChain_ProcessingToFoundation_PreservesFullChain()
  {
    // Arrange
    var rootCause = new ArgumentException("Invalid argument");
    var innerException = new InvoiceIdNotSetException(rootCause);
    var foundationException = new InvoiceFoundationValidationException(innerException);
    var orchestrationException = new InvoiceOrchestrationValidationException(foundationException);

    // Act
    var processingException = new CrudProcessingServiceValidationException(orchestrationException);

    // Assert
    Assert.IsNotNull(processingException.InnerException);
    Assert.IsExactInstanceOfType<InvoiceOrchestrationValidationException>(processingException.InnerException);

    var orchestration = processingException.InnerException;
    Assert.IsNotNull(orchestration.InnerException);
    Assert.IsExactInstanceOfType<InvoiceFoundationValidationException>(orchestration.InnerException);

    var foundation = orchestration.InnerException;
    Assert.IsNotNull(foundation.InnerException);
    Assert.IsExactInstanceOfType<InvoiceIdNotSetException>(foundation.InnerException);

    var inner = foundation.InnerException;
    Assert.IsNotNull(inner.InnerException);
    Assert.IsExactInstanceOfType<ArgumentException>(inner.InnerException);
  }

  /// <summary>
  /// Verifies dependency exception chain preservation.
  /// </summary>
  [TestMethod]
  public void DependencyExceptionChain_ProcessingToFoundation_PreservesFullChain()
  {
    // Arrange
    var dbException = new InvalidOperationException("Database connection failed");
    var foundationException = new InvoiceFoundationDependencyException(dbException);
    var orchestrationException = new InvoiceOrchestrationDependencyException(foundationException);

    // Act
    var processingException = new CrudProcessingServiceDependencyException(orchestrationException);

    // Assert
    Assert.IsNotNull(processingException.InnerException);
    Assert.IsExactInstanceOfType<InvoiceOrchestrationDependencyException>(processingException.InnerException);

    var orchestration = processingException.InnerException;
    Assert.IsNotNull(orchestration.InnerException);
    Assert.IsExactInstanceOfType<InvoiceFoundationDependencyException>(orchestration.InnerException);

    var foundation = orchestration.InnerException;
    Assert.IsNotNull(foundation.InnerException);
    Assert.IsExactInstanceOfType<InvalidOperationException>(foundation.InnerException);
  }

  #endregion
}
