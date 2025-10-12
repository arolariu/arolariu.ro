# arolariu.ro Documentation

This directory contains comprehensive technical documentation for the arolariu.ro monorepo following RFC (Request for Comments) style format.

## Directory Structure

```
docs/
├── README.md           # This file
├── RFC_TEMPLATE.md     # Template for creating new RFCs
├── frontend/           # Frontend-related documentation
│   └── rfc/           # Frontend RFCs
└── backend/            # Backend-related documentation
    └── rfc/           # Backend RFCs
```

## Documentation Categories

### Frontend Documentation (`/docs/frontend/`)

Frontend documentation covers:
- Next.js application architecture
- React components and patterns
- Client-side state management
- UI/UX design decisions
- Frontend build and deployment processes
- Performance optimization strategies
- Accessibility implementations

**Current RFCs:**
- [RFC 0001: OpenTelemetry Observability System](./frontend/rfc/0001-opentelemetry-observability-system.md) - ✅ Implemented

### Backend Documentation (`/docs/backend/`)

Backend documentation covers:
- .NET API architecture
- Domain-Driven Design (DDD) patterns
- SOLID principles implementation
- Database schema and migrations
- API endpoints and contracts
- Authentication and authorization
- Backend deployment strategies

**Current RFCs:**
- Coming soon

## Creating New RFCs

To create a new RFC:

1. Copy the `RFC_TEMPLATE.md` file
2. Place it in the appropriate directory (`frontend/rfc/` or `backend/rfc/`)
3. Name it with the next sequential number: `NNNN-descriptive-name.md`
4. Fill in all sections of the template
5. Update the index in this README
6. Submit a pull request for review

### RFC Numbering Convention

- **0001-0999**: Frontend RFCs
- **1000-1999**: Backend RFCs
- **2000-2999**: Infrastructure RFCs
- **3000-3999**: Cross-cutting concerns (Security, Performance, etc.)

## RFC Status Lifecycle

RFCs go through the following stages:

1. **Draft** - Initial proposal being written
2. **Proposed** - Ready for review and discussion
3. **Accepted** - Approved for implementation
4. **Implemented** - Solution has been built and deployed
5. **Deprecated** - No longer relevant or superseded by newer RFC

## Related Documentation

- **Site-specific README files**: Located in `sites/{site-name}/README.md`
  - These contain development setup and site-specific instructions
  - Should reference relevant RFCs for architectural decisions

- **API Documentation**: Generated from code at `sites/docs.arolariu.ro`
  - XML documentation comments from backend code
  - TypeScript interfaces from frontend code

- **GitHub Instructions**: Located in `.github/instructions/`
  - Development guidelines and coding standards
  - CI/CD workflow documentation

## Contributing

When contributing to the documentation:

1. **Keep RFCs focused** - One RFC per major design decision
2. **Update regularly** - Mark RFCs as Implemented when complete
3. **Link from code** - Reference RFCs in code comments where relevant
4. **Maintain accuracy** - Update docs when implementation changes
5. **Follow the template** - Use RFC_TEMPLATE.md for consistency

## Documentation Standards

All documentation should:

- ✅ Use clear, concise language
- ✅ Include code examples where applicable
- ✅ Provide diagrams for complex architectures
- ✅ List trade-offs and alternatives considered
- ✅ Include security and performance considerations
- ✅ Specify testing requirements
- ✅ Reference related documentation and external resources

## Review Process

RFCs should be reviewed by:
- At least one team member with expertise in the relevant area
- Repository maintainers for architectural decisions
- Security team for security-sensitive changes

## Questions?

For questions about documentation:
- Open an issue on GitHub
- Contact: admin@arolariu.ro

---

**Last Updated**: 2025-10-12
**Maintained By**: arolariu team
