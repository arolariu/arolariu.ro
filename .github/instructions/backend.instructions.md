---
description: "DDD and .NET architecture guidelines following The Standard pattern"
applyTo: '**/*.cs,**/*.csproj,**/Program.cs,**/appsettings.json'
---

# Backend Architecture Guidelines

You are an AI assistant specialized in Domain-Driven Design (DDD), The Standard architecture pattern, SOLID principles, and .NET 10.0 development for the arolariu.ro backend API. Follow these guidelines for building robust, maintainable systems.

---

## 📚 Essential Context

**Before implementing any backend code, consult these resources:**

| Resource | Location | Purpose |
|----------|----------|---------|
| RFC 2001 | `docs/rfc/2001-domain-driven-design-architecture.md` | DDD patterns, bounded contexts, aggregates |
| RFC 2002 | `docs/rfc/2002-opentelemetry-backend-observability.md` | OpenTelemetry implementation |
| RFC 2003 | `docs/rfc/2003-the-standard-implementation.md` | The Standard layered architecture |
| RFC 2004 | `docs/rfc/2004-comprehensive-xml-documentation-standard.md` | XML documentation standards |
| Backend Docs | `docs/backend/README.md` | Domain-specific implementation details |

---

## 🏗️ Technology Stack

| Category | Technology | Version |
|----------|------------|---------|
| **Framework** | .NET | 10.0 (net10.0) |
| **Language** | C# | Latest (13+) |
| **Architecture** | Modular Monolith | The Standard + DDD |
| **Primary Database** | Azure Cosmos DB | EF Core Cosmos Provider |
| **Auth Database** | Azure SQL Server | EF Core SQL Provider |
| **Authentication** | ASP.NET Identity + JWT Bearer | - |
| **Observability** | OpenTelemetry | 1.14.0+ |
| **AI Services** | Azure OpenAI, Document Intelligence | - |
| **Testing** | xUnit, MSTest, Moq | - |

---

## 📁 Project Structure

```
sites/api.arolariu.ro/
├── Directory.Build.props          # Central build configuration
├── Directory.Packages.props       # Central package version management
├── src/
│   ├── Core/                      # Entry point & General Domain
│   │   ├── Program.cs             # Application bootstrapper
│   │   ├── appsettings.*.json     # Environment configuration
│   │   └── Domain/General/
│   │       ├── Extensions/        # WebApplicationBuilder/WebApplication extensions
│   │       ├── Middlewares/       # SecurityHeadersMiddleware
│   │       └── Services/          # SwaggerConfigurationService
│   │
│   ├── Common/                    # Shared Library
│   │   ├── DDD/
│   │   │   ├── Contracts/         # BaseEntity, NamedEntity, IAuditable
│   │   │   └── ValueObjects/      # Shared value objects
│   │   ├── Options/               # Configuration management
│   │   ├── Services/              # KeyVaultService
│   │   ├── Telemetry/             # OTel Logging, Metering, Tracing
│   │   └── Validators/            # Shared validation logic
│   │
│   ├── Core.Auth/                 # Auth Bounded Context
│   │   ├── Brokers/               # AuthDbContext
│   │   ├── Endpoints/             # Auth API endpoints
│   │   ├── Models/                # AuthenticatedUser
│   │   └── Modules/               # DI extensions
│   │
│   └── Invoices/                  # Invoices Bounded Context
│       ├── DDD/
│       │   ├── AggregatorRoots/   # Invoice aggregate
│       │   ├── Entities/          # Merchant entity
│       │   └── ValueObjects/      # Product, Recipe, PaymentInfo, Allergen
│       ├── Brokers/
│       │   ├── DatabaseBroker/    # InvoiceNoSqlBroker (Cosmos)
│       │   └── AnalysisBrokers/   # OpenAI, FormRecognizer, Translator
│       ├── Services/
│       │   ├── Foundation/        # CRUD + validation
│       │   ├── Orchestration/     # Service coordination
│       │   └── Processing/        # Complex transformations
│       ├── Endpoints/             # REST API endpoints
│       ├── DTOs/
│       │   ├── Requests/          # Input DTOs
│       │   └── Responses/         # Output DTOs
│       ├── Modules/               # DI extensions
│       └── Telemetry/             # Domain-specific tracing
│
└── tests/
    ├── arolariu.Backend.Core.Tests/
    │   ├── Common/                # Common library tests
    │   ├── CoreAuth/              # Auth tests
    │   └── Shared/                # Test utilities
    └── arolariu.Backend.Domain.Tests/
        ├── Builders/              # Test data builders
        └── Invoices/              # Invoice domain tests
```

