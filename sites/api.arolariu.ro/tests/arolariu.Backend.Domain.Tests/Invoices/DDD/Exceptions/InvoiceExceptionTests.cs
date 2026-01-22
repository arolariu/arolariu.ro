namespace arolariu.Backend.Domain.Tests.Invoices.DDD.Exceptions;

using System;
using System.IO;
using System.Runtime.Serialization.Formatters.Binary;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Orchestration;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing;

using Xunit;

/// <summary>
/// Comprehensive unit tests for all Invoice exception classes.
/// Tests validate all constructors, serialization, and inheritance.
/// Method naming follows MethodName_Condition_ExpectedResult pattern per repository standards.
/// </summary>
public sealed class InvoiceExceptionTests
{
	#region InvoiceIdNotSetException Tests

	/// <summary>
	/// Verifies default constructor creates instance.
	/// </summary>
	[Fact]
	public void InvoiceIdNotSetException_DefaultConstructor_CreatesInstance()
	{
		// Act
		var exception = new InvoiceIdNotSetException();

		// Assert
		Assert.NotNull(exception);
		Assert.IsType<InvoiceIdNotSetException>(exception);
		Assert.IsAssignableFrom<Exception>(exception);
	}

	/// <summary>
	/// Verifies constructor with inner exception sets message and inner exception.
	/// </summary>
	[Fact]
	public void InvoiceIdNotSetException_InnerExceptionConstructor_SetsPropertiesCorrectly()
	{
		// Arrange
		var innerException = new InvalidOperationException("Inner error");

		// Act
		var exception = new InvoiceIdNotSetException(innerException);

		// Assert
		Assert.NotNull(exception);
		Assert.Equal("Invoice identifier not set Exception", exception.Message);
		Assert.Same(innerException, exception.InnerException);
	}

	/// <summary>
	/// Verifies constructor with null inner exception works.
	/// </summary>
	[Fact]
	public void InvoiceIdNotSetException_NullInnerException_CreatesInstance()
	{
		// Act
		var exception = new InvoiceIdNotSetException(null!);

		// Assert
		Assert.NotNull(exception);
		Assert.Null(exception.InnerException);
	}

	#endregion

	#region InvoiceDescriptionNotSetException Tests

	/// <summary>
	/// Verifies default constructor creates instance.
	/// </summary>
	[Fact]
	public void InvoiceDescriptionNotSetException_DefaultConstructor_CreatesInstance()
	{
		// Act
		var exception = new InvoiceDescriptionNotSetException();

		// Assert
		Assert.NotNull(exception);
		Assert.IsType<InvoiceDescriptionNotSetException>(exception);
	}

	/// <summary>
	/// Verifies constructor with inner exception sets properties correctly.
	/// </summary>
	[Fact]
	public void InvoiceDescriptionNotSetException_InnerExceptionConstructor_SetsPropertiesCorrectly()
	{
		// Arrange
		var innerException = new InvalidOperationException("Inner error");

		// Act
		var exception = new InvoiceDescriptionNotSetException(innerException);

		// Assert
		Assert.NotNull(exception);
		Assert.Equal("Invoice description not set Exception", exception.Message);
		Assert.Same(innerException, exception.InnerException);
	}

	#endregion

	#region InvoicePaymentInformationNotCorrectException Tests

	/// <summary>
	/// Verifies default constructor creates instance.
	/// </summary>
	[Fact]
	public void InvoicePaymentInformationNotCorrectException_DefaultConstructor_CreatesInstance()
	{
		// Act
		var exception = new InvoicePaymentInformationNotCorrectException();

		// Assert
		Assert.NotNull(exception);
		Assert.IsType<InvoicePaymentInformationNotCorrectException>(exception);
	}

	/// <summary>
	/// Verifies constructor with inner exception sets properties correctly.
	/// </summary>
	[Fact]
	public void InvoicePaymentInformationNotCorrectException_InnerExceptionConstructor_SetsPropertiesCorrectly()
	{
		// Arrange
		var innerException = new InvalidOperationException("Inner error");

		// Act
		var exception = new InvoicePaymentInformationNotCorrectException(innerException);

		// Assert
		Assert.NotNull(exception);
		Assert.Equal("Invoice payment information not correct Exception", exception.Message);
		Assert.Same(innerException, exception.InnerException);
	}

	#endregion

	#region InvoicePhotoLocationNotCorrectException Tests

