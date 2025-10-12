# RFC 2001: Domain-Driven Design Architecture

- **Status**: Implemented
- **Date**: 2025-10-12
- **Authors**: Alexandru-Razvan Olariu
- **Related Components**: `sites/api.arolariu.ro`, all backend domains

---

## Abstract

This RFC documents the Domain-Driven Design (DDD) architecture and SOLID principles implementation in the arolariu.ro backend API. The backend is structured as a modular monolith built with .NET 10.0, featuring three primary domains (General, Invoices, and Auth) that follow DDD patterns including aggregates, value objects, domain events, and repositories.

---

## 1. Motivation

### 1.1 Problem Statement

Traditional layered architectures often lead to:
1. **Anemic Domain Models**: Business logic scattered across service layers
2. **Poor Modularity**: Tight coupling between components making changes risky
3. **Inconsistent Terminology**: Disconnect between business language and code
4. **Limited Scalability**: Difficulty in evolving system as complexity grows

### 1.2 Design Goals

- **Ubiquitous Language**: Consistent business terminology across code and documentation
- **Rich Domain Models**: Business logic encapsulated within domain entities
- **Clear Boundaries**: Well-defined bounded contexts for each domain
- **Maintainability**: Modular design following SOLID principles
- **Testability**: High code coverage (85%+) with clear test boundaries

---

## 2. Technical Design

### 2.1 Architecture Overview

```
arolariu.Backend (Modular Monolith)
├── Core/                   # Application entry point
│   ├── Program.cs         # Bootstrap and configuration
│   └── Domain/
│       └── General/       # Infrastructure domain
├── Core.Auth/             # Authentication domain
│   ├── Domain/
│   ├── Application/
│   └── Infrastructure/
├── Invoices/              # Business domain
│   ├── Domain/
│   │   ├── Aggregates/
│   │   ├── ValueObjects/
│   │   ├── Events/
│   │   └── Services/
│   ├── Application/
│   └── Infrastructure/
└── Common/                # Shared infrastructure
    ├── Entities/
    └── Services/
```

### 2.2 Domain Organization

#### 2.2.1 General Domain (Infrastructure)

**Responsibilities:**
- Application bootstrapping and configuration
- Cross-cutting concerns (logging, telemetry, health checks)
- OpenAPI/Swagger documentation
- Middleware pipeline setup
- CORS and security policies

**Key Components:**
- `GeneralDomainExtensions.cs`: Service registration
- `SwaggerConfigurationService.cs`: API documentation setup
- `SwaggerFilterService.cs`: OpenAPI document filtering

**Technology Stack:**
- .NET 10.0 (Current)
- ASP.NET Core Minimal APIs
- OpenTelemetry for observability
- Swashbuckle for OpenAPI generation

#### 2.2.2 Invoices Domain (Business Logic)

**Responsibilities:**
- Invoice lifecycle management (CRUD)
- Merchant relationship management
- Product and line item handling
- Business rule validation
- Domain event publishing

**Aggregates:**
```csharp
// Invoice Aggregate (Root)
public class Invoice : BaseEntity<Guid>, NamedEntity<Guid>
{
    public Guid MerchantId { get; private set; }
    public DateTime InvoiceDate { get; private set; }
    public decimal TotalAmount { get; private set; }
    public Currency Currency { get; private set; }
    public IReadOnlyList<Product> Products { get; private set; }
    
    // Business logic methods
    public void AddProduct(Product product) { /* ... */ }
    public void UpdateMerchant(Guid merchantId) { /* ... */ }
    public void CalculateTotal() { /* ... */ }
}

// Merchant Aggregate
public class Merchant : BaseEntity<Guid>, NamedEntity<Guid>
{
    public string LegalName { get; private set; }
    public TaxIdentifier TaxId { get; private set; }
    public Address RegisteredAddress { get; private set; }
}

// Product (Entity within Invoice aggregate)
public class Product : BaseEntity<Guid>
{
    public string Name { get; private set; }
    public decimal UnitPrice { get; private set; }
    public int Quantity { get; private set; }
    public ProductCategory Category { get; private set; }
}
```

**Value Objects:**
```csharp
public record Currency(string Code, string Symbol)
{
    public static Currency RON = new("RON", "lei");
    public static Currency EUR = new("EUR", "€");
    public static Currency USD = new("USD", "$");
}

public record TaxIdentifier(string Value, TaxIdType Type);

public record Address(
    string Street,
    string City,
    string PostalCode,
    string Country
);
```