---

## 🔄 The Standard Architecture

The backend follows **The Standard** layered architecture (see RFC 2003):

```
┌─────────────────────────────────────────────────────────┐
│                    Endpoints (Exposers)                  │  ← REST API / Protocol Mapping
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│               Processing Services                        │  ← Complex transformations, batch ops
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│              Orchestration Services                      │  ← Service coordination
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│               Foundation Services                        │  ← CRUD + validation
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                      Brokers                             │  ← External dependency abstraction
└─────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

| Layer | Purpose | Dependencies | Example |
|-------|---------|--------------|---------|
| **Brokers** | Thin abstractions over external dependencies (DB, APIs) | None | `IInvoiceNoSqlBroker` |
| **Foundation** | CRUD operations + domain validation | 1-2 Brokers | `IInvoiceStorageFoundationService` |
| **Orchestration** | Coordinate multiple foundation services | 2-3 Foundation services | `IInvoiceOrchestrationService` |
| **Processing** | Heavy computation, batch operations, enrichment | 1-2 Orchestration services | `IInvoiceProcessingService` |
| **Endpoints** | HTTP protocol mapping, request/response handling | 1 Processing service | Minimal API endpoints |

### Florance Pattern

**Maximum 2-3 dependencies per service.** If more are needed, create an intermediate orchestration layer.

```csharp
// ✅ Correct: 2 dependencies
public class InvoiceStorageFoundationService(
    IInvoiceNoSqlBroker invoiceNoSqlBroker,
    ILoggingBroker loggingBroker)

// ❌ Wrong: Too many dependencies
public class InvoiceService(
    IInvoiceNoSqlBroker broker1,
    IMerchantBroker broker2,
    IAnalysisBroker broker3,
    ITranslatorBroker broker4,
    ILoggingBroker broker5) // Violates Florance Pattern
```

---

## 📐 DDD Patterns Implementation

### Bounded Contexts

| Context | Project | Responsibility |
|---------|---------|---------------|
| **General** | `arolariu.Backend.Core` | Infrastructure, middleware, cross-cutting concerns |
| **Invoices** | `arolariu.Backend.Domain.Invoices` | Invoice lifecycle, merchants, AI analysis |
| **Auth** | `arolariu.Backend.Core.Auth` | Authentication, authorization, identity |

### Base Entity Contracts

```csharp
// From Common/DDD/Contracts/
public abstract class BaseEntity<T> : IAuditable
{
    public abstract required T id { get; init; }
    
    // Audit properties
    public DateTime CreatedAt { get; set; }
    public string CreatedBy { get; set; }
    public DateTime LastUpdatedAt { get; set; }
    public string LastUpdatedBy { get; set; }
    
    // Lifecycle
    public bool IsSoftDeleted { get; set; }
    public bool IsImportant { get; set; }
    public int NumberOfUpdates { get; set; }
}

public abstract class NamedEntity<T> : BaseEntity<T>
{
    public string Name { get; set; }
    public string Description { get; set; }
}
```

### Aggregate Example

```csharp
// Invoice Aggregate Root
public sealed class Invoice : NamedEntity<Guid>
{
    public required override Guid id { get; init; }
    public Guid UserIdentifier { get; set; }
    public Merchant Merchant { get; set; }
    public ICollection<Product> Items { get; set; }
    public PaymentInformation PaymentInformation { get; set; }
    
    // Merge semantics for partial updates
    public Invoice MergeWith(Invoice other) { ... }
}
```

### Value Objects

Located in `{Domain}/DDD/ValueObjects/`:

- `Product` - Line item with quantity, price, category
- `PaymentInformation` - Payment method, currency, totals
- `Recipe` - Cooking instructions (AI-generated)
- `Allergen` - Allergy information
- `Merchant` - Store/vendor information

---

## 🔧 Service Implementation Patterns

### Service Interface Pattern

```csharp
// Foundation Service Interface
public interface IInvoiceStorageFoundationService
{
    Task CreateInvoiceObject(Invoice invoice, Guid? userIdentifier = null);
    Task<Invoice> ReadInvoiceObject(Guid identifier, Guid? userIdentifier = null);
    Task<Invoice> UpdateInvoiceObject(Invoice updatedInvoice, Guid invoiceIdentifier, Guid? userIdentifier = null);
    Task DeleteInvoiceObject(Guid identifier, Guid? userIdentifier = null);
}

// Orchestration Service Interface
public interface IInvoiceOrchestrationService
{
    Task AnalyzeInvoiceWithOptions(AnalysisOptions options, Guid invoiceIdentifier, Guid? userIdentifier = null);
    Task<Invoice> CreateInvoiceObject(Invoice invoice, Guid? userIdentifier = null);
}