	/// <summary>
	/// Verifies default constructor creates instance.
	/// </summary>
	[Fact]
	public void InvoicePhotoLocationNotCorrectException_DefaultConstructor_CreatesInstance()
	{
		// Act
		var exception = new InvoicePhotoLocationNotCorrectException();

		// Assert
		Assert.NotNull(exception);
		Assert.IsType<InvoicePhotoLocationNotCorrectException>(exception);
	}

	/// <summary>
	/// Verifies constructor with inner exception sets properties correctly.
	/// </summary>
	[Fact]
	public void InvoicePhotoLocationNotCorrectException_InnerExceptionConstructor_SetsPropertiesCorrectly()
	{
		// Arrange
		var innerException = new InvalidOperationException("Inner error");

		// Act
		var exception = new InvoicePhotoLocationNotCorrectException(innerException);

		// Assert
		Assert.NotNull(exception);
		Assert.Equal("Invoice photo location not correct Exception", exception.Message);
		Assert.Same(innerException, exception.InnerException);
	}

	#endregion

	#region InvoiceTimeInformationNotCorrectException Tests

	/// <summary>
	/// Verifies default constructor creates instance.
	/// </summary>
	[Fact]
	public void InvoiceTimeInformationNotCorrectException_DefaultConstructor_CreatesInstance()
	{
		// Act
		var exception = new InvoiceTimeInformationNotCorrectException();

		// Assert
		Assert.NotNull(exception);
		Assert.IsType<InvoiceTimeInformationNotCorrectException>(exception);
	}

	/// <summary>
	/// Verifies constructor with inner exception sets properties correctly.
	/// </summary>
	[Fact]
	public void InvoiceTimeInformationNotCorrectException_InnerExceptionConstructor_SetsPropertiesCorrectly()
	{
		// Arrange
		var innerException = new InvalidOperationException("Inner error");

		// Act
		var exception = new InvoiceTimeInformationNotCorrectException(innerException);

		// Assert
		Assert.NotNull(exception);
		Assert.Equal("Invoice time information not correct Exception", exception.Message);
		Assert.Same(innerException, exception.InnerException);
	}

	#endregion

	#region InvoiceFoundationValidationException Tests

	/// <summary>
	/// Verifies default constructor creates instance.
	/// </summary>
	[Fact]
	public void InvoiceFoundationValidationException_DefaultConstructor_CreatesInstance()
	{
		// Act
		var exception = new InvoiceFoundationValidationException();

		// Assert
		Assert.NotNull(exception);
		Assert.IsType<InvoiceFoundationValidationException>(exception);
	}

	/// <summary>
	/// Verifies constructor with inner exception sets properties correctly.
	/// </summary>
	[Fact]
	public void InvoiceFoundationValidationException_InnerExceptionConstructor_SetsPropertiesCorrectly()
	{
		// Arrange
		var innerException = new InvoiceIdNotSetException();

		// Act
		var exception = new InvoiceFoundationValidationException(innerException);

		// Assert
		Assert.NotNull(exception);
		Assert.Equal("Invoice Validation Exception", exception.Message);
		Assert.Same(innerException, exception.InnerException);
	}

	/// <summary>
	/// Verifies constructor with nested inner exceptions preserves exception chain.
	/// </summary>
	[Fact]
	public void InvoiceFoundationValidationException_NestedInnerExceptions_PreservesExceptionChain()
	{
		// Arrange
		var rootCause = new ArgumentException("Root cause");
		var innerException = new InvoiceIdNotSetException(rootCause);

		// Act
		var exception = new InvoiceFoundationValidationException(innerException);

		// Assert
		Assert.NotNull(exception.InnerException);
		Assert.NotNull(exception.InnerException.InnerException);
		Assert.IsType<ArgumentException>(exception.InnerException.InnerException);
	}

	#endregion

	#region InvoiceFoundationDependencyException Tests

	/// <summary>
	/// Verifies default constructor creates instance.
	/// </summary>
	[Fact]
	public void InvoiceFoundationDependencyException_DefaultConstructor_CreatesInstance()
	{
		// Act
		var exception = new InvoiceFoundationDependencyException();

		// Assert
		Assert.NotNull(exception);
		Assert.IsType<InvoiceFoundationDependencyException>(exception);
	}