**Domain Events:**
```csharp
public record InvoiceCreatedEvent(
    Guid InvoiceId,
    Guid MerchantId,
    DateTime CreatedAt
) : IDomainEvent;

public record InvoiceUpdatedEvent(
    Guid InvoiceId,
    DateTime UpdatedAt
) : IDomainEvent;

public record ProductAddedEvent(
    Guid InvoiceId,
    Guid ProductId,
    DateTime AddedAt
) : IDomainEvent;
```

#### 2.2.3 Authentication Domain (Core.Auth)

**Responsibilities:**
- User authentication
- JWT token validation
- Authorization policies
- External identity provider integration

**Key Components:**
- Authentication middleware
- JWT token handlers
- Authorization policy providers
- User identity services

### 2.3 SOLID Principles Implementation

#### 2.3.1 Single Responsibility Principle (SRP)

Each class has one reason to change:
- **Domain entities**: Manage their own state and business rules
- **Repositories**: Handle persistence only
- **Application services**: Orchestrate domain operations
- **Domain services**: Encapsulate complex business logic

#### 2.3.2 Open/Closed Principle (OCP)

Extension through:
- Domain event handlers (add new handlers without modifying existing)
- Policy-based authorization (add new policies without changing core)
- Strategy pattern for business rules

#### 2.3.3 Liskov Substitution Principle (LSP)

```csharp
// Base entity interface
public interface BaseEntity<T>
{
    T Id { get; }
}

// Named entity extends base
public interface NamedEntity<T> : BaseEntity<T>
{
    string Name { get; }
}

// All entities are substitutable
public class Invoice : NamedEntity<Guid> { }
public class Merchant : NamedEntity<Guid> { }
```

#### 2.3.4 Interface Segregation Principle (ISP)

Focused interfaces:
```csharp
// Separate concerns
public interface IInvoiceRepository
{
    Task<Invoice?> GetByIdAsync(Guid id);
    Task<IEnumerable<Invoice>> GetAllAsync();
    Task AddAsync(Invoice invoice);
}

public interface IInvoiceQueryService
{
    Task<IEnumerable<Invoice>> SearchAsync(InvoiceSearchCriteria criteria);
}
```

#### 2.3.5 Dependency Inversion Principle (DIP)

All dependencies injected through abstractions:
```csharp
// Application service depends on abstractions
public class InvoiceApplicationService(
    IInvoiceRepository repository,
    IInvoiceDomainService domainService,
    IEventBus eventBus)
{
    // Implementation
}
```

---

## 3. Implementation Examples

### 3.1 Domain Service Bootstrap

```csharp
// Program.cs
internal static class Program
{
    public static void Main(string[] args)
    {
        WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

        // Configure domains
        builder.AddGeneralDomainConfiguration();
        builder.AddInvoicesDomainConfiguration();
        builder.AddAuthDomainConfiguration();

        WebApplication app = builder.Build();

        // Configure middleware pipeline
        app.AddGeneralApplicationConfiguration();
        app.AddInvoiceDomainConfiguration();
        app.AddAuthDomainConfiguration();

        app.Run();
    }
}
```

### 3.2 Domain Configuration Extension

```csharp
// GeneralDomainExtensions.cs
public static class GeneralDomainExtensions
{
    public static WebApplicationBuilder AddGeneralDomainConfiguration(
        this WebApplicationBuilder builder)
    {
        // Register logging
        builder.Services.AddLogging();
        
        // Register telemetry
        builder.Services.AddOpenTelemetry();
        
        // Register health checks
        builder.Services.AddHealthChecks();
        
        // Register Swagger
        builder.Services.AddSwaggerGen(
            SwaggerConfigurationService.GetSwaggerGenOptions());
        
        return builder;
    }

    public static WebApplication AddGeneralApplicationConfiguration(
        this WebApplication app)
    {
        // Configure middleware
        app.UseRouting();
        app.UseCors();
        app.UseAuthentication();
        app.UseAuthorization();
        
        // Configure Swagger
        app.UseSwagger(SwaggerConfigurationService.GetSwaggerOptions());
        app.UseSwaggerUI(SwaggerConfigurationService.GetSwaggerUIOptions());
        
        return app;
    }
}
```

### 3.3 Minimal API Endpoint