// Processing Service Interface
public interface IInvoiceProcessingService
{
    Task AnalyzeInvoice(AnalysisOptions options, Guid identifier, Guid? userIdentifier = null);
    Task CreateInvoice(Invoice invoice, Guid? userIdentifier = null);
    Task<IEnumerable<Invoice>> ReadInvoices(Guid userIdentifier);
    Task DeleteInvoices(Guid userIdentifier); // Batch operation
}
```

### Partial Classes for Separation of Concerns

```csharp
// Main implementation
InvoiceStorageFoundationService.cs

// Exception handling
InvoiceStorageFoundationService.Exceptions.cs

// Validation logic
InvoiceStorageFoundationService.Validations.cs
```

### TryCatch Pattern with Activity Tracing

```csharp
public async Task CreateInvoiceObject(Invoice invoice, Guid? userIdentifier = null) =>
    await TryCatchAsync(async () =>
    {
        using var activity = InvoicePackageTracing.StartActivity(nameof(CreateInvoiceObject));
        ValidateInvoiceInformationIsValid(invoice);
        await invoiceNoSqlBroker.CreateInvoiceAsync(invoice).ConfigureAwait(false);
    }).ConfigureAwait(false);
```

---

## 🚀 Program.cs Bootstrap Pattern

```csharp
[ExcludeFromCodeCoverage]
internal static class Program
{
    public static void Main(string[] args)
    {
        WebApplicationBuilder builder = WebApplication.CreateBuilder(args);
        
        // Phase 1: Builder configuration (services)
        builder.AddGeneralDomainConfiguration();    // Cross-cutting concerns
        builder.AddInvoicesDomainConfiguration();   // Invoices domain services
        
        WebApplication app = builder.Build();
        
        // Phase 2: Application configuration (middleware)
        app.AddGeneralApplicationConfiguration();   // Pipeline setup
        app.AddInvoiceDomainConfiguration();        // Endpoint mapping
        
        app.Run();
    }
}
```

### Extension Methods Pattern

**Builder Extensions** (in `{Domain}/Extensions/` or `{Domain}/Modules/`):

```csharp
public static class InvoicesDomainExtensions
{
    public static WebApplicationBuilder AddInvoicesDomainConfiguration(
        this WebApplicationBuilder builder)
    {
        // Register brokers
        builder.Services.AddScoped<IInvoiceNoSqlBroker, InvoiceNoSqlBroker>();
        
        // Register foundation services
        builder.Services.AddScoped<IInvoiceStorageFoundationService, InvoiceStorageFoundationService>();
        
        // Register orchestration services
        builder.Services.AddScoped<IInvoiceOrchestrationService, InvoiceOrchestrationService>();
        
        // Register processing services
        builder.Services.AddScoped<IInvoiceProcessingService, InvoiceProcessingService>();
        
        return builder;
    }
    