	/// <summary>
	/// Verifies constructor with inner exception sets properties correctly.
	/// </summary>
	[Fact]
	public void InvoiceFoundationDependencyException_InnerExceptionConstructor_SetsPropertiesCorrectly()
	{
		// Arrange
		var innerException = new InvalidOperationException("Database error");

		// Act
		var exception = new InvoiceFoundationDependencyException(innerException);

		// Assert
		Assert.NotNull(exception);
		Assert.Equal("Invoice Dependency Exception", exception.Message);
		Assert.Same(innerException, exception.InnerException);
	}

	#endregion

	#region InvoiceFoundationDependencyValidationException Tests

	/// <summary>
	/// Verifies default constructor creates instance.
	/// </summary>
	[Fact]
	public void InvoiceFoundationDependencyValidationException_DefaultConstructor_CreatesInstance()
	{
		// Act
		var exception = new InvoiceFoundationDependencyValidationException();

		// Assert
		Assert.NotNull(exception);
		Assert.IsType<InvoiceFoundationDependencyValidationException>(exception);
	}

	/// <summary>
	/// Verifies constructor with inner exception sets properties correctly.
	/// </summary>
	[Fact]
	public void InvoiceFoundationDependencyValidationException_InnerExceptionConstructor_SetsPropertiesCorrectly()
	{
		// Arrange
		var innerException = new ArgumentNullException("parameter");

		// Act
		var exception = new InvoiceFoundationDependencyValidationException(innerException);

		// Assert
		Assert.NotNull(exception);
		Assert.Equal("Invoice Dependency Validation Exception", exception.Message);
		Assert.Same(innerException, exception.InnerException);
	}

	#endregion

	#region InvoiceFoundationServiceException Tests

	/// <summary>
	/// Verifies default constructor creates instance.
	/// </summary>
	[Fact]
	public void InvoiceFoundationServiceException_DefaultConstructor_CreatesInstance()
	{
		// Act
		var exception = new InvoiceFoundationServiceException();

		// Assert
		Assert.NotNull(exception);
		Assert.IsType<InvoiceFoundationServiceException>(exception);
	}

	/// <summary>
	/// Verifies constructor with inner exception sets properties correctly.
	/// </summary>
	[Fact]
	public void InvoiceFoundationServiceException_InnerExceptionConstructor_SetsPropertiesCorrectly()
	{
		// Arrange
		var innerException = new InvalidOperationException("Service error");

		// Act
		var exception = new InvoiceFoundationServiceException(innerException);

		// Assert
		Assert.NotNull(exception);
		Assert.Equal("Invoice Service Exception", exception.Message);
		Assert.Same(innerException, exception.InnerException);
	}

	#endregion

	#region InvoiceOrchestrationValidationException Tests

	/// <summary>
	/// Verifies default constructor creates instance.
	/// </summary>
	[Fact]
	public void InvoiceOrchestrationValidationException_DefaultConstructor_CreatesInstance()
	{
		// Act
		var exception = new InvoiceOrchestrationValidationException();

		// Assert
		Assert.NotNull(exception);
		Assert.IsType<InvoiceOrchestrationValidationException>(exception);
	}

	/// <summary>
	/// Verifies constructor with inner exception sets properties correctly.
	/// </summary>
	[Fact]
	public void InvoiceOrchestrationValidationException_InnerExceptionConstructor_SetsPropertiesCorrectly()
	{
		// Arrange
		var innerException = new InvoiceFoundationValidationException();

		// Act
		var exception = new InvoiceOrchestrationValidationException(innerException);

		// Assert
		Assert.NotNull(exception);
		Assert.Equal("Invoice Orchestration Validation Exception", exception.Message);
		Assert.Same(innerException, exception.InnerException);
	}

	#endregion

	#region InvoiceOrchestrationDependencyException Tests

	/// <summary>
	/// Verifies default constructor creates instance.
	/// </summary>
	[Fact]
	public void InvoiceOrchestrationDependencyException_DefaultConstructor_CreatesInstance()
	{
		// Act
		var exception = new InvoiceOrchestrationDependencyException();

		// Assert
		Assert.NotNull(exception);
		Assert.IsType<InvoiceOrchestrationDependencyException>(exception);
	}

	/// <summary>
	/// Verifies constructor with inner exception sets properties correctly.
	/// </summary>
	[Fact]
	public void InvoiceOrchestrationDependencyException_InnerExceptionConstructor_SetsPropertiesCorrectly()
	{
		// Arrange
		var innerException = new InvoiceFoundationDependencyException();

		// Act
		var exception = new InvoiceOrchestrationDependencyException(innerException);

		// Assert
		Assert.NotNull(exception);
		Assert.Equal("Invoice Orchestration Dependency Exception", exception.Message);
		Assert.Same(innerException, exception.InnerException);
	}

