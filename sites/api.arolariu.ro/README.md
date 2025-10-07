# api.arolariu.ro - Backend API

A **modular monolith** backend API built with **.NET 9.0 STS** following **Domain-Driven Design (DDD)** principles and **SOLID** patterns.

---

## 🏗️ Architecture

### Modular Monolith Pattern

The API is organized as a modular monolith with distinct bounded contexts:

```
src/
├── Core/              # Application entry point and pipeline configuration
├── Core.Auth/         # Authentication domain (user authentication services)
├── Common/            # Shared infrastructure and cross-cutting concerns
└── Invoices/          # Invoices domain (business logic for invoice management)
```

### Domain-Driven Design

Each domain follows DDD principles:

- **Bounded Contexts**: Clear service boundaries with well-defined responsibilities
- **Aggregates**: Root entities maintaining consistency boundaries and transactional integrity
- **Value Objects**: Immutable objects representing domain concepts
- **Domain Events**: Business-significant state changes captured and propagated
- **Domain Services**: Stateless services for complex operations involving multiple aggregates
- **Repositories**: Aggregate persistence using interfaces defined in the domain layer
- **Ubiquitous Language**: Consistent business terminology across code and documentation

### SOLID Principles

The codebase adheres to SOLID design patterns:

- **Single Responsibility Principle (SRP)**: Each class has one reason to change
- **Open/Closed Principle (OCP)**: Open for extension, closed for modification
- **Liskov Substitution Principle (LSP)**: Subtypes are substitutable for base types
- **Interface Segregation Principle (ISP)**: Focused interfaces, no forced dependencies
- **Dependency Inversion Principle (DIP)**: Depends on abstractions, not concretions

---

## 🚀 Technology Stack

- **Framework**: .NET 9.0 STS (Standard Term Support)
- **Language**: C# 13 with modern language features
- **API Pattern**: ASP.NET Core Minimal APIs
- **Dependency Injection**: Built-in DI container
- **Documentation**: OpenAPI/Swagger with Swashbuckle
- **Testing**: xUnit with comprehensive unit and integration tests
- **Logging**: Microsoft.Extensions.Logging with structured logging
- **Telemetry**: OpenTelemetry for observability
- **Health Checks**: Built-in health check middleware

---

## 📦 Domain Structure

### General Domain (Core Infrastructure)

**Responsibilities:**
- Application configuration and bootstrapping
- Middleware pipeline setup (CORS, authentication, authorization)
- Logging, telemetry, and health checks
- OpenAPI/Swagger documentation
- Cross-cutting concerns

**Key Components:**
- `GeneralDomainExtensions.cs`: Service registration and configuration
- `GeneralApplicationConfiguration.cs`: Middleware pipeline setup

### Invoices Domain

**Responsibilities:**
- Invoice management (CRUD operations)
- Merchant management
- Invoice products and line items
- Invoice metadata and scanning
- Business rules and validation

**Key Aggregates:**
- **Invoice**: Root aggregate for invoice data
- **Merchant**: Merchant information and relationships
- **Product**: Invoice line items and products

**Domain Events:**
- Invoice created, updated, deleted
- Merchant associated, updated
- Product added, modified, removed

### Authentication Domain (Core.Auth)

**Responsibilities:**
- User authentication
- Authorization policies
- JWT token validation
- External identity provider integration

---

## 🛠️ Development

### Prerequisites

