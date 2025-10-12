# Backend Documentation

This directory contains technical documentation for the backend components of the arolariu.ro platform.

## Overview

The backend is built using:
- **Framework**: .NET 10.0 (Current)
- **Language**: C# 13 with modern language features
- **Architecture**: Modular Monolith
- **Design Patterns**: Domain-Driven Design (DDD) + SOLID principles
- **API Style**: ASP.NET Core Minimal APIs
- **Testing**: xUnit

## Architecture

### Modular Monolith Structure

```
src/
├── Core/              # Application entry point and pipeline configuration
├── Core.Auth/         # Authentication domain
├── Common/            # Shared infrastructure and cross-cutting concerns
└── Invoices/          # Invoices domain (business logic)
```

### Domain-Driven Design Principles

- **Bounded Contexts**: Clear service boundaries
- **Aggregates**: Root entities maintaining consistency
- **Value Objects**: Immutable domain concepts
- **Domain Events**: Business-significant state changes
- **Domain Services**: Complex operations across aggregates
- **Repositories**: Aggregate persistence abstraction
- **Ubiquitous Language**: Consistent business terminology

### SOLID Principles

- **S**ingle Responsibility Principle
- **O**pen/Closed Principle
- **L**iskov Substitution Principle
- **I**nterface Segregation Principle
- **D**ependency Inversion Principle

## RFCs (Request for Comments)

RFCs document major architectural decisions, design patterns, and technical implementations.

### Implemented RFCs

| RFC # | Title | Status | Date | Description |
|-------|-------|--------|------|-------------|
| [1000](./rfc/1000-domain-driven-design-architecture.md) | Domain-Driven Design Architecture | ✅ Implemented | 2025-10-12 | Complete DDD architecture with modular monolith, SOLID principles, and bounded contexts |

### Proposed RFCs

None currently.

### Draft RFCs

None currently.

## Key Topics

### Architecture Patterns
- Modular monolith organization
- DDD aggregate design
- Domain event handling
- Repository pattern implementation
- Dependency injection strategies

### API Design
- Minimal API patterns
- RESTful conventions
- GraphQL endpoints (if implemented)
- gRPC services (if implemented)
- API versioning strategy

### Data Access
- Entity Framework Core usage
- Database migrations
- Query optimization
- Transaction management
- Caching strategies

### Authentication & Authorization
- JWT token validation
- Role-based access control
- External identity providers
- API key management

### Testing
- Unit testing with xUnit
- Integration testing patterns
- Test naming conventions: `MethodName_Condition_ExpectedResult()`
- Test coverage standards (85%+)
- Mocking strategies

### Observability
- Structured logging
- OpenTelemetry integration
- Health checks
- Metrics collection

### Security
- Input validation
- SQL injection prevention
- XSS protection
- CSRF protection
- Secrets management
- GDPR/LGPD compliance

## Domains

### General Domain (Core Infrastructure)

**Responsibilities:**
- Application bootstrapping
- Middleware pipeline
- CORS configuration
- Authentication/Authorization setup
- Logging and telemetry
- Health checks
- OpenAPI/Swagger documentation

### Invoices Domain

**Responsibilities:**
- Invoice CRUD operations
- Merchant management
- Product/line item handling
- Invoice metadata
- Business rule validation

**Key Aggregates:**
- Invoice (root)
- Merchant
- Product

### Authentication Domain (Core.Auth)

**Responsibilities:**
- User authentication
- Authorization policies
- JWT token management
- External provider integration

## Related Documentation

- **Site README**: `/sites/api.arolariu.ro/README.md` - Development setup guide
- **API Documentation**: `/sites/docs.arolariu.ro/api/` - Generated XML documentation
- **Copilot Instructions**: `/.github/instructions/backend.instructions.md` - DDD & SOLID guidelines
- **Infrastructure**: `/infra/Azure/Bicep/` - Azure deployment configurations

## Creating Backend RFCs

When creating a new backend RFC:

1. Use the RFC template from `/docs/RFC_TEMPLATE.md`
2. Number it starting from 1000 (1000, 1001, etc.)
3. Place in `/docs/backend/rfc/`
4. Update this README with the new RFC entry
5. Submit for review

### Suggested Topics for Future RFCs

- **RFC 1000**: Domain event architecture and implementation
- **RFC 1001**: Repository pattern and data access strategy
- **RFC 1002**: API versioning and backward compatibility
- **RFC 1003**: Background job processing architecture
- **RFC 1004**: Multi-tenancy implementation
- **RFC 1005**: Caching strategy (distributed cache, in-memory)
- **RFC 1006**: Rate limiting and throttling
- **RFC 1007**: Audit logging and compliance
- **RFC 1008**: Database migration strategy
- **RFC 1009**: Error handling and response standardization

## Code Quality Standards

All backend code must follow:

- ✅ DDD principles and patterns
- ✅ SOLID design principles
- ✅ Ubiquitous language from business domain
- ✅ Test naming: `MethodName_Condition_ExpectedResult()`
- ✅ XML documentation for public APIs
- ✅ 85%+ code coverage for domain and application layers
- ✅ async/await for I/O-bound operations
- ✅ Proper exception handling and logging

## Questions?

For backend-specific questions:
- Check existing RFCs (when available)
- Review site README
- Review DDD/SOLID instructions
- Open a GitHub issue
- Contact: admin@arolariu.ro

---

**Last Updated**: 2025-10-12
**Maintained By**: Backend team
