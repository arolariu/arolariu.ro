# RFC 2003: The Standard Implementation in arolariu.ro Backend

- **Status**: Implemented
- **Date**: 2025-01-26
- **Authors**: Alexandru Olariu
- **Related Components**: `sites/api.arolariu.ro/src/Invoices`, `sites/api.arolariu.ro/src/Common`, `sites/api.arolariu.ro/tests`
- **References**: [The Standard by Hassan Habib](https://github.com/hassanhabib/The-Standard)

---

## Abstract

This RFC documents how the arolariu.ro backend (`api.arolariu.ro`) implements "The Standard" — Hassan Habib's comprehensive software engineering standard for building enterprise-grade systems. The Standard defines a layered architecture based on the Tri-Nature theory (Dependencies, Purpose, Exposure) with strict service segregation principles, business language mapping, and the Florance Pattern for dependency management.

Our .NET 10.0 modular monolith backend adheres to The Standard's architectural principles while integrating Domain-Driven Design (documented in RFC 2001) to create a robust, maintainable, and testable system for invoice management.

---

## Documentation Accuracy Note

If any example in this RFC diverges from the live implementation, source code in this repository is the source of truth and this RFC must be updated.

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [The Standard Overview](#the-standard-overview)
3. [Architecture Mapping](#architecture-mapping)
4. [Brokers Layer](#brokers-layer)
5. [Foundation Services](#foundation-services)
6. [Processing Services](#processing-services)
7. [Orchestration Services](#orchestration-services)
8. [Exposers Layer](#exposers-layer)
9. [Key Principles Implementation](#key-principles-implementation)
10. [Validation Strategy](#validation-strategy)
11. [Exception Classification](#exception-classification)
12. [Testing Approach](#testing-approach)
13. [Future Enhancements](#future-enhancements)
14. [Exception → HTTP Status Mapping Contract](#exception--http-status-mapping-contract)

---

## Problem Statement

Enterprise software systems require consistent architectural patterns to ensure:

- **Maintainability**: Clear separation of concerns across layers
- **Testability**: Isolated components that can be unit tested independently
- **Scalability**: Ability to grow complexity without architectural debt
- **Team Alignment**: Shared vocabulary and patterns across developers
- **Business Language Mapping**: Code that reflects domain terminology

The Standard provides a comprehensive framework addressing these concerns through strict layering, business language usage, and the Florance Pattern (2-3 dependencies maximum per service).

### Design Goals

1. **Strict Layering**: Implement all five service layers (Brokers → Foundation → Processing → Orchestration → Exposers)
2. **Business Language**: Map technical operations to domain terminology (Insert→Add, Select→Retrieve, Update→Modify, Delete→Remove)
3. **Florance Pattern**: Limit service dependencies to 2-3 maximum
4. **Validation at Every Layer**: Each service validates its own inputs
5. **Exception Classification**: Categorize failures as Validation, Dependency, or DependencyValidation exceptions
6. **Pure Contracting**: Interface-driven design for all services
7. **Flow-Forward Architecture**: No sideways or backward service calls
8. **Zero Business Logic in Brokers**: Brokers remain thin abstractions over external dependencies

---

## The Standard Overview

### Tri-Nature Theory

Every component in The Standard has three natures:

1. **Dependencies (Input)**: What the component relies on (brokers, services)
2. **Purpose (Processing)**: The component's core responsibility
3. **Exposure (Output)**: How the component exposes its functionality (interfaces, APIs)

### Service Layer Hierarchy

```plaintext
┌─────────────────────────────────────────┐
│          Exposers (Controllers)         │  ← HTTP/gRPC Protocol Mapping
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│      Orchestration/Coordination         │  ← Complex Multi-Entity Flows
│         Management Services             │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│        Processing Services              │  ← Higher-Order Business Logic
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│    Foundation Services (Broker-         │  ← Validation + CRUD Operations
│         Neighboring)                    │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         Brokers                         │  ← External Dependency Abstraction
│   (Database, APIs, Time, Logging)      │
└─────────────────────────────────────────┘
```

### Key Principles

- **Single Responsibility**: Each service has one clear purpose
- **Business Language**: Operations use domain terminology (not technical CRUD)
- **Florance Pattern**: Services have 2-3 dependencies maximum
- **Do or Delegate**: Services either perform work or delegate to dependencies
- **Pure Contracting**: All services implement interfaces
- **Validations at Every Layer**: Each layer validates its inputs independently

---

## Architecture Mapping

### arolariu.ro Backend Structure

```
sites/api.arolariu.ro/src/
├── Core/
│   └── Program.cs                           # Application Bootstrap
├── Common/
│   ├── DDD/                                 # Shared DDD Building Blocks
│   ├── Validators/                          # Validation Utilities
│   └── Telemetry/                           # OpenTelemetry (RFC 1001/2002)
└── Invoices/                                # Bounded Context (DDD)
    ├── Brokers/                             # ✓ Brokers Layer
    │   ├── DatabaseBroker/                  # Cosmos DB Abstraction
    │   ├── AnalysisBrokers/                 # AI/ML Service Abstraction
    │   └── TranslatorBroker/                # Translation Service Abstraction
    ├── Services/
    │   ├── Foundation/                      # ✓ Foundation Services
    │   │   ├── InvoiceStorage/              # Invoice CRUD + Validation
    │   │   ├── MerchantStorage/             # Merchant CRUD + Validation
    │   │   └── InvoiceAnalysis/             # Analysis Enrichment
    │   ├── Processing/                      # ✓ Processing Services
    │   │   └── InvoiceProcessingService     # Higher-Order Invoice Logic
    │   └── Orchestration/                   # ✓ Orchestration Services
    │       ├── InvoiceService/              # Multi-Entity Invoice Flows
    │       └── MerchantService/             # Multi-Entity Merchant Flows
    ├── Endpoints/                           # ✓ Exposers Layer
    │   └── InvoiceEndpoints.*.cs            # REST API Mapping (Partial Classes)
    ├── DDD/                                 # Domain Models (RFC 2001)
    │   ├── AggregatorRoots/                 # Invoice, Merchant Aggregates
    │   ├── Entities/                        # Domain Entities
    │   └── ValueObjects/                    # Value Objects (Product, Recipe, etc.)
    └── DTOs/                                # Data Transfer Objects
```

### Layer Alignment with The Standard

| The Standard Layer | arolariu.ro Implementation | Location |
|-------------------|---------------------------|----------|
| **Brokers** | `IInvoiceNoSqlBroker`, `IOpenAiBroker`, `IFormRecognizerBroker`, `ITranslatorBroker` | `Invoices/Brokers/` |
| **Foundation Services** | `IInvoiceStorageFoundationService`, `IMerchantStorageFoundationService`, `IInvoiceAnalysisFoundationService` | `Invoices/Services/Foundation/` |
| **Processing Services** | `IInvoiceProcessingService` | `Invoices/Services/Processing/` |
| **Orchestration Services** | `IInvoiceOrchestrationService`, `IMerchantOrchestrationService` | `Invoices/Services/Orchestration/` |
| **Exposers** | `InvoiceEndpoints` (ASP.NET Core Minimal API) | `Invoices/Endpoints/` |

---

## Brokers Layer

### The Standard Definition: Brokers

Brokers are thin abstractions over external dependencies (databases, APIs, time, file systems, logging). They:

- **Expose primitive/native types** (no domain models leak into broker signatures where possible)
- **Contain zero business logic** (no validation, no flow control)
- **Own configuration** (connection strings, retry policies)
- **Are easily replaceable** (interface-driven for testing with mocks)

### Implementation: Database Broker

**File**: `Invoices/Brokers/DatabaseBroker/IInvoiceNoSqlBroker.cs`

```csharp
/// <summary>
/// Low-level (broker) persistence contract for invoice and merchant aggregates
/// backed by Azure Cosmos DB (NoSQL).
/// </summary>
/// <remarks>
/// <para><b>Role (The Standard):</b> A broker is a thin abstraction over an external
/// dependency (Cosmos DB). It exposes primitive CRUD / query operations with minimal
/// translation. It MUST NOT implement domain validation, cross-aggregate orchestration,
/// authorization, business workflow branching, or exception classification beyond
/// direct dependency errors.</para>
/// <para><b>Cancellation:</b> All async methods accept an optional <c>CancellationToken</c>
/// to support request abort and timeouts.</para>
/// <para><b>Partitioning:</b> Invoices are partitioned by <c>UserIdentifier</c>;
/// merchants by <c>ParentCompanyId</c>. Overloads with optional partition parameters
/// perform cross-partition (fan-out) operations at higher RU cost.</para>
/// </remarks>
public interface IInvoiceNoSqlBroker
{
  #region Invoice Storage Broker

  /// <summary>Persists a new invoice document.</summary>
  ValueTask<Invoice> CreateInvoiceAsync(Invoice invoice, CancellationToken cancellationToken = default);

  /// <summary>Retrieves a single invoice; cross-partition if <paramref name="userIdentifier"/> is null.</summary>
  ValueTask<Invoice?> ReadInvoiceAsync(Guid invoiceIdentifier, Guid? userIdentifier = null, CancellationToken cancellationToken = default);

  /// <summary>Lists all non-soft-deleted invoices for a specific partition.</summary>
  ValueTask<IEnumerable<Invoice>> ReadInvoicesAsync(Guid userIdentifier, CancellationToken cancellationToken = default);

  /// <summary>Replaces (upserts) an invoice by identifier.</summary>
  ValueTask<Invoice> UpdateInvoiceAsync(Guid invoiceIdentifier, Invoice updatedInvoice, CancellationToken cancellationToken = default);

  /// <summary>Replaces (upserts) an invoice using current and updated aggregate snapshots.</summary>
  ValueTask<Invoice> UpdateInvoiceAsync(Invoice currentInvoice, Invoice updatedInvoice, CancellationToken cancellationToken = default);

  /// <summary>Soft-deletes an invoice; cross-partition if <paramref name="userIdentifier"/> is null.</summary>
  ValueTask DeleteInvoiceAsync(Guid invoiceIdentifier, Guid? userIdentifier = null, CancellationToken cancellationToken = default);

  /// <summary>Soft-deletes all invoices for a given user partition.</summary>
  ValueTask DeleteInvoicesAsync(Guid userIdentifier, CancellationToken cancellationToken = default);

  #endregion

  #region Merchant Storage Broker

  /// <summary>Persists a new merchant entity.</summary>
  ValueTask<Merchant> CreateMerchantAsync(Merchant merchant, CancellationToken cancellationToken = default);

  /// <summary>Retrieves a merchant; cross-partition if <paramref name="parentCompanyId"/> is null.</summary>
  ValueTask<Merchant?> ReadMerchantAsync(Guid merchantIdentifier, Guid? parentCompanyId = null, CancellationToken cancellationToken = default);

  /// <summary>Lists merchants filtered by parent company partition.</summary>
  ValueTask<IEnumerable<Merchant>> ReadMerchantsAsync(Guid parentCompanyId, CancellationToken cancellationToken = default);

  /// <summary>Replaces (upserts) a merchant by identifier.</summary>
  ValueTask<Merchant> UpdateMerchantAsync(Guid merchantIdentifier, Merchant updatedMerchant, CancellationToken cancellationToken = default);

  /// <summary>Replaces (upserts) a merchant using current and updated snapshots.</summary>
  ValueTask<Merchant> UpdateMerchantAsync(Merchant currentMerchant, Merchant updatedMerchant, CancellationToken cancellationToken = default);

  /// <summary>Soft-deletes (or physically removes) a merchant by identifier.</summary>
  ValueTask DeleteMerchantAsync(Guid merchantIdentifier, Guid? parentCompanyId = null, CancellationToken cancellationToken = default);

  #endregion
}
```

### Implementation: Database Broker EF Core Context

**File**: `Invoices/Brokers/DatabaseBroker/InvoiceNoSqlBroker.cs`

```csharp
/// <summary>
/// Entity Framework Core (Cosmos provider) context implementing the
/// <see cref="IInvoiceNoSqlBroker"/> contract for invoice and merchant aggregates.
/// </summary>
/// <remarks>
/// <para><b>Responsibilities:</b> Configures entity-to-container mappings, JSON property
/// names, value conversions for strongly typed / value object members, owned collections,
/// and partition key assignments. Performs no domain validation or business rule enforcement.</para>
/// <para><b>Containers:</b> Invoices mapped to <c>invoices</c> (partitioned by <c>UserIdentifier</c>);
/// Merchants mapped to <c>merchants</c> (partitioned by <c>ParentCompanyId</c>).</para>
/// </remarks>
public sealed partial class InvoiceNoSqlBroker : DbContext, IInvoiceNoSqlBroker
{
  private CosmosClient CosmosClient { get; }

  public InvoiceNoSqlBroker(CosmosClient client, DbContextOptions<InvoiceNoSqlBroker> options)
    : base(options)
  {
    ArgumentNullException.ThrowIfNull(client);
    ArgumentNullException.ThrowIfNull(options);
    CosmosClient = client;
  }

  // Configuration in OnModelCreating: partition keys, JSON property mappings,
  // value object conversions, owned collections (Products, Recipes, PaymentInformation)

  // Partial class implementations in:
  // - InvoiceNoSqlBroker.Invoices.cs (Invoice CRUD operations)
  // - InvoiceNoSqlBroker.Merchants.cs (Merchant CRUD operations)
}
```

### Standard Compliance Checklist: Brokers

| The Standard Principle | Implementation | Status |
|------------------------|----------------|--------|
| **Zero Business Logic** | Broker only maps EF Core operations to interface methods | ✅ |
| **No Validation** | All validation occurs in Foundation layer | ✅ |
| **Configuration Ownership** | DbContext owns connection string, container names, partition keys | ✅ |
| **Native Types** | Returns domain aggregates (Invoice, Merchant) but no cross-aggregate logic | ✅ |
| **Interface-Driven** | `IInvoiceNoSqlBroker` contract implemented by EF Core context | ✅ |
| **Replaceability** | In-memory or mock implementations possible for testing | ✅ |

---

## Foundation Services

### The Standard Definition: Foundation Services

Foundation Services (Broker-Neighboring Services) are the first layer that introduces **validation and business language**. They:

- **Depend on a single broker** (or 2-3 brokers via Florance Pattern)
- **Validate all inputs** (structural, logical, external validations)
- **Map business language** (Insert→AddInvoice, Select→RetrieveInvoice, Update→ModifyInvoice, Delete→RemoveInvoice)
- **Handle broker exceptions** and reclassify as domain exceptions
- **Remain single-purpose** (no cross-entity orchestration)

### Implementation: Invoice Storage Foundation Service

**File**: `Services/Foundation/InvoiceStorage/IInvoiceStorageFoundationService.cs`

```csharp
/// <summary>
/// Foundation (core) storage contract for persisting and retrieving <see cref="Invoice"/> aggregates.
/// </summary>
/// <remarks>
/// <para><b>Layer Role (The Standard):</b> A foundation service encapsulates direct interaction
/// with persistence concerns (through brokers) plus essential domain validations. It MUST NOT
/// coordinate multi-aggregate workflows or invoke other foundation services (that is the
/// orchestration layer's responsibility).</para>
/// <para><b>Responsibilities:</b>
/// <list type="bullet">
///   <item><description>Create, read, update, delete (CRUD) invoice aggregates in the underlying store.</description></item>
///   <item><description>Enforce basic domain invariants prior to persistence (e.g., non-null identifiers, monetary value ranges, collection initialization).</description></item>
///   <item><description>Propagate domain / validation failures via strongly typed exceptions (to be wrapped by higher layers).</description></item>
/// </list></para>
/// <para><b>Exclusions:</b> No cross-invoice batch operations beyond those defined; no external
/// messaging; no enrichment / AI analysis; no business flow branching.</para>
/// </remarks>
public interface IInvoiceStorageFoundationService
{
  /// <summary>Persists a new <see cref="Invoice"/> aggregate.</summary>
  /// <remarks>
  /// <para><b>Validation:</b> Ensures invoice id is non-empty, required collections initialized,
  /// and monetary totals non-negative.</para>
  /// </remarks>
  Task CreateInvoiceObject(Invoice invoice, Guid? userIdentifier = null, CancellationToken cancellationToken = default);

  /// <summary>Retrieves a single invoice by its identifier (and optional partition).</summary>
  Task<Invoice> ReadInvoiceObject(Guid identifier, Guid? userIdentifier = null, CancellationToken cancellationToken = default);

  /// <summary>Enumerates all invoices for a given partition.</summary>
  Task<IEnumerable<Invoice>> ReadAllInvoiceObjects(Guid userIdentifier, CancellationToken cancellationToken = default);

  /// <summary>Replaces an existing invoice with updated state.</summary>
  Task<Invoice> UpdateInvoiceObject(Invoice updatedInvoice, Guid invoiceIdentifier, Guid? userIdentifier = null, CancellationToken cancellationToken = default);

  /// <summary>Performs a logical or physical delete (implementation-defined) of an invoice.</summary>
  Task DeleteInvoiceObject(Guid identifier, Guid? userIdentifier = null, CancellationToken cancellationToken = default);
}
```

### Implementation: Service Class

**File**: `Services/Foundation/InvoiceStorage/InvoiceStorageFoundationService.cs`

```csharp
/// <summary>The Invoice Storage foundation service.</summary>
public partial class InvoiceStorageFoundationService : IInvoiceStorageFoundationService
{
  private readonly IInvoiceNoSqlBroker invoiceNoSqlBroker;
  private readonly ILogger<IInvoiceStorageFoundationService> logger;

  public InvoiceStorageFoundationService(
    IInvoiceNoSqlBroker invoiceNoSqlBroker,
    ILoggerFactory loggerFactory)
  {
    ArgumentNullException.ThrowIfNull(invoiceNoSqlBroker);
    this.invoiceNoSqlBroker = invoiceNoSqlBroker;
    this.logger = loggerFactory.CreateLogger<IInvoiceStorageFoundationService>();
  }

  /// <inheritdoc/>
  public async Task CreateInvoiceObject(Invoice invoice, Guid? userIdentifier = null, CancellationToken cancellationToken = default) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(CreateInvoiceObject));
    ValidateInvoiceInformationIsValid(invoice); // ← Validation before broker call

    await invoiceNoSqlBroker
      .CreateInvoiceAsync(invoice, cancellationToken)
      .ConfigureAwait(false);
  }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<Invoice> ReadInvoiceObject(Guid identifier, Guid? userIdentifier = null, CancellationToken cancellationToken = default) =>
  await TryCatchAsync(async () =>
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(ReadInvoiceObject));
    ValidateIdentifierIsSet(identifier); // ← Validation

    var invoice = await invoiceNoSqlBroker
      .ReadInvoiceAsync(identifier, userIdentifier, cancellationToken)
      .ConfigureAwait(false);
    return invoice!;
  }).ConfigureAwait(false);

  // UpdateInvoiceObject, DeleteInvoiceObject, ReadAllInvoiceObjects follow same pattern
}
```

### Validation Partial Class

**File**: `Services/Foundation/InvoiceStorage/InvoiceStorageFoundationService.Validations.cs`

```csharp
public partial class InvoiceStorageFoundationService
{
  private static void ValidateIdentifierIsSet(Guid? identifier)
  {
    Validator.ValidateAndThrow<Guid?, InvoiceIdNotSetException>(
      identifier,
      identifier => identifier is not null,
      "Identifier not set!");

    Validator.ValidateAndThrow<Guid?, InvoiceIdNotSetException>(
      identifier,
      identifier => identifier != Guid.Empty,
      "Identifier not set!");

    Validator.ValidateAndThrow<Guid?, InvoiceIdNotSetException>(
      identifier,
      identifier => identifier != default,
      "Identifier not set!");
  }

  private static void ValidateInvoiceInformationIsValid(Invoice invoice)
  {
    // TODO: complete in the future, if needed.
    // Example validations:
    // - invoice.Items collection is initialized
    // - invoice.TotalAmount >= 0
    // - invoice.Name is not null or empty
  }
}
```

### Standard Compliance Checklist: Foundation Services

| The Standard Principle | Implementation | Status |
|------------------------|----------------|--------|
| **Single Broker Dependency** | Depends only on `IInvoiceNoSqlBroker` | ✅ |
| **Validation at Entry** | `ValidateIdentifierIsSet`, `ValidateInvoiceInformationIsValid` before broker calls | ✅ |
| **Business Language** | Methods named `CreateInvoiceObject`, `ReadInvoiceObject`, etc. (not Insert/Select) | ✅ |
| **Exception Classification** | `TryCatchAsync` wrapper reclassifies broker exceptions (in `.Exceptions.cs` partial) | ✅ |
| **No Cross-Entity Logic** | Only handles Invoice aggregate, no merchant coordination | ✅ |
| **Interface-Driven** | `IInvoiceStorageFoundationService` contract | ✅ |
| **Telemetry** | OpenTelemetry activity spans for observability (RFC 1001/2002) | ✅ |

---

## Processing Services

### The Standard Definition: Processing Services

Processing Services perform **higher-order business logic** by:

- **Combining foundation services** (2-3 dependencies per Florance Pattern)
- **Applying computational logic** (transformations, enrichments, aggregations)
- **Validating "used-data-only"** (only validate data actually consumed, not full aggregate)
- **Remaining transport-agnostic** (no HTTP concerns)
- **Delegating persistence** to foundation services

### Implementation: Invoice Processing Service

**File**: `Services/Processing/IInvoiceProcessingService.cs`

```csharp
/// <summary>
/// Processing layer contract for performing higher-cost or multi-step domain operations
/// (enrichment, aggregation, fan‑out mutations) over invoice and merchant aggregates.
/// </summary>
/// <remarks>
/// <para><b>Layer Role (The Standard):</b> Processing services encapsulate computational /
/// transformational logic that may compose foundation services and optionally orchestration
/// services for delegated persistence / retrieval, while remaining transport-agnostic.</para>
/// <para><b>Responsibilities:</b>
/// <list type="bullet">
///   <item><description>Perform analysis / enrichment flows that are more than a simple single-service call
///   (e.g., iterative product normalization).</description></item>
///   <item><description>Apply batch style or multi-entity operations (e.g., deleting all invoices for a user).</description></item>
///   <item><description>Isolate performance-sensitive logic (looping, projection building, in‑memory filtering)
///   away from orchestration layer.</description></item>
/// </list></para>
/// <para><b>Exclusions:</b> No direct broker calls (should be via foundation), no HTTP concerns,
/// no UI mapping, no long‑running state persistence.</para>
/// </remarks>
public interface IInvoiceProcessingService
{
  /// <summary>Performs analysis / enrichment over a single invoice according to option flags.</summary>
  Task AnalyzeInvoice(AnalysisOptions options, Guid identifier, Guid? userIdentifier = null);

  /// <summary>Persists a new invoice aggregate (delegates persistence to foundation layer).</summary>
  Task CreateInvoice(Invoice invoice, Guid? userIdentifier = null);

  /// <summary>Retrieves a single invoice aggregate.</summary>
  Task<Invoice> ReadInvoice(Guid identifier, Guid? userIdentifier = null);

  /// <summary>Enumerates invoices within an optional partition scope.</summary>
  Task<IEnumerable<Invoice>> ReadInvoices(Guid? userIdentifier = null);

  /// <summary>Replaces an existing invoice aggregate with updated state.</summary>
  Task<Invoice> UpdateInvoice(Invoice updatedInvoice, Guid invoiceIdentifier, Guid? userIdentifier = null);

  /// <summary>Deletes a single invoice (logical or physical per foundation implementation).</summary>
  Task DeleteInvoice(Guid identifier, Guid? userIdentifier = null);

  /// <summary>Deletes all invoices for a specified partition / user.</summary>
  /// <remarks><b>Caution:</b> Potentially expensive operation (fan‑out deletes).</remarks>
  Task DeleteInvoices(Guid userIdentifier);

  /// <summary>Adds (appends or merges) a product into an invoice's product collection.</summary>
  Task AddProduct(Product product, Guid invoiceIdentifier, Guid? userIdentifier = null);

  /// <summary>Retrieves all products belonging to an invoice.</summary>
  Task<IEnumerable<Product>> GetProducts(Guid invoiceIdentifier, Guid? userIdentifier = null);

  // Additional processing methods for merchants, recipes, etc...
}
```

### Processing Service Characteristics

1. **Higher-Order Logic**: `AnalyzeInvoice` performs multi-step enrichment (normalization, categorization)
2. **Batch Operations**: `DeleteInvoices(Guid userIdentifier)` deletes all invoices for a user (fan-out deletion)
3. **Collection Operations**: `AddProduct`, `GetProducts` manipulate invoice product collections
4. **Delegates Persistence**: All Create/Update/Delete operations delegate to `IInvoiceStorageFoundationService`
5. **Used-Data Validation**: Validates only the specific fields consumed by processing logic

### Standard Compliance Checklist: Processing Services

| The Standard Principle | Implementation | Status |
|------------------------|----------------|--------|
| **Florance Pattern (2-3 Dependencies)** | Depends on `IInvoiceStorageFoundationService` + `IInvoiceAnalysisFoundationService` | ✅ |
| **Higher-Order Logic** | `AnalyzeInvoice`, batch operations, collection manipulations | ✅ |
| **Used-Data Validation** | Validates only fields consumed by processing operations | ✅ |
| **No Direct Broker Calls** | All persistence via foundation services | ✅ |
| **Transport-Agnostic** | No HTTP, no UI concerns | ✅ |
| **Exception Classification** | Reclassifies foundation exceptions as processing exceptions | ✅ |

---

## Orchestration Services

### The Standard Definition: Orchestration Services

Orchestration Services coordinate **complex multi-entity workflows** by:

- **Combining multiple foundation/processing services** (Florance Pattern: 2-3 dependencies)
- **Managing cross-aggregate transactions** (when supported)
- **Handling complex business flows** (approval workflows, multi-step processes)
- **Providing aggregate-level coordination** (e.g., create invoice + link merchant)
- **Remaining protocol-agnostic** (no HTTP concerns)

### Implementation: Invoice Orchestration Service

**Directory**: `Services/Orchestration/InvoiceService/`

**Files**:

- `IInvoiceOrchestrationService.cs` (Interface)
- `InvoiceOrchestrationService.cs` (Implementation)
- `InvoiceOrchestrationService.Validations.cs` (Validation Partial)
- `InvoiceOrchestrationService.Exceptions.cs` (Exception Handling Partial)

### Orchestration Service Characteristics

1. **Multi-Entity Coordination**: Coordinates invoice and merchant operations
2. **Complex Workflows**: Handles flows like "create invoice + analyze + link merchant"
3. **Florance Pattern**: Depends on `IInvoiceProcessingService` + `IMerchantProcessingService` (2 dependencies)
4. **Advanced Validation**: Validates cross-entity relationships and business rules
5. **Transaction Boundaries**: Future enhancement for distributed transactions

### Standard Compliance Checklist: Orchestration Services

| The Standard Principle | Implementation | Status |
|------------------------|----------------|--------|
| **Florance Pattern (2-3 Dependencies)** | Depends on Invoice + Merchant processing services | ✅ |
| **Multi-Entity Coordination** | Orchestrates invoice and merchant workflows | ✅ |
| **Complex Business Flows** | Handles multi-step creation, analysis, linking | ✅ |
| **No Direct Broker/Foundation Calls** | All operations via processing services | ✅ |
| **Protocol-Agnostic** | No HTTP concerns | ✅ |
| **Advanced Validation** | Cross-entity relationship validation | ✅ |

---

## Exposers Layer

### The Standard Definition: Exposers

Exposers (Controllers/Endpoints) are the **protocol mapping layer** that:

- **Map HTTP to business operations** (RESTful routing)
- **Handle protocol concerns** (HTTP status codes, content negotiation)
- **Depend on a single orchestration/processing service** (Florance Pattern)
- **Perform no business logic** (pure routing and exception translation)
- **Validate protocol-level inputs** (route parameters, headers)

### Implementation: Invoice Endpoints

**Files** (Partial Classes):

- `InvoiceEndpoints.cs` (Route registration)
- `InvoiceEndpoints.Handlers.cs` (Handler implementations)
- `InvoiceEndpoints.Mappings.cs` (DTO mappings)
- `InvoiceEndpoints.Metadata.cs` (OpenAPI metadata)

### Route Registration

**File**: `Endpoints/InvoiceEndpoints.cs`

```csharp
/// <summary>
/// Extension host for registering all invoice and merchant related HTTP endpoints
/// (routing surface for the Invoices bounded context).
/// </summary>
/// <remarks>
/// <para><b>Composition:</b> Split across partial class files: core mapping (<c>InvoiceEndpoints.cs</c>),
/// handler implementations (<c>InvoiceEndpoints.Handlers.cs</c>), response / request DTO mappings
/// (<c>InvoiceEndpoints.Mappings.cs</c>) and metadata enhancements (<c>InvoiceEndpoints.Metadata.cs</c>).</para>
/// <para><b>Versioning:</b> Current semantic package surface version stored in <c>SemanticVersioning</c>;
/// the external public REST route uses a URI version segment (<c>rest/v1</c>) decoupled from internal
/// semantic version (allows internal additive changes without immediate URI bump).</para>
/// </remarks>
public static partial class InvoiceEndpoints
{
  private const string SemanticVersioning = "3.0.0";

  /// <summary>
  /// Registers all invoice, invoice analysis and merchant endpoint groups into the
  /// application's routing pipeline.
  /// </summary>
  public static void MapInvoiceEndpoints(this IEndpointRouteBuilder router)
  {
    router.MapGroup("rest/v1").MapStandardInvoiceEndpoints();
    router.MapGroup("rest/v1").MapInvoiceAnalysisEndpoints();
    router.MapGroup("rest/v1").MapStandardMerchantEndpoints();
  }

  // Helper methods for extracting claims, checking authorization, etc.
}
```

### Handler Implementation

**File**: `sites/api.arolariu.ro/src/Invoices/Endpoints/InvoiceEndpoints.Handlers.cs`

Handlers wrap their body in a single `try / catch (Exception ex)`. The catch delegates
to `ExceptionToHttpResultMapper.ToHttpResult` (see
`sites/api.arolariu.ro/src/Common/Http/ExceptionToHttpResultMapper.cs`), which walks the
exception chain, picks the innermost classifiable marker, and emits an RFC 7807
`ProblemDetails` with the correct HTTP status. Per-type `catch` blocks are no longer
needed — that responsibility is centralized in the mapper.

```csharp
public static partial class InvoiceEndpoints
{
  public static async partial Task<IResult> CreateNewInvoiceAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    CreateInvoiceRequestDto invoiceDto)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(
        nameof(CreateNewInvoiceAsync),
        ActivityKind.Server);

      var invoice = invoiceDto.ToInvoice(); // ← DTO mapping

      await invoiceProcessingService
        .CreateInvoice(invoice)
        .ConfigureAwait(false);

      var responseDto = InvoiceResponseDto.FromInvoice(invoice);
      return TypedResults.Created($"/rest/v1/invoices/{invoice.id}", responseDto);
    }
    catch (Exception ex)
    {
      Activity.Current?.RecordException(ex);
      Activity.Current?.SetStatus(ActivityStatusCode.Error, ex.GetType().Name);
      return ExceptionToHttpResultMapper.ToHttpResult(ex, Activity.Current);
    }
  }

  // Additional handlers (Retrieve/Update/Delete) follow the same single-catch pattern.
}
```

### Standard Compliance Checklist: Exposers

| The Standard Principle | Implementation | Status |
|------------------------|----------------|--------|
| **Single Service Dependency** | Handlers depend only on `IInvoiceProcessingService` | ✅ |
| **Protocol Mapping Only** | Maps HTTP requests/responses to service calls | ✅ |
| **No Business Logic** | All logic delegated to processing service | ✅ |
| **Exception Translation** | Converts service exceptions to HTTP status codes | ✅ |
| **RESTful Conventions** | POST=Create, GET=Retrieve, PUT=Update, DELETE=Remove | ✅ |
| **Versioning** | URI versioning (`rest/v1`) decoupled from semantic versioning | ✅ |
| **OpenAPI Metadata** | Documented via `InvoiceEndpoints.Metadata.cs` partial | ✅ |

---

## Key Principles Implementation

### 1. Business Language Mapping

The Standard requires translating technical CRUD operations to business language:

| Technical Operation | The Standard Name | arolariu.ro Implementation |
|--------------------|-------------------|---------------------------|
| **Insert** | Add | `CreateInvoiceObject`, `CreateInvoiceAsync` |
| **Select** | Retrieve | `ReadInvoiceObject`, `ReadInvoiceAsync` |
| **Update** | Modify | `UpdateInvoiceObject`, `UpdateInvoiceAsync` |
| **Delete** | Remove | `DeleteInvoiceObject`, `DeleteInvoiceAsync` |

**Note**: Our implementation uses `Create`, `Read`, `Update`, `Delete` which are acceptable domain-neutral terms per The Standard's flexibility. Future refactoring may adopt stronger business language like `AddInvoice`, `RetrieveInvoice`, `ModifyInvoice`, `RemoveInvoice`.

### 2. Florance Pattern (Two-Three Rule)

Every service limits dependencies to **2-3 maximum**:

```csharp
// Foundation Service: Single broker dependency
public class InvoiceStorageFoundationService : IInvoiceStorageFoundationService
{
  private readonly IInvoiceNoSqlBroker invoiceNoSqlBroker; // ← 1 dependency
  private readonly ILogger<IInvoiceStorageFoundationService> logger; // ← Logging (not counted)
}

// Orchestration Service: 2-3 foundation services
public class InvoiceOrchestrationService : IInvoiceOrchestrationService
{
  private readonly IInvoiceStorageFoundationService invoiceStorageFoundationService; // ← 1
  private readonly IInvoiceAnalysisFoundationService invoiceAnalysisFoundationService; // ← 2
}

// Processing Service: 2-3 orchestration services
public class InvoiceProcessingService : IInvoiceProcessingService
{
  private readonly IInvoiceOrchestrationService invoiceOrchestrationService; // ← 1
  private readonly IMerchantOrchestrationService merchantOrchestrationService; // ← 2
}

// Exposer: Single processing service
public static partial class InvoiceEndpoints
{
  internal static async Task<IResult> CreateNewInvoiceAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService) // ← 1 dependency
  { /* ... */ }
}
```

### 3. Flow-Forward Architecture

Services only call **downward** in the hierarchy (never sideways or upward):

`plaintext
Exposers → Processing → Orchestration → Foundation → Brokers
   ↓            ↓             ↓              ↓           ↓
  HTTP       Higher-      Cross-Domain    CRUD +     Database
 Mapping      Order       Coordination  Validation   Access
              Logic
`

**Forbidden**:

- ❌ Foundation calling another foundation service
- ❌ Orchestration calling a processing service (upward call)
- ❌ Broker calling any service

**Allowed**:

- ✅ Exposer → Processing
- ✅ Processing → Orchestration
- ✅ Orchestration → Foundation
- ✅ Foundation → Broker

### 4. Pure Contracting (Interface-Driven Design)

Every service is interface-driven for testability:

```csharp
// Service Registration (DI Container)
services.AddScoped<IInvoiceNoSqlBroker, InvoiceNoSqlBroker>();
services.AddScoped<IInvoiceStorageFoundationService, InvoiceStorageFoundationService>();
services.AddScoped<IInvoiceProcessingService, InvoiceProcessingService>();
services.AddScoped<IInvoiceOrchestrationService, InvoiceOrchestrationService>();
```

Benefits:

- **Unit Testing**: Mock dependencies with test doubles
- **Replaceability**: Swap implementations without changing consumers
- **SOLID Principles**: Dependency Inversion Principle (depend on abstractions)

---

## Validation Strategy

### The Standard's Validation Categories

The Standard defines three validation types:

1. **Structural Validation**: Ensures required fields are present and correctly formatted
2. **Logical Validation**: Validates business rules (e.g., amount > 0, date ranges valid)
3. **External Validation**: Validates data against external systems (e.g., merchant exists)

### Implementation: Foundation Service Validation

**File**: `Services/Foundation/InvoiceStorage/InvoiceStorageFoundationService.Validations.cs`

```csharp
public partial class InvoiceStorageFoundationService
{
  // Structural Validation: Identifier must be non-null, non-empty, non-default
  private static void ValidateIdentifierIsSet(Guid? identifier)
  {
    Validator.ValidateAndThrow<Guid?, InvoiceIdNotSetException>(
      identifier,
      identifier => identifier is not null,
      "Identifier not set!");

    Validator.ValidateAndThrow<Guid?, InvoiceIdNotSetException>(
      identifier,
      identifier => identifier != Guid.Empty,
      "Identifier not set!");

    Validator.ValidateAndThrow<Guid?, InvoiceIdNotSetException>(
      identifier,
      identifier => identifier != default,
      "Identifier not set!");
  }

  // Logical Validation: Invoice aggregate invariants
  private static void ValidateInvoiceInformationIsValid(Invoice invoice)
  {
    // Example logical validations:
    // - invoice.Items collection is initialized
    // - invoice.TotalAmount >= 0
    // - invoice.CreatedAt <= DateTime.UtcNow
    // - invoice.Name is not null or whitespace
  }
}
```

### Validation at Every Layer

Each layer performs its own validation:

| Layer | Validation Focus | Example |
|-------|-----------------|---------|
| **Brokers** | None (The Standard principle) | No validation |
| **Foundation** | Structural + Logical | Non-null identifiers, positive amounts |
| **Processing** | Used-Data Only | Only validate fields consumed by processing logic |
| **Orchestration** | Cross-Entity Relationships | Invoice references valid merchant |
| **Exposers** | Protocol-Level | Valid route parameters, headers |

---

## Exception Classification

### The Standard's Exception Hierarchy

The Standard categorizes exceptions into three types:

1. **Validation Exceptions**: Service's own validation failures (4xx HTTP equivalent)
2. **Dependency Exceptions**: Downstream service/broker failures (5xx HTTP equivalent)
3. **Dependency Validation Exceptions**: Downstream service reported validation failure (4xx from downstream)

### Implementation: Exception Naming Convention

```csharp
// Foundation Service Exceptions
InvoiceStorageFoundationServiceValidationException          // Own validation failed
InvoiceStorageFoundationServiceDependencyException          // Broker threw unexpected exception
InvoiceStorageFoundationServiceDependencyValidationException // Broker threw validation exception

// Processing Service Exceptions
InvoiceProcessingServiceValidationException                 // Own validation failed
InvoiceProcessingServiceDependencyException                 // Foundation threw unexpected exception
InvoiceProcessingServiceDependencyValidationException       // Foundation threw validation exception
InvoiceProcessingServiceException                           // Catch-all for unexpected errors

// Orchestration Service Exceptions
InvoiceOrchestrationServiceValidationException              // Own validation failed
InvoiceOrchestrationServiceDependencyException              // Processing threw unexpected exception
InvoiceOrchestrationServiceDependencyValidationException    // Processing threw validation exception
```

### Exception Handling in Exposers

**File**: `sites/api.arolariu.ro/src/Invoices/Endpoints/InvoiceEndpoints.Handlers.cs`

Endpoints do not carry a catch-per-exception-type ladder. They wrap the handler body in
a single `try / catch (Exception ex)` and route the exception through
`ExceptionToHttpResultMapper.ToHttpResult`, which emits an RFC 7807
`ProblemDetails` response with the correct HTTP status:

```csharp
public static async partial Task<IResult> CreateNewInvoiceAsync(
  IInvoiceProcessingService invoiceProcessingService,
  IHttpContextAccessor httpContext,
  CreateInvoiceRequestDto invoiceDto)
{
  try
  {
    using var activity = InvoicePackageTracing.StartActivity(
      nameof(CreateNewInvoiceAsync),
      ActivityKind.Server);

    var invoice = invoiceDto.ToInvoice();
    await invoiceProcessingService.CreateInvoice(invoice).ConfigureAwait(false);

    var responseDto = InvoiceResponseDto.FromInvoice(invoice);
    return TypedResults.Created($"/rest/v1/invoices/{invoice.id}", responseDto);
  }
  catch (Exception ex)
  {
    Activity.Current?.RecordException(ex);
    Activity.Current?.SetStatus(ActivityStatusCode.Error, ex.GetType().Name);
    return ExceptionToHttpResultMapper.ToHttpResult(ex, Activity.Current);
  }
}
```

The mapper derives the HTTP status from marker interfaces on the exception chain
(`IValidationException`, `IDependencyValidationException`, `IDependencyException`,
`IServiceException`, plus the refinement markers `INotFoundException`,
`IAlreadyExistsException`, `ILockedException`, `IRateLimitedException`,
`IUnauthorizedException`, `IForbiddenException`). The full mapping is defined in the
[Exception → HTTP Status Mapping Contract](#exception--http-status-mapping-contract)
section below.

---

## Testing Approach

### The Standard's Testing Philosophy

The Standard emphasizes **unit testing at every layer** with:

- **Test Isolation**: Mock all dependencies
- **Test Coverage**: Aim for 85%+ code coverage (per RFC 2001)
- **Test Naming**: `Should_ExpectedBehavior_When_Condition`
- **AAA Pattern**: Arrange, Act, Assert

### Testing Strategy by Layer

| Layer | Test Focus | Mocking Strategy |
|-------|-----------|------------------|
| **Brokers** | Configuration, connection handling | No mocks (integration tests) or in-memory databases |
| **Foundation** | Validation logic, exception handling | Mock brokers |
| **Processing** | Business logic, used-data validation | Mock foundation services |
| **Orchestration** | Multi-entity coordination | Mock processing services |
| **Exposers** | HTTP mapping, exception translation | Mock orchestration/processing services |

### Example: Foundation Service Unit Test

```csharp
public class InvoiceStorageFoundationServiceTests
{
  private readonly Mock<IInvoiceNoSqlBroker> brokerMock;
  private readonly IInvoiceStorageFoundationService service;

  public InvoiceStorageFoundationServiceTests()
  {
    brokerMock = new Mock<IInvoiceNoSqlBroker>();
    var loggerFactory = new Mock<ILoggerFactory>();
    service = new InvoiceStorageFoundationService(brokerMock.Object, loggerFactory.Object);
  }

  [Fact]
  public async Task Should_CreateInvoice_When_ValidInvoiceProvided()
  {
    // Arrange
    var invoice = new Invoice { id = Guid.NewGuid(), Name = "Test Invoice" };
    brokerMock.Setup(b => b.CreateInvoiceAsync(invoice)).ReturnsAsync(invoice);

    // Act
    await service.CreateInvoiceObject(invoice);

    // Assert
    brokerMock.Verify(b => b.CreateInvoiceAsync(invoice), Times.Once);
  }

  [Fact]
  public async Task Should_ThrowValidationException_When_IdentifierNotSet()
  {
    // Arrange
    Guid? invalidId = null;

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceIdNotSetException>(() =>
      service.ReadInvoiceObject(invalidId.Value));
  }
}
```

### Current Test Structure

```
sites/api.arolariu.ro/tests/
├── arolariu.Backend.Core.Tests/
│   ├── Common/           # Shared/common infrastructure tests
│   ├── CoreAuth/         # Authentication domain tests
│   └── Shared/           # Test helpers and shared fixtures
└── arolariu.Backend.Domain.Tests/
    ├── Builders/         # Domain test data builders
    └── Invoices/         # Invoices domain broker/service tests
```

---

## Future Enhancements

### 1. Business Language Refinement

**Current**: `CreateInvoiceObject`, `ReadInvoiceObject`, `UpdateInvoiceObject`, `DeleteInvoiceObject`

**Target**: `AddInvoice`, `RetrieveInvoice`, `ModifyInvoice`, `RemoveInvoice`

**Rationale**: Stronger alignment with The Standard's business language principle.

### 2. Exception-to-HTTP-Status Mapping Refinement — Shipped

Previously listed as a future enhancement. Shipped via `ExceptionToHttpResultMapper`
(see `sites/api.arolariu.ro/src/Common/Http/ExceptionToHttpResultMapper.cs:73-86`) and
the belt-and-suspenders `ExceptionMappingHandler` middleware
(`sites/api.arolariu.ro/src/Common/Http/ExceptionMappingHandler.cs`). See the
[Exception → HTTP Status Mapping Contract](#exception--http-status-mapping-contract)
section for the authoritative table.

### 3. Coordination/Management Services Layer

**Current**: Only Orchestration services implemented

**Target**: Add Coordination Services for even higher-level flows:

- `InvoiceCoordinationService`: Coordinates invoice + merchant + analysis + notification flows
- `InvoiceBatchCoordinationService`: Handles bulk invoice imports with rollback semantics

### 4. Aggregation Services Layer

**Current**: Not implemented

**Target**: Add Aggregation Services as single entry points for multiple orchestration services:

- `InvoiceManagementAggregationService`: Aggregates invoice orchestration + merchant orchestration + analytics orchestration

### 5. Pagination and Filtering

**Current**: `ReadAllInvoiceObjects` returns all invoices (potentially expensive)

**Target**:

- Add pagination parameters (`page`, `pageSize`)
- Add filtering/sorting (`filter`, `orderBy`)
- Return `PagedResult<Invoice>` with total count and pagination metadata

### 6. Optimistic Concurrency Control

**Current**: No ETag or version handling

**Target**:

- Add `ETag` or `Version` property to aggregates
- Implement conditional updates (`If-Match` headers)
- Throw `ConcurrencyException` on version mismatch

### 7. Soft Delete Refinement

**Current**: Soft delete via `IsSoftDeleted` flag, no retention policy

**Target**:

- Add `DeletedAt` timestamp
- Implement retention policy (hard delete after 90 days)
- Add "restore deleted invoice" functionality

### 8. Enhanced Validation

**Current**: Basic structural validation in foundation services

**Target**:

- Complete `ValidateInvoiceInformationIsValid` with full logical validation
- Add external validation (merchant exists, currency valid, etc.)
- Implement FluentValidation for complex validation rules

### 9. Transactional Orchestration

**Current**: No transaction boundaries

**Target**:

- Implement distributed transactions for orchestration services
- Use Saga pattern for long-running workflows
- Add compensation logic for rollback scenarios

### 10. Test Coverage Expansion

**Current**: Foundation service tests implemented

**Target**:

- Complete processing service unit tests
- Complete orchestration service unit tests
- Complete exposer (endpoint) unit tests
- Achieve 85%+ code coverage across all layers

---

## Conclusion

The arolariu.ro backend (`api.arolariu.ro`) successfully implements Hassan Habib's "The Standard" architectural principles through a strict five-layer architecture:

1. **Brokers**: Thin abstractions over external dependencies (Cosmos DB, AI/ML services, translation services)
2. **Foundation Services**: Validation + CRUD operations with business language mapping
3. **Processing Services**: Higher-order business logic combining foundation services
4. **Orchestration Services**: Complex multi-entity workflows coordinating processing services
5. **Exposers**: Protocol mapping layer translating HTTP requests to service calls

### Key Achievements

- ✅ **Strict Layering**: All five layers implemented with clear boundaries
- ✅ **Florance Pattern**: Services limit dependencies to 2-3 maximum
- ✅ **Pure Contracting**: Interface-driven design throughout
- ✅ **Flow-Forward Architecture**: No sideways or backward service calls
- ✅ **Validation at Every Layer**: Each layer validates its own inputs
- ✅ **Exception Classification**: Three-tier exception hierarchy (Validation, Dependency, DependencyValidation)
- ✅ **Zero Business Logic in Brokers**: Brokers remain thin wrappers
- ✅ **Telemetry Integration**: OpenTelemetry instrumentation at every layer (RFC 1001/2002)

### Integration with DDD (RFC 2001)

The Standard's service layers complement Domain-Driven Design:

- **Aggregates**: Invoice, Merchant aggregates encapsulate business invariants
- **Value Objects**: Product, Recipe, Currency, Address provide type safety
- **Domain Events**: (Future) Event-driven communication between bounded contexts
- **Repositories**: Foundation services act as repositories with validation
- **Application Services**: Processing/Orchestration services act as application services

### The Standard as a Foundation

By implementing The Standard, the arolariu.ro backend achieves:

1. **Predictable Structure**: New developers immediately understand the layering
2. **High Testability**: Interface-driven design enables comprehensive unit testing
3. **Maintainability**: Single Responsibility Principle at every layer
4. **Scalability**: Clear separation allows independent scaling of concerns
5. **Team Alignment**: Shared vocabulary (brokers, foundation, processing, orchestration, exposers)

This RFC serves as living documentation for how The Standard is applied in practice, providing concrete examples and architectural decisions for future development and onboarding.

---

## References

- **The Standard Book**: <https://github.com/hassanhabib/The-Standard>
- **RFC 2001**: Domain-Driven Design Architecture (`docs/rfc/2001-domain-driven-design-architecture.md`)
- **RFC 1001**: OpenTelemetry Observability System (`docs/rfc/1001-opentelemetry-observability-system.md`)
- **RFC 2002**: OpenTelemetry Backend Observability (`docs/rfc/2002-opentelemetry-backend-observability.md`)
- **Hassan Habib's YouTube Channel**: <https://www.youtube.com/@hassanhabib>
- **Standard.AI Community**: <https://discord.gg/Hassan>

---

**Document Version**: 1.0.0
**Last Updated**: 2025-01-26
**Maintainer**: Alexandru Olariu ([@arolariu](https://github.com/arolariu))

## Exception → HTTP Status Mapping Contract

All bounded contexts MUST classify exceptions using marker interfaces from
`arolariu.Backend.Common.Exceptions` and delegate HTTP response construction to the
static `ExceptionToHttpResultMapper` at
`sites/api.arolariu.ro/src/Common/Http/ExceptionToHttpResultMapper.cs`. The stable
problem-type URIs are declared as constants in
`sites/api.arolariu.ro/src/Common/Http/ProblemTypeUris.cs` and are part of the public
API contract (do not rename without a major version bump).

The following mapping — implemented by `SelectStatus` at
`sites/api.arolariu.ro/src/Common/Http/ExceptionToHttpResultMapper.cs:73-86` — is
authoritative. Rows appear in the same order as the `switch` arms; the unclassified
default arm maps to 500:

| Marker Interface                  | HTTP Status | Problem Type URI constant                      |
|-----------------------------------|-------------|------------------------------------------------|
| `IUnauthorizedException`          | 401         | `ProblemTypeUris.Unauthorized`                 |
| `IForbiddenException`             | 403         | `ProblemTypeUris.Forbidden`                    |
| `INotFoundException`              | 404         | `ProblemTypeUris.NotFound`                     |
| `IAlreadyExistsException`         | 409         | `ProblemTypeUris.Conflict`                     |
| `ILockedException`                | 423         | `ProblemTypeUris.Locked`                       |
| `IRateLimitedException`           | 429         | `ProblemTypeUris.RateLimited`                  |
| `IValidationException`            | 400         | `ProblemTypeUris.Validation`                   |
| `IDependencyValidationException`  | 400         | `ProblemTypeUris.Validation`                   |
| `IDependencyException`            | 503         | `ProblemTypeUris.ServiceUnavailable`           |
| `IServiceException`               | 500         | `ProblemTypeUris.InternalServerError`          |
| _(unclassified)_                  | 500         | `ProblemTypeUris.InternalServerError`          |

ProblemDetails responses MUST include a `traceId` extension (correlating to the
current `Activity.TraceId`) and MUST NOT include `exception.Source`, stack traces,
or exception type names. For 401/403/500/503 responses the `detail` field is a fixed,
non-leaking message; for client-attributable statuses it echoes the exception message
truncated to 512 characters. For 429 responses, a `retryAfterSeconds` extension is
emitted (sourced from a `RetryAfter` TimeSpan property on the exception, defaulting to
one second).

### Inner-exception Refinement Markers

Outer exceptions thrown by Foundation / Orchestration / Processing services (e.g.
`InvoiceStorageFoundationServiceDependencyValidationException`) carry coarse markers
(`IDependencyValidationException`, `IDependencyException`, etc.). They wrap the
concrete inner exception as `InnerException`, and it is the inner type that carries
the refinement marker that decides the HTTP status.

The Invoices bounded context ships 21 inner exceptions across two folders:

- `sites/api.arolariu.ro/src/Invoices/DDD/AggregatorRoots/Invoices/Exceptions/Inner/`
  — 12 classes: `InvoiceAlreadyExistsException`, `InvoiceCosmosDbRateLimitException`,
  `InvoiceDescriptionNotSetException`, `InvoiceFailedStorageException`,
  `InvoiceForbiddenAccessException`, `InvoiceIdNotSetException`,
  `InvoiceLockedException`, `InvoiceNotFoundException`,
  `InvoicePaymentInformationNotCorrectException`,
  `InvoicePhotoLocationNotCorrectException`,
  `InvoiceTimeInformationNotCorrectException`, `InvoiceUnauthorizedAccessException`.
- `sites/api.arolariu.ro/src/Invoices/DDD/Entities/Merchants/Exceptions/Inner/`
  — 9 classes: `MerchantAlreadyExistsException`, `MerchantCosmosDbRateLimitException`,
  `MerchantFailedStorageException`, `MerchantForbiddenAccessException`,
  `MerchantIdNotSetException`, `MerchantLockedException`,
  `MerchantNotFoundException`, `MerchantParentCompanyIdNotSetException`,
  `MerchantUnauthorizedAccessException`.

Each of these implements a refinement marker (`INotFoundException`,
`IAlreadyExistsException`, `ILockedException`, `IRateLimitedException`,
`IUnauthorizedException`, `IForbiddenException`, or `IValidationException`). The
mapper's chain walk — `FindClassifiableException` at
`sites/api.arolariu.ro/src/Common/Http/ExceptionToHttpResultMapper.cs:49-59` — iterates
down `InnerException` and picks the **innermost** classifiable exception. This lets
wrapping layers stay on coarse markers (Foundation / Orchestration / Processing outer
exceptions) while still producing the correct refined HTTP status (404, 409, 423, 429,
401, 403, or 400) based on the root cause.

### Defense-in-Depth: `ExceptionMappingHandler`

Endpoint handlers wrap their body in a single `try / catch (Exception ex)` that routes
through `ExceptionToHttpResultMapper`. As a belt-and-suspenders layer, exceptions that
escape an endpoint (model binding faults, authentication middleware throws, routing
faults) are caught by `ExceptionMappingHandler` — an `IExceptionHandler` registered as
the first piece of middleware in the pipeline:

- Handler: `sites/api.arolariu.ro/src/Common/Http/ExceptionMappingHandler.cs`
- Registration: `services.AddExceptionHandler<ExceptionMappingHandler>()` followed by
  `services.AddProblemDetails()` in
  `sites/api.arolariu.ro/src/Core/Domain/General/Extensions/WebApplicationBuilderExtensions.cs:330-331`.
- Pipeline slot: `app.UseExceptionHandler()` as the **first** middleware in
  `sites/api.arolariu.ro/src/Core/Domain/General/Extensions/WebApplicationExtensions.cs:109-113`,
  so it wraps routing, model binding, auth, and endpoint handlers.

On every caught exception the handler records the exception on the current `Activity`,
runs the same mapping function, and writes the resulting `ProblemDetails` to the
response.

### Known Gap: `BadHttpRequestException`

`Microsoft.AspNetCore.Http.BadHttpRequestException` (thrown by the Kestrel / model
binding layers on malformed payloads) does not currently implement any of the marker
interfaces. It falls through to the default arm of `SelectStatus` and is therefore
mapped to **500 Internal Server Error**, even though its own `StatusCode` property is
typically 400. A follow-up task may add an explicit switch arm that propagates
`ex.StatusCode` for this type; until then this remains a documented deviation from the
otherwise-aligned status model.