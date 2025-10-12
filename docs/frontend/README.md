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

RFCs document major architectural decisions, design patterns, and technical implementations.

### Implemented RFCs

| RFC # | Title | Status | Date | Description |
|-------|-------|--------|------|-------------|
| [0001](./rfc/0001-opentelemetry-observability-system.md) | OpenTelemetry Observability System | ✅ Implemented | 2025-10-11 | Comprehensive observability system using OpenTelemetry SDK for Next.js |

### Proposed RFCs

None currently.

### Draft RFCs

None currently.

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
- OpenTelemetry integration (RFC 0001)
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
2. Number it sequentially (0002, 0003, etc.)
3. Place in `/docs/frontend/rfc/`
4. Update this README with the new RFC entry
5. Submit for review

### Suggested Topics for Future RFCs

- Server Actions patterns and best practices
- Component library architecture
- Form handling strategy
- Internationalization (i18n) implementation
- Progressive Web App (PWA) features
- Client-side caching strategy

## Questions?

For frontend-specific questions:
- Check existing RFCs
- Review site README
- Open a GitHub issue
- Contact: admin@arolariu.ro

---

**Last Updated**: 2025-10-12
**Maintained By**: Frontend team