	#endregion

	#region InvoiceOrchestrationDependencyValidationException Tests

	/// <summary>
	/// Verifies default constructor creates instance.
	/// </summary>
	[Fact]
	public void InvoiceOrchestrationDependencyValidationException_DefaultConstructor_CreatesInstance()
	{
		// Act
		var exception = new InvoiceOrchestrationDependencyValidationException();

		// Assert
		Assert.NotNull(exception);
		Assert.IsType<InvoiceOrchestrationDependencyValidationException>(exception);
	}

	/// <summary>
	/// Verifies constructor with inner exception sets properties correctly.
	/// </summary>
	[Fact]
	public void InvoiceOrchestrationDependencyValidationException_InnerExceptionConstructor_SetsPropertiesCorrectly()
	{
		// Arrange
		var innerException = new InvoiceFoundationDependencyValidationException();

		// Act
		var exception = new InvoiceOrchestrationDependencyValidationException(innerException);

		// Assert
		Assert.NotNull(exception);
		Assert.Equal("Invoice Orchestration Dependency Validation Exception", exception.Message);
		Assert.Same(innerException, exception.InnerException);
	}

	#endregion

	#region InvoiceOrchestrationServiceException Tests

	/// <summary>
	/// Verifies default constructor creates instance.
	/// </summary>
	[Fact]
	public void InvoiceOrchestrationServiceException_DefaultConstructor_CreatesInstance()
	{
		// Act
		var exception = new InvoiceOrchestrationServiceException();

		// Assert
		Assert.NotNull(exception);
		Assert.IsType<InvoiceOrchestrationServiceException>(exception);
	}

	/// <summary>
	/// Verifies constructor with inner exception sets properties correctly.
	/// </summary>
	[Fact]
	public void InvoiceOrchestrationServiceException_InnerExceptionConstructor_SetsPropertiesCorrectly()
	{
		// Arrange
		var innerException = new InvoiceFoundationServiceException();

		// Act
		var exception = new InvoiceOrchestrationServiceException(innerException);

		// Assert
		Assert.NotNull(exception);
		Assert.Equal("Invoice Orchestration Service Exception", exception.Message);
		Assert.Same(innerException, exception.InnerException);
	}

	#endregion

	#region InvoiceProcessingServiceValidationException Tests

	/// <summary>
	/// Verifies default constructor creates instance.
	/// </summary>
	[Fact]
	public void InvoiceProcessingServiceValidationException_DefaultConstructor_CreatesInstance()
	{
		// Act
		var exception = new InvoiceProcessingServiceValidationException();

		// Assert
		Assert.NotNull(exception);
		Assert.IsType<InvoiceProcessingServiceValidationException>(exception);
	}

	/// <summary>
	/// Verifies constructor with inner exception sets properties correctly.
	/// </summary>
	[Fact]
	public void InvoiceProcessingServiceValidationException_InnerExceptionConstructor_SetsPropertiesCorrectly()
	{
		// Arrange
		var innerException = new InvoiceOrchestrationValidationException();

		// Act
		var exception = new InvoiceProcessingServiceValidationException(innerException);

		// Assert
		Assert.NotNull(exception);
		Assert.Equal("Invoice Processing Validation Exception", exception.Message);
		Assert.Same(innerException, exception.InnerException);
	}

	#endregion

	#region InvoiceProcessingServiceDependencyException Tests

	/// <summary>
	/// Verifies default constructor creates instance.
	/// </summary>
	[Fact]
	public void InvoiceProcessingServiceDependencyException_DefaultConstructor_CreatesInstance()
	{
		// Act
		var exception = new InvoiceProcessingServiceDependencyException();

		// Assert
		Assert.NotNull(exception);
		Assert.IsType<InvoiceProcessingServiceDependencyException>(exception);
	}

	/// <summary>
	/// Verifies constructor with inner exception sets properties correctly.
	/// </summary>
	[Fact]
	public void InvoiceProcessingServiceDependencyException_InnerExceptionConstructor_SetsPropertiesCorrectly()
	{
		// Arrange
		var innerException = new InvoiceOrchestrationDependencyException();

		// Act
		var exception = new InvoiceProcessingServiceDependencyException(innerException);

		// Assert
		Assert.NotNull(exception);
		Assert.Equal("Invoice Processing Dependency Exception", exception.Message);
		Assert.Same(innerException, exception.InnerException);
	}