```csharp
// Invoice endpoints
public static void MapInvoiceEndpoints(this WebApplication app)
{
    var invoices = app.MapGroup("/api/invoices")
        .RequireAuthorization()
        .WithTags("Invoices");

    invoices.MapGet("/{id:guid}", async (
        Guid id,
        IInvoiceRepository repository) =>
    {
        var invoice = await repository.GetByIdAsync(id);
        return invoice is not null 
            ? Results.Ok(invoice) 
            : Results.NotFound();
    })
    .WithName("GetInvoice")
    .Produces<Invoice>(StatusCodes.Status200OK)
    .Produces(StatusCodes.Status404NotFound);

    invoices.MapPost("/", async (
        CreateInvoiceRequest request,
        IInvoiceApplicationService service) =>
    {
        var invoice = await service.CreateInvoiceAsync(request);
        return Results.Created($"/api/invoices/{invoice.Id}", invoice);
    })
    .WithName("CreateInvoice")
    .Produces<Invoice>(StatusCodes.Status201Created)
    .ProducesValidationProblem();
}
```

---

## 4. Trade-offs and Alternatives

### 4.1 Considered Alternatives

**Alternative 1: Microservices Architecture**
- **Pros**: Better scalability, independent deployment
- **Cons**: Increased complexity, distributed transaction challenges, operational overhead
- **Reason for rejection**: Current scale doesn't justify complexity

**Alternative 2: Traditional Layered Architecture**
- **Pros**: Simple, familiar pattern
- **Cons**: Anemic domain models, poor maintainability
- **Reason for rejection**: Doesn't support rich business logic

**Alternative 3: CQRS + Event Sourcing**
- **Pros**: Excellent scalability, complete audit trail
- **Cons**: High complexity, steep learning curve
- **Reason for rejection**: Overkill for current requirements

### 4.2 Trade-offs

**Pros:**
- ✅ Clear domain boundaries
- ✅ Rich business logic in domain layer
- ✅ Excellent testability
- ✅ Easy to understand and maintain
- ✅ Scalable to distributed architecture if needed

**Cons:**
- ❌ More upfront design effort required
- ❌ Learning curve for team members new to DDD
- ❌ More boilerplate code initially

---

## 5. Testing Strategy

### 5.1 Test Naming Convention

All tests follow: `MethodName_Condition_ExpectedResult()`

```csharp
[Fact(DisplayName = "Invoice creation succeeds with valid data")]
public void CreateInvoice_WithValidData_ReturnsSuccessResult()
{
    // Arrange
    var merchant = CreateTestMerchant();
    var products = CreateTestProducts();
    
    // Act
    var invoice = Invoice.Create(merchant.Id, products);
    
    // Assert
    Assert.NotNull(invoice);
    Assert.Equal(merchant.Id, invoice.MerchantId);
    Assert.Equal(products.Count, invoice.Products.Count);
}

[Fact(DisplayName = "Invoice creation fails with empty products")]
public void CreateInvoice_WithEmptyProducts_ThrowsArgumentException()
{
    // Arrange
    var merchantId = Guid.NewGuid();
    var emptyProducts = new List<Product>();
    
    // Act & Assert
    Assert.Throws<ArgumentException>(() => 
        Invoice.Create(merchantId, emptyProducts));
}
```

### 5.2 Test Coverage Requirements

- **Domain Layer**: 85%+ coverage
- **Application Layer**: 85%+ coverage
- **Infrastructure Layer**: Optional (focus on integration tests)

---

## 6. Documentation Requirements

- [x] API documentation via XML comments
- [x] OpenAPI/Swagger specification
- [x] Domain model diagrams
- [x] Architecture decision records (this RFC)
- [x] Code quality guidelines (`.github/instructions/backend.instructions.md`)

---

## 7. References

### 7.1 Domain-Driven Design

- [Domain-Driven Design by Eric Evans](https://www.domainlanguage.com/ddd/)
- [Implementing Domain-Driven Design by Vaughn Vernon](https://vaughnvernon.com/)
- [Martin Fowler's DDD Articles](https://martinfowler.com/tags/domain%20driven%20design.html)

### 7.2 SOLID Principles

- [SOLID Principles on Wikipedia](https://en.wikipedia.org/wiki/SOLID)
- [Clean Code by Robert C. Martin](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882)

### 7.3 .NET Resources

- [.NET 10.0 Documentation](https://docs.microsoft.com/en-us/dotnet/)
- [ASP.NET Core Minimal APIs](https://docs.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis)
- [xUnit Testing](https://xunit.net/)

---

## 8. Future Enhancements

Potential future work:
- **RFC 1001**: Domain event bus and eventual consistency patterns
- **RFC 1002**: CQRS for read-heavy operations
- **RFC 1003**: Multi-tenancy support
- **RFC 1004**: Distributed tracing correlation with domain events
- **RFC 1005**: Background job processing for long-running operations

---

**Document Version**: 1.0.0
**Last Updated**: 2025-10-12
**Reviewed By**: Alexandru-Razvan Olariu
**Status**: ✅ Implemented