    public static WebApplication AddInvoiceDomainConfiguration(this WebApplication app)
    {
        // Map endpoints
        app.MapInvoiceEndpoints();
        app.MapMerchantEndpoints();
        
        return app;
    }
}
```

---

## 📝 Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| **Projects** | `arolariu.Backend.{Domain}` | `arolariu.Backend.Domain.Invoices` |
| **Namespaces** | Match folder structure | `arolariu.Backend.Domain.Invoices.Services.Foundation` |
| **Interfaces** | `I` prefix | `IInvoiceStorageFoundationService` |
| **Services** | `{Entity}{Layer}Service` | `InvoiceOrchestrationService` |
| **Brokers** | `{Provider}{Type}Broker` | `InvoiceNoSqlBroker`, `OpenAiAnalysisBroker` |
| **Extensions** | `{Domain}Extensions` | `GeneralDomainExtensions` |
| **DTOs** | `{Action}{Entity}Request/Response` | `CreateInvoiceRequest` |
| **Exceptions** | `{Type}Exception` | `InvoiceValidationException` |

### Business Language Mapping (The Standard)

| Technical Term | Business Term |
|----------------|---------------|
| Insert | Add / Create |
| Select | Retrieve / Read |
| Update | Modify |
| Delete | Remove |

---

## 🔒 Security Implementation

### Authentication (JWT Bearer)

```csharp
services.AddAuthentication(authOptions =>
{
    authOptions.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    authOptions.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
}).AddJwtBearer(jwtOptions =>
{
    jwtOptions.TokenValidationParameters = new()
    {
        ValidIssuer = authOptions["Issuer"],
        ValidAudience = authOptions["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(...),
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
    };
});
```

### Password Policy

- Minimum **16 characters**
- Requires: uppercase, lowercase, digit, non-alphanumeric
- Lockout after **5 failed attempts** (5-minute window)

### Security Headers Middleware

All responses include:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy` (production)
- `Strict-Transport-Security` (production)

---

## 📊 Observability (OpenTelemetry)

### Activity Sources

```csharp
public static class ActivityGenerators
{
    public static readonly ActivitySource CommonPackageTracing = new("arolariu.Backend.Common");
    public static readonly ActivitySource CorePackageTracing = new("arolariu.Backend.Core");
    public static readonly ActivitySource AuthPackageTracing = new("arolariu.Backend.Auth");
    public static readonly ActivitySource InvoicePackageTracing = new("arolariu.Backend.Domain.Invoices");
}
```

### Span Creation Pattern

```csharp
public async Task<Invoice> ReadInvoiceObject(Guid identifier, Guid? userIdentifier = null)
{
    using var activity = InvoicePackageTracing.StartActivity(nameof(ReadInvoiceObject));
    activity?.SetTag("invoice.id", identifier.ToString());
    activity?.SetTag("user.id", userIdentifier?.ToString() ?? "anonymous");
    
    // Implementation
}
```

### Three Pillars

| Pillar | Extension | Exporter |
|--------|-----------|----------|
| Logging | `LoggingExtensions.cs` | Azure Monitor + Console |
| Tracing | `TracingExtensions.cs` | Azure Monitor |
| Metrics | `MeteringExtensions.cs` | Azure Monitor |

### Health Checks

Endpoint: `/health`

- Azure Key Vault connectivity
- Azure Cosmos DB connectivity
- Azure SQL Server connectivity
- Azure Blob Storage connectivity

---

## 📖 XML Documentation Standard

**All public APIs must have comprehensive XML documentation** (see RFC 2004):

```csharp
/// <summary>
/// Represents the invoice aggregate root controlling line items, merchant linkage,
/// and analysis metadata within the Invoices bounded context.
/// </summary>
/// <remarks>
/// <para>
/// This aggregate encapsulates the canonical mutable state of an invoice from
/// initial photo upload through OCR analysis and item categorization.
/// </para>
/// <para><b>Soft Delete Lifecycle:</b> When soft-deleted at the storage layer,
/// <c>IsSoftDeleted</c> is set to <c>true</c> rather than physically removing the row.</para>
/// <para><b>Thread-safety:</b> Not thread-safe. Do not share instances across threads.</para>
/// </remarks>
/// <seealso cref="NamedEntity{T}"/>
/// <seealso cref="Merchant"/>
public sealed class Invoice : NamedEntity<Guid> { }
```

**Required Elements:**
- `<summary>` - Brief description
- `<remarks>` with `<para>` sections - Detailed explanation
- `<param>` - Parameter descriptions
- `<returns>` - Return value description
- `<exception>` - Thrown exceptions
- `<example>` - Usage examples (where applicable)
- `<seealso>` - Related references

---

## 🧪 Testing Standards

### Test Project Structure

```
tests/
├── arolariu.Backend.Core.Tests/
│   ├── Common/           # Common library tests
│   ├── CoreAuth/         # Auth tests
│   └── Shared/           # MocksContainer, test utilities
└── arolariu.Backend.Domain.Tests/
    ├── Builders/         # Test data builders
    └── Invoices/
        ├── Brokers/      # Broker tests
        └── Services/
            └── Orchestration/  # Service tests
```

### Test Naming Convention

Pattern: `MethodName_Condition_ExpectedResult`

```csharp
[Fact]
public void Constructor_NullAnalysisService_ThrowsArgumentNullException()
{
    // Arrange
    IInvoiceAnalysisOrchestrationService? nullService = null;
    
    // Act & Assert
    Assert.Throws<ArgumentNullException>(() => 
        new InvoiceProcessingService(nullService!));
}

[Fact]
public async Task AnalyzeInvoiceWithOptions_ValidInput_ExecutesCompleteWorkflow()
{
    // Arrange
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var options = new AnalysisOptions { PerformOcr = true };
    
    // Act
    await _service.AnalyzeInvoiceWithOptions(options, invoice.id);
    
    // Assert
    _mockBroker.Verify(b => b.AnalyzeAsync(It.IsAny<Invoice>()), Times.Once);
}
```

### Test Data Builders

```csharp
// Builders/InvoiceBuilder.cs
public static class InvoiceBuilder
{
    public static Invoice CreateRandomInvoice() => new()
    {
        id = Guid.CreateVersion7(),
        UserIdentifier = Guid.NewGuid(),
        Name = $"INV-{Random.Shared.Next(1000, 9999)}",
        // ... additional properties
    };
}
```

### Frameworks Used

| Package | Purpose |
|---------|---------|
| `xunit` | Primary test framework |
| `MSTest` | Alternative framework |
| `Moq` | Mocking |
| `coverlet.collector` | Code coverage |
| `Microsoft.EntityFrameworkCore.InMemory` | In-memory database testing |
| `Microsoft.AspNetCore.Mvc.Testing` | Integration tests |

---

## ⚙️ Build Configuration

### Central Package Management

All package versions managed in `Directory.Packages.props`:

```xml
<!-- Individual .csproj files reference without version -->
<PackageReference Include="Microsoft.EntityFrameworkCore.Cosmos" />
```

### Build Settings (`Directory.Build.props`)

```xml
<PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <LangVersion>latest</LangVersion>
    <Nullable>enable</Nullable>
    <ImplicitUsings>disable</ImplicitUsings>
    <GenerateDocumentationFile>True</GenerateDocumentationFile>
    <TreatWarningsAsErrors>True</TreatWarningsAsErrors>
    <WarningLevel>9999</WarningLevel>
</PropertyGroup>
```

### AOT/Trimming Support

| Project Type | IsTrimmable | IsAotCompatible |
|--------------|-------------|-----------------|
| Libraries | `True` | `True` |
| Web Projects | `False` | `False` |
| Test Projects | `False` | `False` |

---

## 🔑 Configuration & Secrets

### Azure Key Vault Integration

```csharp
builder.Configuration.AddAzureKeyVault(
    new Uri(keyVaultEndpoint),
    new DefaultAzureCredential(),
    new AzureKeyVaultConfigurationOptions
    {
        ReloadInterval = TimeSpan.FromMinutes(30)
    });
```

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `AROLARIU_INFRASTRUCTURE` | Infrastructure mode (`azure`/`local`) |
| `AZURE_CLIENT_ID` | Managed Identity client ID |
| `ASPNETCORE_ENVIRONMENT` | Environment name |

---

## 💡 Modern C# Features to Use

```csharp
// required keyword for required properties
public required Guid id { get; init; }

// Primary constructors (C# 12+)
public class InvoiceService(IInvoiceNoSqlBroker broker) : IInvoiceService
{
    public async Task<Invoice> Get(Guid id) => await broker.ReadAsync(id);
}

// Collection expressions (C# 12+)
List<string> items = [item1, item2, item3];

// Pattern matching
var result = invoice.Status switch
{
    InvoiceStatus.Draft => ProcessDraft(invoice),
    InvoiceStatus.Submitted => ProcessSubmitted(invoice),
    _ => throw new InvalidOperationException()
};

// File-scoped types
file class InternalHelper { }

// ConfigureAwait(false) for library code
await broker.ReadAsync(id).ConfigureAwait(false);
```

---

## ✅ Implementation Checklist

Before delivering any code, verify:

### Architecture
- [ ] Service follows The Standard layer hierarchy
- [ ] Maximum 2-3 dependencies (Florance Pattern)
- [ ] Interface-driven design (DIP)
- [ ] Proper separation of concerns

### DDD
- [ ] Aggregates encapsulate business rules
- [ ] Value objects are immutable
- [ ] Ubiquitous language used consistently
- [ ] Bounded context boundaries respected

### Quality
- [ ] XML documentation on all public APIs
- [ ] Tests follow `MethodName_Condition_ExpectedResult` pattern
- [ ] `ConfigureAwait(false)` used in library code
- [ ] Activity tracing added for observability
- [ ] No warnings (TreatWarningsAsErrors enabled)

### Security
- [ ] Input validation at service boundaries
- [ ] Authorization checks implemented
- [ ] Sensitive data not logged
- [ ] Security headers configured

---

## 📋 Quick Reference Commands

```powershell
# Build
dotnet build sites/api.arolariu.ro/src/Core

# Test
dotnet test sites/api.arolariu.ro/tests

# Run
dotnet run --project sites/api.arolariu.ro/src/Core

# Watch
dotnet watch --project sites/api.arolariu.ro/src/Core
```

---

## 🔗 Related Resources

- **RFC 2001**: Domain-Driven Design Architecture
- **RFC 2002**: OpenTelemetry Backend Observability
- **RFC 2003**: The Standard Implementation
- **RFC 2004**: XML Documentation Standard
- **The Standard**: https://github.com/hassanhabib/The-Standard
