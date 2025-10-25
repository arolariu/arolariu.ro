# Frontend Documentation

This directory contains technical documentation for the frontend components of the arolariu.ro platform.

## Overview

The frontend is built using:
- **Framework**: Next.js 16.0.0-beta.0 with App Router
- **Language**: TypeScript 5.9.3 (strict mode)
- **UI Library**: React 19.2.0 with Server Components
- **Styling**: Tailwind CSS v4.1.14
- **State Management**: Zustand v5.0.8
- **Testing**: Jest + Playwright

## RFCs (Request for Comments)

Frontend RFCs are numbered **1000-1999** and located in `/docs/rfc/`.

### Implemented RFCs

| RFC # | Title | Status | Date | Description |
|-------|-------|--------|------|-------------|
| [1001](../rfc/1001-opentelemetry-observability-system.md) | OpenTelemetry Observability System | ✅ Implemented | 2025-10-11 | Comprehensive observability system using OpenTelemetry SDK for Next.js |
| [1002](../rfc/1002-comprehensive-jsdoc-documentation-standard.md) | JSDoc/TSDoc Documentation Standard | ✅ Implemented | 2025-01-26 | Comprehensive JSDoc documentation standard for TypeScript/React |
| [1003](../rfc/1003-next-intl-internationalization-system.md) | next-intl Internationalization System | ✅ Implemented | 2025-10-25 | Multi-language support with next-intl and type-safe translations |
| [1004](../rfc/1004-metadata-seo-system.md) | Metadata and SEO System | ✅ Implemented | 2025-10-25 | Centralized metadata management and SEO optimization |

### Proposed RFCs

None currently.

### Draft RFCs

None currently.

## Quick Start Guides

Practical, developer-focused guides for implementing common patterns:

- **[JSDoc Guide](./jsdoc-guide.md)** - How to document TypeScript/React code (RFC 1002)
- **[i18n Guide](./i18n-guide.md)** - How to add translations and multi-language support (RFC 1003)
- **[Metadata Guide](./metadata-guide.md)** - How to implement SEO and metadata (RFC 1004)
- **[OpenTelemetry Guide](./opentelemetry-guide.md)** - How to implement distributed tracing and observability (RFC 1001)

## Key Topics

### Architecture
- Next.js App Router patterns
- Server vs Client component patterns
- React Server Components usage
- API route handlers
- Middleware implementation

### State Management
- Zustand stores for global state
- React Context for component trees
- Server Actions for mutations
- Form state management

### Performance
- Code splitting strategies
- Image optimization
- Lazy loading
- Caching strategies
- Bundle size optimization

### Testing
- Unit testing with Jest
- Integration testing strategies
- E2E testing with Playwright
- Component testing best practices

### Observability
- OpenTelemetry integration (see [OpenTelemetry Guide](./opentelemetry-guide.md) (RFC 1001))
- Logging strategies
- Error tracking
- Performance monitoring

### Security
- Authentication with Clerk
- Authorization patterns
- Input validation
- XSS prevention
- CSRF protection

## Related Documentation

- **Site README**: `/sites/arolariu.ro/README.md` - Development setup guide
- **Component Library**: `/packages/components/readme.md` - Shared UI components
- **API Documentation**: `/sites/docs.arolariu.ro/api/arolariu/Frontend/` - Generated API docs
- **Copilot Instructions**: `/.github/copilot-instructions.md` - Coding standards

## Creating Frontend RFCs

When creating a new frontend RFC:

1. Use the RFC template from `/docs/RFC_TEMPLATE.md`
2. Number it in the 1000-1999 range (1002, 1003, etc.)
3. Place in `/docs/rfc/`
4. Update this README with the new RFC entry
5. Submit for review

### Suggested Topics for Future RFCs

- Server Actions patterns and best practices
- Component library architecture
- Form handling strategy
- Progressive Web App (PWA) features
- Client-side caching strategy

## Questions?

For frontend-specific questions:

- Check existing RFCs
- Review site README
- Open a GitHub issue
- Contact: <admin@arolariu.ro>

---

**Last Updated**: 2025-10-25
**Maintained By**: Frontend team