	#endregion

	#region InvoiceProcessingServiceDependencyValidationException Tests

	/// <summary>
	/// Verifies default constructor creates instance.
	/// </summary>
	[Fact]
	public void InvoiceProcessingServiceDependencyValidationException_DefaultConstructor_CreatesInstance()
	{
		// Act
		var exception = new InvoiceProcessingServiceDependencyValidationException();

		// Assert
		Assert.NotNull(exception);
		Assert.IsType<InvoiceProcessingServiceDependencyValidationException>(exception);
	}

	/// <summary>
	/// Verifies constructor with inner exception sets properties correctly.
	/// </summary>
	[Fact]
	public void InvoiceProcessingServiceDependencyValidationException_InnerExceptionConstructor_SetsPropertiesCorrectly()
	{
		// Arrange
		var innerException = new InvoiceOrchestrationDependencyValidationException();

		// Act
		var exception = new InvoiceProcessingServiceDependencyValidationException(innerException);

		// Assert
		Assert.NotNull(exception);
		Assert.Equal("Invoice Processing Dependency Validation Exception", exception.Message);
		Assert.Same(innerException, exception.InnerException);
	}

	#endregion

	#region InvoiceProcessingServiceException Tests

	/// <summary>
	/// Verifies default constructor creates instance.
	/// </summary>
	[Fact]
	public void InvoiceProcessingServiceException_DefaultConstructor_CreatesInstance()
	{
		// Act
		var exception = new InvoiceProcessingServiceException();

		// Assert
		Assert.NotNull(exception);
		Assert.IsType<InvoiceProcessingServiceException>(exception);
	}

	/// <summary>
	/// Verifies constructor with inner exception sets properties correctly.
	/// </summary>
	[Fact]
	public void InvoiceProcessingServiceException_InnerExceptionConstructor_SetsPropertiesCorrectly()
	{
		// Arrange
		var innerException = new InvoiceOrchestrationServiceException();

		// Act
		var exception = new InvoiceProcessingServiceException(innerException);

		// Assert
		Assert.NotNull(exception);
		Assert.Equal("Invoice Processing Exception", exception.Message);
		Assert.Same(innerException, exception.InnerException);
	}

	#endregion

	#region Exception Hierarchy Tests

	/// <summary>
	/// Verifies all inner exceptions inherit from Exception base class.
	/// </summary>
	[Theory]
	[InlineData(typeof(InvoiceIdNotSetException))]
	[InlineData(typeof(InvoiceDescriptionNotSetException))]
	[InlineData(typeof(InvoicePaymentInformationNotCorrectException))]
	[InlineData(typeof(InvoicePhotoLocationNotCorrectException))]
	[InlineData(typeof(InvoiceTimeInformationNotCorrectException))]
	public void InnerExceptions_InheritFromException_TypeVerification(Type exceptionType)
	{
		// Assert
		Assert.True(typeof(Exception).IsAssignableFrom(exceptionType));
	}

	/// <summary>
	/// Verifies all foundation exceptions inherit from Exception base class.
	/// </summary>
	[Theory]
	[InlineData(typeof(InvoiceFoundationValidationException))]
	[InlineData(typeof(InvoiceFoundationDependencyException))]
	[InlineData(typeof(InvoiceFoundationDependencyValidationException))]
	[InlineData(typeof(InvoiceFoundationServiceException))]
	public void FoundationExceptions_InheritFromException_TypeVerification(Type exceptionType)
	{
		// Assert
		Assert.True(typeof(Exception).IsAssignableFrom(exceptionType));
	}

	/// <summary>
	/// Verifies all orchestration exceptions inherit from Exception base class.
	/// </summary>
	[Theory]
	[InlineData(typeof(InvoiceOrchestrationValidationException))]
	[InlineData(typeof(InvoiceOrchestrationDependencyException))]
	[InlineData(typeof(InvoiceOrchestrationDependencyValidationException))]
	[InlineData(typeof(InvoiceOrchestrationServiceException))]
	public void OrchestrationExceptions_InheritFromException_TypeVerification(Type exceptionType)
	{
		// Assert
		Assert.True(typeof(Exception).IsAssignableFrom(exceptionType));
	}

