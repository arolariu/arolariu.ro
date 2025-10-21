# RFC 2004: Comprehensive XML Documentation Standard

**Status**: Accepted
**Authors**: Alexandru Olariu
**Created**: 2025-01-26
**Related RFCs**: RFC 2001 (DDD), RFC 2003 (The Standard), RFC 1001/2002 (OpenTelemetry)

---

## Abstract

This RFC documents the comprehensive XML documentation standard employed throughout the arolariu.ro backend (`api.arolariu.ro`) codebase. Unlike typical C# XML comments that provide minimal IntelliSense support, our documentation standard creates **tutorial-level, production-ready documentation** embedded directly in source code, serving multiple audiences: developers (IDE IntelliSense), API consumers (generated documentation), and new team members (onboarding material).

This standard leverages the full power of C# XML documentation tags (`<summary>`, `<remarks>`, `<para>`, `<list>`, `<see cref="">`, `<example>`, etc.) to create rich, structured, cross-referenced documentation that explains not just **what** the code does, but **why** it exists, **how** it should be used, **when** it applies, and **what** trade-offs were made.

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Documentation Philosophy](#documentation-philosophy)
3. [XML Documentation Structure](#xml-documentation-structure)
4. [Core Documentation Elements](#core-documentation-elements)
5. [Advanced Documentation Techniques](#advanced-documentation-techniques)
6. [Documentation by Code Element Type](#documentation-by-code-element-type)
7. [Architectural Context in Documentation](#architectural-context-in-documentation)
8. [Real-World Examples](#real-world-examples)
9. [Tooling Integration](#tooling-integration)
10. [Quality Guidelines](#quality-guidelines)
11. [Common Anti-Patterns](#common-anti-patterns)
12. [Documentation Checklist](#documentation-checklist)

---

## Problem Statement

Enterprise codebases face several documentation challenges:

1. **Stale Documentation**: External documentation becomes outdated as code evolves
2. **Context Loss**: New developers struggle to understand design decisions without archeological code reading
3. **API Ambiguity**: Method signatures alone don't convey usage contracts, edge cases, or invariants
4. **Scattered Knowledge**: Architecture decisions documented separately from implementation
5. **Onboarding Friction**: New team members lack contextual understanding of why code is structured a certain way

### Design Goals

Our XML documentation standard addresses these challenges by:

1. **Embedding Documentation in Code**: Single source of truth that evolves with implementation
2. **Providing Multi-Level Context**: From quick summaries to deep architectural rationale
3. **Enabling IDE-Integrated Learning**: IntelliSense becomes a teaching tool
4. **Generating Production Documentation**: DocFX, Swagger, and API docs auto-generated from XML
5. **Documenting Trade-Offs**: Explain why decisions were made (thread-safety, performance, simplicity)
6. **Cross-Referencing Architecture**: Link code to RFCs, DDD patterns, and The Standard principles

---

## Documentation Philosophy

### Core Principles

1. **Documentation is Code**: XML comments are first-class citizens, not afterthoughts
2. **Write for Multiple Audiences**:
   - Future you (6 months later)
   - New team members (onboarding)
   - API consumers (external developers)
   - Tooling (DocFX, Swagger generators)
3. **Explain the Why, Not Just the What**: Implementation details are visible in code; context is not
4. **Leverage Structure**: Use XML tags to create scannable, hierarchical documentation
5. **Cross-Reference Liberally**: Link to related types, methods, RFCs, and external resources
6. **Document Contracts, Not Implementation**: Focus on public API surface and guarantees

### Documentation Levels

| Level | Audience | Content | XML Tags |
|-------|----------|---------|----------|
| **Summary** | All | One-sentence description of purpose | `<summary>` |
| **Detailed Explanation** | Developers | Multi-paragraph context, usage, design decisions | `<remarks>` with `<para>` |
| **Parameter Context** | API Consumers | Parameter constraints, valid ranges, nullability | `<param>` |
| **Return Value** | API Consumers | What gets returned, when null, edge cases | `<returns>` |
| **Exceptions** | Error Handlers | What exceptions, when thrown, why | `<exception>` |
| **Examples** | Learners | Real code samples showing usage | `<example>` with `<code>` |
| **Cross-References** | Architects | Links to related types, patterns, RFCs | `<see cref="">`, `<seealso cref="">` |

---

## XML Documentation Structure

### Hierarchical Template

```csharp
/// <summary>
/// One-sentence description of what this element does (80 characters max).
/// </summary>
/// <remarks>
/// <para>
/// First paragraph: High-level context. Why does this exist? What problem does it solve?
/// </para>
/// <para>
/// <b>Key Characteristic:</b> Explain important behavioral aspects (thread-safety, mutability, idempotency).
/// </para>
/// <para>
/// <b>Usage Context:</b> When should this be used? When should it NOT be used?
/// </para>
/// <para>
/// <b>Design Rationale:</b> Why was this designed this way? What trade-offs were made?
/// </para>
/// <para>
/// <b>Future Considerations:</b> Known limitations, planned enhancements, TODOs.
/// </para>
/// </remarks>
/// <param name="parameterName">
/// What is this parameter? What are valid values? What happens if null/invalid?
/// </param>
/// <returns>
/// What is returned? When is null returned? What are edge cases?
/// </returns>
/// <exception cref="ExceptionType">
/// When is this thrown? What causes it? How should caller handle it?
/// </exception>
/// <example>
/// <code>
/// // Real working code showing typical usage
/// var result = MyMethod(validInput);
/// </code>
/// </example>
/// <seealso cref="RelatedType"/>
/// <seealso cref="RelatedMethod"/>
```

### Tag Usage Hierarchy

```plaintext
Class/Interface/Enum Documentation:
├── <summary>                    [Required] Brief description
├── <remarks>                    [Recommended] Detailed context
│   ├── <para>                   [Multiple] Logical sections
│   ├── <b>                      [As needed] Emphasis
│   ├── <c>                      [Inline] Code references
│   ├── <list type="bullet">     [Optional] Bullet points
│   ├── <list type="table">      [Optional] Structured data
│   └── <see cref="">            [As needed] Cross-references
├── <typeparam>                  [If generic] Type parameter description
├── <example>                    [Recommended] Usage examples
│   └── <code>                   [Required] Code block
└── <seealso cref="">            [Optional] Related types

Method/Property Documentation:
├── <summary>                    [Required] Brief description
├── <remarks>                    [Recommended] Detailed behavior
│   └── [Same structure as above]
├── <param>                      [Per parameter] Parameter context
├── <returns>                    [If non-void] Return value
├── <exception cref="">          [Per exception] Exception scenarios
├── <value>                      [Properties only] Property value description
└── <example>                    [Recommended] Usage sample
```

---

## Core Documentation Elements

### 1. Summary Tag (`<summary>`)

**Purpose**: One-sentence description visible in IntelliSense tooltips.

**Guidelines**:

- **80 characters maximum** (keep it concise)
- Start with a verb (Provides, Represents, Performs, Validates, etc.)
- Be specific and descriptive
- No implementation details

**Examples**:

```csharp
/// <summary>
/// Represents the main entry point for the arolariu.ro backend API.
/// </summary>

/// <summary>
/// Validates an object against a predicate and throws a specified exception type if validation fails.
/// </summary>

/// <summary>
/// Provides centralized activity sources for distributed tracing across application components.
/// </summary>
```

### 2. Remarks Tag (`<remarks>`)

**Purpose**: Multi-paragraph detailed explanation providing context, design rationale, and usage guidance.

**Guidelines**:

- Use `<para>` tags to separate logical sections
- Start with high-level context ("why does this exist?")
- Explain architectural alignment (DDD, The Standard, etc.)
- Document thread-safety, mutability, performance characteristics
- Include design decisions and trade-offs
- Mention known limitations and future enhancements

**Example**:

```csharp
/// <remarks>
/// <para>
/// The application follows a modular monolith architecture pattern with clearly separated domains:
/// - General domain: Core infrastructure, configuration, and cross-cutting concerns
/// - Invoices domain: Business logic for invoice processing, analysis, and management
/// - Authentication domain: User authentication and authorization services
/// </para>
/// <para>
/// The application is designed for deployment as a containerized service on Microsoft Azure,
/// utilizing Azure services for storage, configuration, monitoring, and AI capabilities.
/// </para>
/// <para>
/// Configuration is applied in two phases:
/// 1. Builder configuration: Sets up services, dependencies, and middleware
/// 2. Application configuration: Configures the request pipeline and routing
/// </para>
/// </remarks>
```

### 3. Parameter Tag (`<param>`)

**Purpose**: Explain parameter constraints, valid ranges, nullability, and what happens with invalid input.

**Guidelines**:

- Describe the parameter's purpose in context
- Specify valid/invalid values
- Document null handling (null-safe or throws?)
- Explain default values if applicable
- Reference related parameters if dependencies exist

**Example**:

```csharp
/// <param name="args">
/// Command-line arguments passed to the application. These are used by the ASP.NET Core host
/// for configuration overrides, environment specification, and other runtime parameters.
/// Common arguments include --environment, --urls, and custom configuration keys.
/// </param>

/// <param name="predicate">
/// The validation logic to apply. Must not be null.
/// Returns true if valid, false otherwise.
/// </param>

/// <param name="original">
/// The persisted (authoritative) invoice snapshot.
/// Must not be null. Serves as the base for merge operations.
/// </param>
```

### 4. Returns Tag (`<returns>`)

**Purpose**: Document what gets returned, when null is returned, and edge cases.

**Guidelines**:

- Describe the return value's meaning
- Specify when null/default is returned
- Document collection behavior (empty vs. null)
- Explain asynchronous return types (Task, ValueTask)

**Example**:

```csharp
/// <returns>
/// A new <see cref="Invoice"/> instance with immutable identity and sentinel defaults.
/// Never returns null. Collections are initialized to empty (not null).
/// </returns>

/// <returns>
/// The matching invoice or null when not found or soft-deleted.
/// </returns>

/// <returns>
/// Asynchronous task completing when the invoice has been persisted.
/// Throws exceptions on validation or dependency failures.
/// </returns>
```

### 5. Exception Tag (`<exception>`)

**Purpose**: Document what exceptions can be thrown, when, and why.

**Guidelines**:

- Reference specific exception types with `cref=""`
- Explain the condition that triggers the exception
- Provide context on how to avoid or handle it
- Use for exceptional cases, not normal flow

**Example**:

```csharp
/// <exception cref="ArgumentNullException">
/// Thrown when <paramref name="predicate"/> is null.
/// </exception>

/// <exception cref="InvoiceIdNotSetException">
/// Thrown when the invoice identifier is null, empty, or default value.
/// Validation occurs before broker calls in the Foundation layer.
/// </exception>
```

### 6. Example Tag (`<example>`)

**Purpose**: Provide real, working code samples showing typical usage.

**Guidelines**:

- Use `<code>` blocks for actual code
- Show realistic scenarios, not toy examples
- Include context (variable declarations, error handling)
- Demonstrate best practices
- Multiple examples for complex APIs

**Example**:

```csharp
/// <example>
/// <code>
/// // Validate a non-null object
/// Validator.ValidateAndThrow&lt;string, ArgumentNullException&gt;(
///     value,
///     v => !string.IsNullOrEmpty(v),
///     "Value cannot be null or empty");
///
/// // Validate business rules
/// Validator.ValidateAndThrow&lt;Order, InvalidOperationException&gt;(
///     order,
///     o => o.Total > 0,
///     "Order total must be greater than zero");
/// </code>
/// </example>
```

---

## Advanced Documentation Techniques

### 1. Structured Lists

Use `<list>` tags for hierarchical or tabular information.

#### Bullet Lists

```csharp
/// <para>
/// <b>Responsibilities:</b>
/// <list type="bullet">
///   <item><description>Create, read, update, delete (CRUD) invoice aggregates in the underlying store.</description></item>
///   <item><description>Enforce basic domain invariants prior to persistence (e.g., non-null identifiers, monetary value ranges).</description></item>
///   <item><description>Propagate domain / validation failures via strongly typed exceptions.</description></item>
/// </list>
/// </para>
```

#### Numbered Lists

```csharp
/// <para>
/// The startup sequence follows this order:
/// <list type="number">
///   <item><description>Create WebApplicationBuilder with default configuration sources</description></item>
///   <item><description>Add general domain configuration (logging, telemetry, health checks)</description></item>
///   <item><description>Add invoices domain configuration (business services, database contexts)</description></item>
///   <item><description>Build the WebApplication instance</description></item>
///   <item><description>Configure general application pipeline (middleware, routing)</description></item>
///   <item><description>Configure invoice domain pipeline (endpoints, authorization policies)</description></item>
///   <item><description>Start the application host</description></item>
/// </list>
/// </para>
```

#### Table Lists (Advanced)

```csharp
/// <list type="table">
/// <listheader>
///   <term>Field</term>
///   <term>Partial Considered Non-Default When</term>
///   <term>Merge Behavior</term>
///   <term>Notes</term>
/// </listheader>
/// <item>
///   <term>UserIdentifier</term>
///   <term>!= Guid.Empty</term>
///   <term>Replace</term>
///   <term>Owner transfer possible; no authorization guard here.</term>
/// </item>
/// <item>
///   <term>Items</term>
///   <term>Count > 0</term>
///   <term>Concatenate (original + partial)</term>
///   <term>No de-duplication; may introduce duplicates.</term>
/// </item>
/// </list>
```

### 2. Cross-References with `<see cref="">`

Link to related types, methods, properties, and members.

**Inline References**:

```csharp
/// <summary>
/// Represents the invoice aggregate root controlling line items, merchant linkage, payment details,
/// scan data, AI enrichment artifacts (recipes, categorization) and arbitrary extensible metadata
/// within the bounded invoices context.
/// </summary>
/// <remarks>
/// <para>
/// <b>Soft Delete Lifecycle:</b> When soft-deleted at the storage layer, the invoice and each contained
/// product are marked; queries exclude soft-deleted entities unless explicitly overridden.
/// See service layer deletion logic for cascade behavior.
/// </para>
/// <para>
/// <b>Sentinel Defaults:</b> <see cref="Guid.Empty"/> for <c>UserIdentifier</c> and <c>MerchantReference</c>,
/// <see cref="InvoiceCategory.NOT_DEFINED"/> for <c>Category</c>, and <see cref="InvoiceScan.Default()"/>
/// for <c>Scan</c> indicate an unenriched or unlinked state.
/// </para>
/// </remarks>
```

**Method References**:

```csharp
/// <para>
/// <b>Merge Semantics:</b> See <see cref="Merge(Invoice, Invoice)"/> for partial update precedence rules.
/// </para>
```

**Related Type References**:

```csharp
/// <seealso cref="IInvoiceStorageFoundationService"/>
/// <seealso cref="InvoiceNoSqlBroker"/>
```

### 3. Inline Formatting

Use inline tags for emphasis and code references:

- `<b>Bold Text</b>` — Emphasize important concepts
- `<c>InlineCode</c>` — Reference code elements inline
- `<em>Italic Text</em>` — Subtle emphasis (rarely used)

**Example**:

```csharp
/// <para>
/// <b>Thread-safety:</b> Not thread-safe. Do not share instances across threads without external synchronization.
/// Collections (<c>Items</c>, <c>PossibleRecipes</c>, <c>SharedWith</c>) preserve insertion order and allow duplicates.
/// </para>
```

### 4. Inheritance Documentation

Use `<inheritdoc/>` to inherit documentation from base classes or interfaces:

```csharp
public abstract class BaseEntity<T> : IAuditable
{
  /// <summary>
  /// Gets or sets the UTC timestamp when this entity was created.
  /// </summary>
  public DateTimeOffset CreatedAt { get; set; }
}

public class Invoice : BaseEntity<Guid>
{
  /// <inheritdoc/>
  /// <remarks>
  /// Automatically set to the current UTC time when the entity is created.
  /// This timestamp is immutable after entity creation to maintain audit integrity.
  /// </remarks>
  public override DateTimeOffset CreatedAt { get; set; }
}
```

### 5. Value Property Documentation

For properties, use `<value>` tag to describe what the property represents:

```csharp
/// <summary>
/// Activity source for the Common package operations.
/// </summary>
/// <value>
/// An <see cref="ActivitySource"/> with the name "arolariu.Backend.Common" for tracing common infrastructure operations.
/// </value>
/// <remarks>
/// This activity source covers:
/// - Configuration loading and management
/// - Key Vault secret retrieval operations
/// - Validation and utility operations
/// - Shared service interactions
/// </remarks>
public static readonly ActivitySource CommonPackageTracing = new("arolariu.Backend.Common");
```

---

## Documentation by Code Element Type

### Class Documentation

**Template**:

```csharp
/// <summary>
/// Brief description of what this class represents or does.
/// </summary>
/// <remarks>
/// <para>
/// <b>Purpose:</b> Why does this class exist? What problem does it solve?
/// </para>
/// <para>
/// <b>Architecture Context:</b> How does this fit into DDD, The Standard, or overall architecture?
/// </para>
/// <para>
/// <b>Responsibilities:</b>
/// <list type="bullet">
///   <item><description>Primary responsibility 1</description></item>
///   <item><description>Primary responsibility 2</description></item>
/// </list>
/// </para>
/// <para>
/// <b>Exclusions:</b> What this class explicitly does NOT do.
/// </para>
/// <para>
/// <b>Thread-safety:</b> Thread-safe? Not thread-safe? Immutable?
/// </para>
/// </remarks>
/// <example>
/// <code>
/// // Typical usage scenario
/// var instance = new MyClass(dependency);
/// instance.DoSomething();
/// </code>
/// </example>
public class MyClass { }
```

**Real Example (Program.cs)**:

```csharp
/// <summary>
/// Represents the main entry point for the arolariu.ro backend API.
/// This class configures and bootstraps a .NET 9.0 STS modular monolith web application.
/// </summary>
/// <remarks>
/// <para>
/// The application follows a modular monolith architecture pattern with clearly separated domains:
/// - General domain: Core infrastructure, configuration, and cross-cutting concerns
/// - Invoices domain: Business logic for invoice processing, analysis, and management
/// - Authentication domain: User authentication and authorization services
/// </para>
/// <para>
/// The application is designed for deployment as a containerized service on Microsoft Azure,
/// utilizing Azure services for storage, configuration, monitoring, and AI capabilities.
/// </para>
/// <para>
/// Configuration is applied in two phases:
/// 1. Builder configuration: Sets up services, dependencies, and middleware
/// 2. Application configuration: Configures the request pipeline and routing
/// </para>
/// </remarks>
internal static class Program { }
```

### Interface Documentation

**Template**:

```csharp
/// <summary>
/// Defines the contract for [specific functionality].
/// </summary>
/// <remarks>
/// <para>
/// <b>Layer Role (The Standard):</b> Explain which layer (Broker, Foundation, Processing, Orchestration, Exposer).
/// </para>
/// <para>
/// <b>Responsibilities:</b>
/// <list type="bullet">
///   <item><description>Contract responsibility 1</description></item>
///   <item><description>Contract responsibility 2</description></item>
/// </list>
/// </para>
/// <para>
/// <b>Implementations:</b> Reference concrete implementations with <see cref=""/>.
/// </para>
/// </remarks>
public interface IMyService { }
```

**Real Example (IInvoiceStorageFoundationService)**:

```csharp
/// <summary>
/// Foundation (core) storage contract for persisting and retrieving <see cref="Invoice"/> aggregates.
/// </summary>
/// <remarks>
/// <para>
/// <b>Layer Role (The Standard):</b> A foundation service encapsulates direct interaction with
/// persistence concerns (through brokers) plus essential domain validations. It MUST NOT coordinate
/// multi-aggregate workflows or invoke other foundation services.
/// </para>
/// <para>
/// <b>Responsibilities:</b>
/// <list type="bullet">
///   <item><description>Create, read, update, delete (CRUD) invoice aggregates in the underlying store.</description></item>
///   <item><description>Enforce basic domain invariants prior to persistence.</description></item>
///   <item><description>Propagate domain / validation failures via strongly typed exceptions.</description></item>
/// </list>
/// </para>
/// </remarks>
public interface IInvoiceStorageFoundationService { }
```

### Method Documentation

**Template**:

```csharp
/// <summary>
/// Brief description of what this method does (verb-led).
/// </summary>
/// <remarks>
/// <para>
/// <b>Behavior:</b> Detailed explanation of what happens when called.
/// </para>
/// <para>
/// <b>Validation:</b> What validations are performed?
/// </para>
/// <para>
/// <b>Side Effects:</b> Any state changes, external calls, telemetry?
/// </para>
/// <para>
/// <b>Idempotency:</b> Is this idempotent? Can it be called multiple times safely?
/// </para>
/// </remarks>
/// <param name="parameterName">Parameter description with constraints.</param>
/// <returns>Return value description.</returns>
/// <exception cref="ExceptionType">When thrown and why.</exception>
public void MyMethod(string parameterName) { }
```

**Real Example (CreateInvoiceObject)**:

```csharp
/// <summary>
/// Persists a new <see cref="Invoice"/> aggregate.
/// </summary>
/// <remarks>
/// <para>
/// <b>Validation:</b> Ensures invoice id is non-empty, required collections initialized,
/// and monetary totals non-negative.
/// </para>
/// <para>
/// <b>Failure Modes:</b> Throws validation exception on invariant breach; throws dependency
/// / dependency validation exceptions on broker failures or conflicts.
/// </para>
/// </remarks>
/// <param name="invoice">Fully formed invoice aggregate to persist.</param>
/// <param name="userIdentifier">Optional partition / tenant context for the invoice.</param>
/// <returns>Asynchronous task completing when invoice is persisted.</returns>
/// <exception cref="ArgumentNullException">If <paramref name="invoice"/> is null.</exception>
Task CreateInvoiceObject(Invoice invoice, Guid? userIdentifier = null);
```

### Property Documentation

**Template**:

```csharp
/// <summary>
/// Gets or sets [property description].
/// </summary>
/// <value>
/// Description of what the property value represents.
/// Explain valid values, ranges, defaults.
/// </value>
/// <remarks>
/// <para>
/// <b>Mutability:</b> Read-only? Mutable? Initialized when?
/// </para>
/// <para>
/// <b>Validation:</b> What constraints exist on values?
/// </para>
/// </remarks>
public string MyProperty { get; set; }
```

**Real Example (TenantId)**:

```csharp
/// <summary>
/// Gets or sets the Azure Active Directory tenant identifier.
/// This GUID identifies the Azure AD tenant for authentication and authorization operations.
/// </summary>
/// <value>
/// A GUID string representing the Azure AD tenant ID. Required for Azure-based authentication.
/// For local development, this may be empty if using alternative authentication mechanisms.
/// </value>
/// <remarks>
/// The tenant ID is used for:
/// - Azure AD authentication and token validation
/// - Multi-tenant application scenarios
/// - Azure service-to-service authentication
/// - Managed Identity configuration in Azure deployments
/// </remarks>
public string TenantId { get; set; } = string.Empty;
```

### Enum Documentation

**Template**:

```csharp
/// <summary>
/// Enumerates [what the enum represents].
/// </summary>
/// <remarks>
/// <para>
/// <b>Extensibility:</b> How can new values be added? Numeric spacing conventions?
/// </para>
/// <para>
/// <b>Analytics:</b> How is this used in analytics or reporting?
/// </para>
/// </remarks>
public enum MyEnum
{
  /// <summary>Sentinel; [description of default/unknown state].</summary>
  UNKNOWN = 0,

  /// <summary>[Description of this specific enum value].</summary>
  Value1 = 100,

  /// <summary>[Description of this specific enum value].</summary>
  Value2 = 200,
}
```

**Real Example (PaymentType)**:

```csharp
/// <summary>
/// Enumerates supported payment settlement methods.
/// </summary>
/// <remarks>
/// <para>
/// <b>Extensibility:</b> Reserve numeric spacing (increments of 100) for future methods;
/// sentinel <see cref="UNKNOWN"/> indicates unresolved extraction.
/// </para>
/// <para>
/// <b>Analytics:</b> Drives spend channel distribution reporting and potential loyalty program inference.
/// </para>
/// </remarks>
public enum PaymentType
{
  /// <summary>Sentinel; payment method not resolved from source.</summary>
  UNKNOWN = 0,

  /// <summary>Physical cash tender.</summary>
  CASH = 100,

  /// <summary>Payment card (credit / debit).</summary>
  CARD = 200,
}
```

### Value Object / Record Documentation

**Template**:

```csharp
/// <summary>
/// Value object capturing [domain concept].
/// </summary>
/// <remarks>
/// <para>
/// <b>Mutability:</b> Immutable (record) or mutable (class)? Why?
/// </para>
/// <para>
/// <b>Equality:</b> Value-based equality or reference equality?
/// </para>
/// <para>
/// <b>Thread-safety:</b> Thread-safe if immutable, otherwise document concurrency concerns.
/// </para>
/// </remarks>
public sealed record MyValueObject { }
```

**Real Example (PaymentInformation)**:

```csharp
/// <summary>
/// Value object capturing transactional payment attributes associated with an invoice.
/// </summary>
/// <remarks>
/// <para>
/// Encapsulates temporal data (<c>TransactionDate</c>), tender metadata (<c>PaymentType</c>),
/// monetary breakdown (<c>TotalCostAmount</c>, <c>TotalTaxAmount</c>) and currency context (<c>Currency</c>).
/// </para>
/// <para>
/// <b>Mutability:</b> Mutable to allow progressive enrichment (post-OCR correction, currency normalization).
/// Treated as an owned value object in persistence.
/// </para>
/// <para>
/// <b>Time Zone:</b> <c>TransactionDate</c> currently seeded with local system time; consider migrating
/// to UTC to prevent cross-time zone skew.
/// </para>
/// <para>
/// <b>Thread-safety:</b> Not thread-safe; confine to aggregate mutation scope.
/// </para>
/// </remarks>
public sealed record PaymentInformation { }
```

---

## Architectural Context in Documentation

### Referencing The Standard

Our codebase implements Hassan Habib's "The Standard" (RFC 2003). Documentation should reference layer responsibilities:

```csharp
/// <remarks>
/// <para>
/// <b>Layer Role (The Standard):</b> A broker is a thin abstraction over an external dependency (Cosmos DB).
/// It exposes primitive CRUD / query operations with minimal translation. It MUST NOT implement domain validation,
/// cross-aggregate orchestration, authorization, business workflow branching, or exception classification beyond
/// direct dependency errors.
/// </para>
/// </remarks>
```

### Referencing DDD Patterns

Link to Domain-Driven Design concepts (RFC 2001):

```csharp
/// <summary>
/// Represents the invoice aggregate root controlling line items, merchant linkage, payment details,
/// scan data, AI enrichment artifacts (recipes, categorization) and arbitrary extensible metadata
/// within the bounded invoices context.
/// </summary>
/// <remarks>
/// <para>
/// This aggregate encapsulates the canonical mutable state of an invoice. Identity (<c>id</c>) is
/// immutable (Version 7 GUID) and is never reassigned.
/// </para>
/// </remarks>
```

### Referencing OpenTelemetry (RFC 1001/2002)

Document telemetry integration:

```csharp
/// <remarks>
/// <para>
/// <b>Telemetry:</b> Activity scopes started for helper methods to ensure consistent trace spans.
/// See RFC 1001 and RFC 2002 for OpenTelemetry integration details.
/// </para>
/// </remarks>
```

### Documenting Design Trade-Offs

Explain why certain decisions were made:

```csharp
/// <remarks>
/// <para>
/// <b>Design Rationale:</b> Collections are mutable to allow progressive enrichment from OCR and AI services.
/// Immutability was considered but rejected due to the multi-stage enrichment workflow. A future refactoring
/// may introduce builder patterns if enrichment pipelines stabilize.
/// </para>
/// </remarks>
```

---

## Real-World Examples

### Example 1: Comprehensive Class Documentation

**File**: `src/Core/Program.cs`

```csharp
/// <summary>
/// Represents the main entry point for the arolariu.ro backend API.
/// This class configures and bootstraps a .NET 9.0 STS (Standard Terms Support) modular monolith web application
/// that provides invoice management and authentication services.
/// </summary>
/// <remarks>
/// <para>
/// The application follows a modular monolith architecture pattern with clearly separated domains:
/// - General domain: Core infrastructure, configuration, and cross-cutting concerns
/// - Invoices domain: Business logic for invoice processing, analysis, and management
/// - Authentication domain: User authentication and authorization services
/// </para>
/// <para>
/// The application is designed for deployment as a containerized service on Microsoft Azure,
/// utilizing Azure services for storage, configuration, monitoring, and AI capabilities.
/// </para>
/// <para>
/// Configuration is applied in two phases:
/// 1. Builder configuration: Sets up services, dependencies, and middleware
/// 2. Application configuration: Configures the request pipeline and routing
/// </para>
/// </remarks>
[ExcludeFromCodeCoverage]
internal static class Program
{
  /// <summary>
  /// The main entry point for the application.
  /// Configures and starts the web application with all required domains and services.
  /// </summary>
  /// <param name="args">
  /// Command-line arguments passed to the application. These are used by the ASP.NET Core host
  /// for configuration overrides, environment specification, and other runtime parameters.
  /// Common arguments include --environment, --urls, and custom configuration keys.
  /// </param>
  /// <remarks>
  /// <para>
  /// The startup sequence follows this order:
  /// 1. Create WebApplicationBuilder with default configuration sources
  /// 2. Add general domain configuration (logging, telemetry, health checks, etc.)
  /// 3. Add invoices domain configuration (business services, database contexts, etc.)
  /// 4. Build the WebApplication instance
  /// 5. Configure general application pipeline (middleware, routing, etc.)
  /// 6. Configure invoice domain pipeline (endpoints, authorization policies, etc.)
  /// 7. Start the application host
  /// </para>
  /// <para>
  /// Each domain is responsible for registering its own services and configuring its own
  /// middleware through extension methods, promoting separation of concerns and modularity.
  /// </para>
  /// </remarks>
  public static void Main(string[] args) { }
}
```

### Example 2: Aggregate Root with Merge Semantics

**File**: `src/Invoices/DDD/AggregatorRoots/Invoices/Invoice.cs`

```csharp
/// <summary>
/// Produces a new invoice aggregate representing a non-destructive merge of an original invoice
/// and a set of partial updates.
/// </summary>
/// <remarks>
/// <para>
/// <b>Identity:</b> The original <c>id</c> is preserved.
/// </para>
/// <para>
/// <b>Precedence Rules:</b> A field in <paramref name="partialUpdates"/> replaces the original
/// when it is non-sentinel / non-empty; otherwise the original value is retained. Collections
/// are <em>concatenated</em> without de-duplication.
/// </para>
/// <list type="table">
/// <listheader>
///   <term>Field</term>
///   <term>Partial Considered Non-Default When</term>
///   <term>Merge Behavior</term>
///   <term>Notes</term>
/// </listheader>
/// <item>
///   <term>UserIdentifier</term>
///   <term>!= Guid.Empty</term>
///   <term>Replace</term>
///   <term>Owner transfer possible; no authorization guard here.</term>
/// </item>
/// <item>
///   <term>Items</term>
///   <term>Count > 0</term>
///   <term>Concatenate (original + partial)</term>
///   <term>No de-duplication; may introduce duplicates.</term>
/// </item>
/// </list>
/// <para>
/// <b>Side Effects:</b> Original instances are left unmodified (pure functional merge).
/// Returned instance has updated audit counters (<c>NumberOfUpdates</c>, <c>LastUpdatedAt</c>).
/// </para>
/// <para>
/// <b>Thread-safety:</b> Not thread-safe; callers must ensure exclusive access to original
/// references during merge decision workflow.
/// </para>
/// </remarks>
/// <param name="original">The persisted (authoritative) invoice snapshot.</param>
/// <param name="partialUpdates">A partially populated invoice carrying candidate replacement values.</param>
/// <returns>A new invoice instance with merged state.</returns>
internal static Invoice Merge(Invoice original, Invoice partialUpdates) { }
```

### Example 3: Generic Validator with Multiple Audiences

**File**: `src/Common/Validators/Validator.cs`

```csharp
/// <summary>
/// Provides generic validation utilities for objects with custom predicate logic and exception handling.
/// This static class enables type-safe validation with configurable exception types.
/// </summary>
/// <remarks>
/// The Validator class supports:
/// - Generic object validation with custom predicates
/// - Configurable exception types for different validation scenarios
/// - Null safety with built-in null checks
/// - Dynamic exception creation with custom messages
/// </remarks>
/// <example>
/// <code>
/// // Validate a non-null object
/// Validator.ValidateAndThrow&lt;string, ArgumentNullException&gt;(
///     value,
///     v => !string.IsNullOrEmpty(v),
///     "Value cannot be null or empty");
///
/// // Validate business rules
/// Validator.ValidateAndThrow&lt;Order, InvalidOperationException&gt;(
///     order,
///     o => o.Total > 0,
///     "Order total must be greater than zero");
/// </code>
/// </example>
[ExcludeFromCodeCoverage]
public static class Validator
{
  /// <summary>
  /// Validates an object using custom logic and throws a specified exception type on failure.
  /// This is the main public entry point for object validation with configurable exception handling.
  /// </summary>
  /// <typeparam name="TObject">The type of object being validated.</typeparam>
  /// <typeparam name="TException">
  /// The exception type to throw on validation failure. Must inherit from Exception and have a string constructor.
  /// </typeparam>
  /// <param name="object">The object to validate against the predicate.</param>
  /// <param name="predicate">
  /// A function that defines the validation logic. Returns true if valid, false otherwise.
  /// </param>
  /// <param name="message">The error message to use when creating the exception.</param>
  /// <remarks>
  /// This method enables flexible validation scenarios:
  /// - Input parameter validation with ArgumentException
  /// - Business rule validation with custom exceptions
  /// - State validation with InvalidOperationException
  /// - Security validation with UnauthorizedAccessException
  /// </remarks>
  /// <exception cref="ArgumentNullException">
  /// Thrown when <paramref name="predicate"/> is null.
  /// </exception>
  public static void ValidateAndThrow<TObject, TException>(
    TObject? @object,
    Func<TObject?, bool> predicate,
    string message)
    where TException : Exception, new()
  { }
}
```

---

## Tooling Integration

### 1. IDE IntelliSense (Visual Studio / VS Code)

**How it Works**:

- XML comments appear in IntelliSense tooltips when hovering over types/members
- `<summary>` shows in quick info
- `<param>`, `<returns>`, `<exception>` show in signature help
- `<example>` code blocks can be viewed in extended documentation

**Best Practices**:

- Keep `<summary>` concise (80 chars) for tooltip readability
- Use `<remarks>` for extended information (users can expand)
- Provide `<example>` for complex APIs

### 2. DocFX Documentation Generation

**How it Works**:

- DocFX parses XML documentation comments from compiled assemblies
- Generates static HTML documentation sites
- Supports Markdown in XML comments
- Cross-references resolve automatically

**Configuration**:

```json
{
  "metadata": [
    {
      "src": [
        {
          "files": ["**/*.csproj"],
          "exclude": ["**/bin/**", "**/obj/**"]
        }
      ],
      "dest": "api",
      "includePrivateMembers": false,
      "disableGitFeatures": false,
      "disableDefaultFilter": false
    }
  ],
  "build": {
    "content": [
      {
        "files": ["api/**/*.yml", "api/index.md"]
      }
    ],
    "dest": "_site"
  }
}
```

### 3. Swagger / OpenAPI Generation

**How it Works**:

- `<summary>` becomes operation description
- `<param>` becomes parameter description
- `<returns>` becomes response description
- `<remarks>` can be included in extended info

**Configuration** (Swashbuckle):

```csharp
services.AddSwaggerGen(c =>
{
  c.SwaggerDoc("v1", new OpenApiInfo { Title = "arolariu.ro API", Version = "v1" });

  // Include XML comments
  var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
  var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
  c.IncludeXmlComments(xmlPath);
});
```

### 4. .NET Compiler Integration

**Enable XML Documentation Generation**:

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <GenerateDocumentationFile>true</GenerateDocumentationFile>
    <NoWarn>$(NoWarn);1591</NoWarn> <!-- Suppress missing XML doc warnings -->
  </PropertyGroup>
</Project>
```

**Warnings as Errors (Strict Mode)**:

```xml
<PropertyGroup>
  <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
  <WarningsAsErrors>CS1591</WarningsAsErrors> <!-- Missing XML comment for publicly visible type or member -->
</PropertyGroup>
```

---

## Quality Guidelines

### 1. Completeness

✅ **Document**:

- All public types (classes, interfaces, enums, structs, records)
- All public members (methods, properties, fields, events)
- All protected members (visible to derived classes)
- Internal types/members in core infrastructure

❌ **Skip**:

- Private implementation details (unless complex algorithms)
- Trivial getters/setters without logic
- Auto-generated code

### 2. Clarity

✅ **Good**:

```csharp
/// <summary>
/// Validates an invoice's payment information before persisting to the database.
/// </summary>
/// <remarks>
/// <para>
/// Ensures that total cost amount is non-negative, currency is specified, and
/// transaction date is not in the future. Validation failures throw domain-specific
/// exceptions to be handled by the presentation layer.
/// </para>
/// </remarks>
```

❌ **Bad**:

```csharp
/// <summary>
/// Validates invoice payment info.
/// </summary>
```

### 3. Accuracy

✅ **Good**:

```csharp
/// <returns>
/// The matching invoice or null when not found or soft-deleted.
/// </returns>
```

❌ **Bad**:

```csharp
/// <returns>Invoice</returns>
```

### 4. Consistency

**Use Consistent Terminology**:

- "Aggregate root" (DDD) vs. "Entity" (generic)
- "Foundation service" (The Standard) vs. "Repository" (generic)
- "Broker" (The Standard) vs. "Data access layer" (generic)

**Consistent Phrasing**:

- Start `<summary>` with verbs: "Provides", "Represents", "Validates", "Performs"
- Start `<remarks>` with context: "This [class/method] is responsible for..."
- Start `<param>` with description: "The [noun] to [verb]..."

### 5. Depth

**Provide Multi-Level Context**:

```csharp
/// <summary>
/// Persists a new invoice aggregate to Cosmos DB.
/// </summary>
/// <remarks>
/// <para>
/// <b>Layer (The Standard):</b> Foundation service (broker-neighboring).
/// Validates input and delegates to database broker.
/// </para>
/// <para>
/// <b>Validation:</b> Structural validation (non-null id, initialized collections)
/// and logical validation (non-negative amounts, valid currency).
/// </para>
/// <para>
/// <b>Idempotency:</b> NOT idempotent. Duplicate invocations create duplicate invoices
/// unless id uniqueness constraints are enforced at broker level.
/// </para>
/// <para>
/// <b>Performance:</b> Single-document write operation. Typical latency: 5-20ms
/// (partition-scoped) or 50-100ms (cross-partition).
/// </para>
/// <para>
/// <b>Future:</b> Add optimistic concurrency control (ETag) to prevent lost updates.
/// </para>
/// </remarks>
```

---

## Common Anti-Patterns

### ❌ Anti-Pattern 1: Repeating Method Signature

**Bad**:

```csharp
/// <summary>
/// Creates an invoice.
/// </summary>
/// <param name="invoice">Invoice</param>
public void CreateInvoice(Invoice invoice) { }
```

**Good**:

```csharp
/// <summary>
/// Persists a new invoice aggregate to the underlying data store with validation.
/// </summary>
/// <param name="invoice">
/// Fully populated invoice aggregate with required fields (id, UserIdentifier, Items).
/// Must not be null.
/// </param>
/// <exception cref="ArgumentNullException">When <paramref name="invoice"/> is null.</exception>
public void CreateInvoice(Invoice invoice) { }
```

### ❌ Anti-Pattern 2: Vague Summaries

**Bad**:

```csharp
/// <summary>
/// Handles invoice operations.
/// </summary>
```

**Good**:

```csharp
/// <summary>
/// Foundation service responsible for CRUD operations on invoice aggregates with domain validation.
/// </summary>
```

### ❌ Anti-Pattern 3: Missing Exception Documentation

**Bad**:

```csharp
/// <summary>Validates identifier.</summary>
public void ValidateId(Guid id)
{
  if (id == Guid.Empty) throw new ArgumentException("Invalid ID");
}
```

**Good**:

```csharp
/// <summary>
/// Validates that the provided invoice identifier is non-empty and non-default.
/// </summary>
/// <param name="id">Invoice identifier to validate.</param>
/// <exception cref="ArgumentException">
/// Thrown when <paramref name="id"/> is <see cref="Guid.Empty"/> or default.
/// </exception>
public void ValidateId(Guid id) { }
```

### ❌ Anti-Pattern 4: Implementation Details in Summary

**Bad**:

```csharp
/// <summary>
/// Calls the Cosmos DB SDK to insert a document into the invoices container
/// using partition key UserIdentifier.
/// </summary>
```

**Good**:

```csharp
/// <summary>
/// Persists a new invoice aggregate to the database.
/// </summary>
/// <remarks>
/// <para>
/// <b>Implementation:</b> Uses Cosmos DB SDK with partition-scoped writes for optimal performance.
/// Partition key is derived from <c>UserIdentifier</c>.
/// </para>
/// </remarks>
```

### ❌ Anti-Pattern 5: Outdated Documentation

**Bad** (code changed, docs didn't):

```csharp
/// <summary>Returns all invoices from database.</summary>
public async Task<IEnumerable<Invoice>> GetInvoices(Guid userId) { } // NOW: User-scoped
```

**Good**:

```csharp
/// <summary>
/// Retrieves all invoices for a specific user partition.
/// </summary>
/// <param name="userId">User identifier acting as partition key for scoped query.</param>
/// <returns>Collection of invoices owned by the user. Empty if none found.</returns>
public async Task<IEnumerable<Invoice>> GetInvoices(Guid userId) { }
```

---

## Documentation Checklist

Use this checklist when documenting new code:

### Class/Interface/Enum

- [ ] `<summary>` tag present and concise (< 80 chars)
- [ ] `<remarks>` explains purpose and architectural context
- [ ] `<remarks>` documents thread-safety / mutability
- [ ] `<remarks>` explains design trade-offs
- [ ] `<remarks>` references related RFCs or patterns (DDD, The Standard)
- [ ] `<example>` provided for complex types
- [ ] All public members documented

### Method/Property

- [ ] `<summary>` describes what (not how)
- [ ] `<remarks>` explains behavior, validation, side effects
- [ ] All `<param>` tags present with constraints
- [ ] `<returns>` explains return value (when null, edge cases)
- [ ] All thrown `<exception>` tags documented
- [ ] `<example>` provided for non-obvious usage
- [ ] Cross-references to related members (`<see cref="">`)

### Parameters

- [ ] Describes purpose, not just repeating parameter name
- [ ] Documents valid/invalid values
- [ ] Explains nullability (null-safe? throws?)
- [ ] References related parameters if dependencies exist

### Returns

- [ ] Explains what gets returned
- [ ] Documents when null/default is returned
- [ ] Explains collection behavior (empty vs. null)
- [ ] Documents asynchronous semantics (Task, ValueTask)

### Exceptions

- [ ] All thrown exceptions documented
- [ ] Explains condition triggering exception
- [ ] References parameter causing exception
- [ ] Provides guidance on handling

---

## Conclusion

The arolariu.ro backend codebase employs an **enterprise-grade, tutorial-level XML documentation standard** that goes far beyond typical C# comments. This documentation serves as:

1. **Living Architecture Documentation**: Design decisions embedded in code
2. **API Reference Material**: Auto-generated documentation for consumers
3. **Onboarding Material**: New developers learn architecture through IntelliSense
4. **Quality Enforcement**: Documentation review catches design inconsistencies
5. **Maintenance Aid**: Future changes informed by documented rationale

### Key Takeaways

✅ **Document the Why, Not Just the What**: Code shows implementation; documentation explains context

✅ **Use Full XML Tag Set**: `<summary>`, `<remarks>`, `<para>`, `<list>`, `<see cref="">`, `<example>`

✅ **Provide Multi-Level Context**: Quick summary → Detailed behavior → Design rationale → Future plans

✅ **Cross-Reference Architecture**: Link to RFCs, DDD patterns, The Standard principles

✅ **Write for Multiple Audiences**: Developers, API consumers, new team members, tooling

✅ **Maintain Documentation**: Update docs when code changes (treat as first-class code)

This standard ensures that every piece of code is self-documenting, contextually rich, and pedagogically valuable—transforming the codebase into a **living technical manual** that teaches while it functions.

---

## References

- **C# XML Documentation Comments**: <https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/xmldoc/>
- **DocFX Documentation Generator**: <https://dotnet.github.io/docfx/>
- **Swashbuckle (Swagger for .NET)**: <https://github.com/domaindrivendev/Swashbuckle.AspNetCore>
- **RFC 2001**: Domain-Driven Design Architecture (`docs/rfc/2001-domain-driven-design-architecture.md`)
- **RFC 2003**: The Standard Implementation (`docs/rfc/2003-the-standard-implementation.md`)
- **RFC 1001**: OpenTelemetry Observability System (`docs/rfc/1001-opentelemetry-observability-system.md`)

---

**Document Version**: 1.0.0
**Last Updated**: 2025-01-26
**Maintainer**: Alexandru Olariu ([@arolariu](https://github.com/arolariu))