- [.NET 9.0 SDK](https://dotnet.microsoft.com/download/dotnet/9.0) or later
- [Docker](https://www.docker.com/) (optional, for containerized development)
- IDE: [Visual Studio 2022](https://visualstudio.microsoft.com/), [Rider](https://www.jetbrains.com/rider/), or [VS Code](https://code.visualstudio.com/)

### Local Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/arolariu/arolariu.ro.git
   cd arolariu.ro/sites/api.arolariu.ro
   ```

2. **Restore dependencies:**
   ```bash
   dotnet restore
   ```

3. **Build the project:**
   ```bash
   dotnet build
   ```

4. **Run the application:**
   ```bash
   dotnet run --project src/Core/arolariu.Backend.Core.csproj
   ```

5. **Access the API:**
   - API: `http://localhost:5000` or `https://localhost:5001`
   - Swagger UI: `http://localhost:5000/` or `https://localhost:5001/`
   - OpenAPI JSON: `http://localhost:5000/swagger/v1/swagger.json`

### Running Tests

#### Unit Tests
```bash
dotnet test tests/arolariu.Backend.Core.Tests/
dotnet test tests/arolariu.Backend.Domain.Tests/
```

#### All Tests
```bash
dotnet test
```

#### Test Coverage
```bash
dotnet test --collect:"XPlat Code Coverage"
```

**Test Naming Convention:** Tests follow the pattern `MethodName_Condition_ExpectedResult()`

Example:
```csharp
[Fact(DisplayName = "Invoice creation succeeds with valid data")]
public void CreateInvoice_WithValidData_ReturnsSuccessResult()
{
    // Arrange
    var invoice = CreateTestInvoice();
    
    // Act
    var result = _invoiceService.Create(invoice);
    
    // Assert
    Assert.NotNull(result);
    Assert.True(result.IsSuccess);
}
```

---

## 🧪 E2E Testing

### Postman Collection

**Location:** `postman-collection.json`

The collection contains comprehensive tests for all API endpoints:
- **Invoices**: CRUD operations, filtering, pagination
- **Merchants**: Management and relationships
- **Products**: Invoice line items
- **Metadata**: Invoice metadata management
- **Scans**: Invoice scanning and OCR

### Running E2E Tests

#### Using npm script (from repository root):
```bash
npm run test:e2e:backend
```

#### Using Newman directly:
```bash
# Install Newman globally
npm install -g newman

# Run collection
newman run sites/api.arolariu.ro/postman-collection.json

# Run with environment
newman run sites/api.arolariu.ro/postman-collection.json \
  --env-var "authToken=your-jwt-token"
```

### Collection Variables

| Variable | Production | Local Development |
|----------|-----------|-------------------|
| `baseUrl` | `https://api.arolariu.ro` | `http://localhost:5000` |
| `baseHost` | `api.arolariu.ro` | `localhost` |
| `baseProtocol` | `https` | `http` |
| `authToken` | *JWT token* | *JWT token* |

**Important:** The collection intentionally omits port numbers for HTTPS (443) and HTTP (80) as these are default ports. Including them explicitly can cause issues with reverse proxies and load balancers.

### Authentication

E2E tests require a valid JWT token:

```bash
# Set environment variable
export E2E_TEST_AUTH_TOKEN="your-jwt-token"

# Run tests
npm run test:e2e:backend
```

---

## 🐳 Docker

### Building the Image

```bash
docker build -t api.arolariu.ro:latest .
```

### Running the Container

```bash
docker run -d \
  -p 8080:8080 \
  -e ASPNETCORE_ENVIRONMENT=Production \
  --name api-arolariu \
  api.arolariu.ro:latest
```

### Health Check

The Docker image includes a health check endpoint:

```bash
curl http://localhost:8080/health
```

Expected response:
```json
{
  "status": "Healthy",
  "totalDuration": "00:00:00.0012642",
  "entries": {}
}
```

---

## 📋 API Documentation

### Swagger UI

Interactive API documentation is available at:
- **Production:** `https://api.arolariu.ro/`
- **Local:** `http://localhost:5000/`

### OpenAPI Specification

Retrieve the OpenAPI JSON specification:
- **Swagger Format:** `/swagger/v1/swagger.json`
- **Microsoft Format:** `/openapi/v1.json`

### Example Endpoints

#### Get All Invoices
```http
GET /rest/v1/invoices
Authorization: Bearer {JWT_TOKEN}
```

#### Create Invoice
```http
POST /rest/v1/invoices
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json

{
  "userIdentifier": "user-guid",
  "metadata": {
    "author": "John Doe"
  }
}
```

#### Get Invoice by ID
```http
GET /rest/v1/invoices/{invoiceId}
Authorization: Bearer {JWT_TOKEN}
```

---

## 🔒 Security & Compliance

### Security Features

- **Authentication**: JWT bearer token authentication
- **Authorization**: Role-based and policy-based authorization
- **CORS**: Configured for trusted origins only
- **HTTPS**: Required in production environments
- **Input Validation**: Comprehensive validation at API boundaries
- **SQL Injection Protection**: Parameterized queries via Entity Framework Core
- **XSS Protection**: Output encoding and Content Security Policy headers

### Compliance

The API is designed with compliance in mind:
- **PCI-DSS**: Payment card data handling requirements
- **SOX**: Financial reporting controls
- **LGPD**: Brazilian data protection regulations
- **Audit Trails**: Complete audit history via domain events

---

## 📊 Monitoring & Observability

### Health Checks

**Endpoint:** `/health`

Monitors:
- Application health
- Database connectivity
- External service dependencies

### Logging

Structured logging with:
- **Console**: Development environment
- **Application Insights**: Production environment
- **Log Levels**: Trace, Debug, Information, Warning, Error, Critical

### Telemetry

OpenTelemetry integration:
- **Traces**: Distributed tracing across services
- **Metrics**: Performance and business metrics
- **Correlation**: Request correlation IDs

---

## 🚢 Deployment

### Azure App Service

The API is deployed as a containerized application to Azure App Service.

**Configuration:**
- Auto-scaling based on CPU and memory
- Always On enabled
- HTTP/2 support
- Minimum TLS 1.2

### Environment Variables

Required environment variables:
- `ASPNETCORE_ENVIRONMENT`: `Production` or `Development`
- `APPINSIGHTS_INSTRUMENTATIONKEY`: Application Insights key
- `APPLICATIONINSIGHTS_CONNECTION_STRING`: Application Insights connection

---

## 🤝 Contributing

### Code Quality Standards

- Follow **DDD principles** and **SOLID patterns**
- Use **ubiquitous language** from the business domain
- Write **comprehensive tests** with `MethodName_Condition_ExpectedResult()` naming
- Document **public APIs** with XML documentation comments
- Maintain **85%+ code coverage** for domain and application layers
- Use **async/await** for I/O-bound operations
- Implement **proper exception handling** and logging

### Pull Request Process

1. Create a feature branch from `preview`
2. Implement changes following DDD and SOLID principles
3. Write or update tests
4. Update documentation
5. Ensure all tests pass and code coverage meets standards
6. Submit PR with clear description of changes

---

## 📚 Additional Resources

- [.NET Documentation](https://docs.microsoft.com/en-us/dotnet/)
- [Domain-Driven Design](https://martinfowler.com/tags/domain%20driven%20design.html)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [ASP.NET Core](https://docs.microsoft.com/en-us/aspnet/core/)
- [xUnit Testing](https://xunit.net/)

---

## 📄 License

This project is part of the arolariu.ro platform.

For questions or support, contact: [admin@arolariu.ro](mailto:admin@arolariu.ro)