	/// <summary>
	/// Verifies all processing exceptions inherit from Exception base class.
	/// </summary>
	[Theory]
	[InlineData(typeof(InvoiceProcessingServiceValidationException))]
	[InlineData(typeof(InvoiceProcessingServiceDependencyException))]
	[InlineData(typeof(InvoiceProcessingServiceDependencyValidationException))]
	[InlineData(typeof(InvoiceProcessingServiceException))]
	public void ProcessingExceptions_InheritFromException_TypeVerification(Type exceptionType)
	{
		// Assert
		Assert.True(typeof(Exception).IsAssignableFrom(exceptionType));
	}

	/// <summary>
	/// Verifies all invoice exceptions have the Serializable attribute.
	/// </summary>
	[Theory]
	[InlineData(typeof(InvoiceIdNotSetException))]
	[InlineData(typeof(InvoiceDescriptionNotSetException))]
	[InlineData(typeof(InvoicePaymentInformationNotCorrectException))]
	[InlineData(typeof(InvoicePhotoLocationNotCorrectException))]
	[InlineData(typeof(InvoiceTimeInformationNotCorrectException))]
	[InlineData(typeof(InvoiceFoundationValidationException))]
	[InlineData(typeof(InvoiceFoundationDependencyException))]
	[InlineData(typeof(InvoiceFoundationDependencyValidationException))]
	[InlineData(typeof(InvoiceFoundationServiceException))]
	[InlineData(typeof(InvoiceOrchestrationValidationException))]
	[InlineData(typeof(InvoiceOrchestrationDependencyException))]
	[InlineData(typeof(InvoiceOrchestrationDependencyValidationException))]
	[InlineData(typeof(InvoiceOrchestrationServiceException))]
	[InlineData(typeof(InvoiceProcessingServiceValidationException))]
	[InlineData(typeof(InvoiceProcessingServiceDependencyException))]
	[InlineData(typeof(InvoiceProcessingServiceDependencyValidationException))]
	[InlineData(typeof(InvoiceProcessingServiceException))]
	public void AllExceptions_HaveSerializableAttribute_AttributeVerification(Type exceptionType)
	{
		// Assert
		Assert.True(Attribute.IsDefined(exceptionType, typeof(SerializableAttribute)));
	}

	#endregion

	#region Exception Chaining Tests

	/// <summary>
	/// Verifies full exception chain from Processing to Foundation layers.
	/// </summary>
	[Fact]
	public void ExceptionChain_ProcessingToFoundation_PreservesFullChain()
	{
		// Arrange
		var rootCause = new ArgumentException("Invalid argument");
		var innerException = new InvoiceIdNotSetException(rootCause);
		var foundationException = new InvoiceFoundationValidationException(innerException);
		var orchestrationException = new InvoiceOrchestrationValidationException(foundationException);

		// Act
		var processingException = new InvoiceProcessingServiceValidationException(orchestrationException);

		// Assert
		Assert.NotNull(processingException.InnerException);
		Assert.IsType<InvoiceOrchestrationValidationException>(processingException.InnerException);

		var orchestration = processingException.InnerException;
		Assert.NotNull(orchestration.InnerException);
		Assert.IsType<InvoiceFoundationValidationException>(orchestration.InnerException);

		var foundation = orchestration.InnerException;
		Assert.NotNull(foundation.InnerException);
		Assert.IsType<InvoiceIdNotSetException>(foundation.InnerException);

		var inner = foundation.InnerException;
		Assert.NotNull(inner.InnerException);
		Assert.IsType<ArgumentException>(inner.InnerException);
	}

	/// <summary>
	/// Verifies dependency exception chain preservation.
	/// </summary>
	[Fact]
	public void DependencyExceptionChain_ProcessingToFoundation_PreservesFullChain()
	{
		// Arrange
		var dbException = new InvalidOperationException("Database connection failed");
		var foundationException = new InvoiceFoundationDependencyException(dbException);
		var orchestrationException = new InvoiceOrchestrationDependencyException(foundationException);

		// Act
		var processingException = new InvoiceProcessingServiceDependencyException(orchestrationException);

		// Assert
		Assert.NotNull(processingException.InnerException);
		Assert.IsType<InvoiceOrchestrationDependencyException>(processingException.InnerException);

		var orchestration = processingException.InnerException;
		Assert.NotNull(orchestration.InnerException);
		Assert.IsType<InvoiceFoundationDependencyException>(orchestration.InnerException);

		var foundation = orchestration.InnerException;
		Assert.NotNull(foundation.InnerException);
		Assert.IsType<InvalidOperationException>(foundation.InnerException);
	}

	#endregion
}
