# api.arolariu.ro - Backend API

This is the backend API service for arolariu.ro, built with ASP.NET Core.

## E2E Testing

The backend API includes a Postman collection for end-to-end testing:

### Postman Collection

Location: `postman-collection.json`

The collection contains comprehensive tests for all API endpoints:
- Invoice management (CRUD operations)
- Merchant management
- Invoice products
- Invoice metadata
- Invoice scans

### Running Tests

#### Using npm script:
```bash
npm run test:e2e:backend
```

#### Using Newman directly:
```bash
newman run sites/api.arolariu.ro/postman-collection.json
```

### Collection Variables

The collection uses the following variables:
- `baseUrl`: Constructed as `{{baseProtocol}}://{{baseHost}}`
- `baseHost`: `api.arolariu.ro` (production) or your local host
- `baseProtocol`: `https` (production) or `http` (local)
- `authToken`: JWT token for authentication (injected during test runs)

**Note**: The collection intentionally omits port numbers for HTTPS (443) and HTTP (80) as these are default ports and including them explicitly can cause issues with some reverse proxies and load balancers.

### Authentication

Tests require a valid JWT token set via the `E2E_TEST_AUTH_TOKEN` environment variable:

```bash
export E2E_TEST_AUTH_TOKEN="your-jwt-token"
npm run test:e2e:backend
```

## Development

For local development, you can modify the collection variables to point to your local instance:
- `baseHost`: `localhost` or `127.0.0.1`
- `baseProtocol`: `http`
- `basePort`: `5000` or your local port (if not using default HTTP/HTTPS ports)
