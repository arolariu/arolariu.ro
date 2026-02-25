---
description: "The <inheritdoc/> tag reuses base class or interface docs on derived members, combined with additional <remarks> for specialization -- reducing duplication across the DDD entity hierarchy"
type: pattern
source: "docs/rfc/2004-comprehensive-xml-documentation-standard.md"
status: current
created: 2026-02-25
---

# Inheritdoc propagates base documentation while allowing layer-specific overrides

The documentation standard uses `<inheritdoc/>` to propagate XML documentation from base classes and interfaces to derived members, avoiding duplication across the DDD entity hierarchy. When `BaseEntity<T>` documents `CreatedAt` as "Gets or sets the UTC timestamp when this entity was created," the `Invoice` class inherits that documentation automatically via `<inheritdoc/>`. The derived class then adds specialization through additional `<remarks>` -- for example, noting that the timestamp is "immutable after entity creation to maintain audit integrity."

This pattern is critical because since [[all-domain-entities-inherit-through-baseentity-to-namedentity-hierarchy]], every entity in the system shares base properties like `CreatedAt`, `LastUpdatedAt`, `NumberOfUpdates`, and `IsDeleted`. Without `<inheritdoc/>`, every entity would need to duplicate the base documentation for these shared members, creating a maintenance burden where changes to the base documentation would need to propagate manually to dozens of entity classes.

The combination of inherited base docs plus derived `<remarks>` creates a layered documentation model that mirrors the code's own inheritance structure. A developer hovering over `Invoice.CreatedAt` sees both the general explanation (from BaseEntity) and the Invoice-specific behavior (from the override). This is more informative than either source alone, and it stays synchronized because the base documentation is defined once.

---

Related Insights:
- [[all-domain-entities-inherit-through-baseentity-to-namedentity-hierarchy]] -- foundation: the entity hierarchy that makes inheritdoc necessary to avoid documentation duplication
- [[see-cref-cross-references-create-a-navigable-code-documentation-graph]] -- extends: inheritdoc is another mechanism (alongside see cref) for keeping documentation connected across types

Domains:
- [[backend-architecture]]
