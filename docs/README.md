# arolariu.ro Documentation

This directory contains comprehensive technical documentation for the arolariu.ro monorepo following RFC (Request for Comments) style format.

## Directory Structure

```text
docs/
├── README.md           # This file
├── RFC_TEMPLATE.md     # Template for creating new RFCs
├── rfc/                # All RFCs organized by number ranges
│   ├── 0000-0999: Monorepo/general RFCs
│   ├── 1000-1999: Frontend RFCs
│   ├── 2000-2999: Backend RFCs
│   ├── 3000-3999: Database RFCs
│   └── 4000+: Other domain-specific RFCs
├── frontend/           # Frontend-related documentation
└── backend/            # Backend-related documentation
```

## Documentation Categories

### All RFCs (`/docs/rfc/`)

All architectural RFCs are organized by number ranges in a single directory:

#### Monorepo/General (0000-0999)

- [RFC 0001: GitHub Actions Workflows](./rfc/0001-github-actions-workflows.md) - ✅ Implemented
- General architecture decisions
- Cross-cutting concerns
- Tooling and infrastructure

#### Frontend (1000-1999)

- [RFC 1001: OpenTelemetry Observability System](./rfc/1001-opentelemetry-observability-system.md) - ✅ Implemented
- [RFC 1002: JSDoc/TSDoc Documentation Standard](./rfc/1002-comprehensive-jsdoc-documentation-standard.md) - ✅ Implemented
- [RFC 1003: next-intl Internationalization System](./rfc/1003-internationalization-system.md) - ✅ Implemented
- [RFC 1004: Metadata and SEO System](./rfc/1004-metadata-seo-system.md) - ✅ Implemented
- [RFC 1005: State Management with Zustand](./rfc/1005-state-management-zustand.md) - ✅ Implemented
- [RFC 1006: Component Library Architecture](./rfc/1006-component-library-architecture.md) - ✅ Implemented
- Next.js application architecture
- React components and patterns
- Client-side state management
- UI/UX design decisions

#### Backend (2000-2999)

- [RFC 2001: Domain-Driven Design Architecture](./rfc/2001-domain-driven-design-architecture.md) - ✅ Implemented
- [RFC 2002: OpenTelemetry Backend Observability](./rfc/2002-opentelemetry-backend-observability.md) - ✅ Implemented
- [RFC 2003: The Standard Implementation](./rfc/2003-the-standard-implementation.md) - ✅ Implemented
- [RFC 2004: XML Documentation Standard](./rfc/2004-comprehensive-xml-documentation-standard.md) - ✅ Implemented
- .NET API architecture
- Domain-Driven Design (DDD) patterns
- SOLID principles implementation
- API endpoints and contracts

#### Database (3000-3999)

- Database schema and migrations
- Data access patterns
- Query optimization
- Backup and recovery strategies

### Supporting Documentation

- **Frontend Docs** (`/docs/frontend/`): Frontend-specific guides and references
- **Backend Docs** (`/docs/backend/`): Backend-specific guides and references

## Creating New RFCs

To create a new RFC:

1. Copy the `RFC_TEMPLATE.md` file
2. Place it in the `/docs/rfc/` directory
3. Name it with the next sequential number in the appropriate range: `NNNN-descriptive-name.md`
4. Fill in all sections of the template
5. Update the index in this README
6. Submit a pull request for review

### RFC Numbering Convention

- **0000-0999**: Monorepo/General RFCs (architecture, tooling, cross-cutting concerns)
- **1000-1999**: Frontend RFCs (Next.js, React, UI/UX)
- **2000-2999**: Backend RFCs (.NET, DDD, API design)
- **3000-3999**: Database RFCs (schema, migrations, data access)
- **4000-4999**: Infrastructure RFCs (Azure, deployment, monitoring)
- **5000+**: Reserved for future domain-specific RFCs

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
- Contact: `admin@arolariu.ro`

---

**Last Updated**: 2025-12-25
**Maintained By**: arolariu team
