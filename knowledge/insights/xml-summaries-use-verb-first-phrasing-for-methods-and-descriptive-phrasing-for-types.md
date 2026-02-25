---
description: "Methods start with 'Provides', 'Validates', 'Persists'; classes with 'Represents', 'Foundation service responsible for'; params with 'The [noun] to [verb]' — matching the frontend verb/noun split"
type: convention
source: "docs/rfc/2004-comprehensive-xml-documentation-standard.md"
status: current
created: 2026-02-25
---

# XML summaries use verb-first phrasing for methods and descriptive phrasing for types

The backend enforces a phrasing convention for XML `<summary>` tags that mirrors [[function-summaries-start-with-verbs-and-type-summaries-start-with-nouns]] on the frontend. Method summaries begin with present-tense action verbs: "Provides", "Validates", "Persists", "Performs", "Retrieves". Class and interface summaries use descriptive phrasing: "Represents the invoice aggregate root", "Foundation service responsible for CRUD operations", "Defines the contract for storage operations". Parameter descriptions follow a third pattern: "The [noun] to [verb]" (e.g., "The invoice to persist", "The user identifier acting as partition key").

This three-way phrasing convention produces instant visual distinction in IntelliSense completion lists. When a developer sees a list of symbols, verbs signal callable methods while descriptive nouns signal types or constants. The consistency also makes documentation predictable — developers can anticipate how a symbol will be described before reading it, reducing cognitive load during code navigation.

The convention extends to `<remarks>` opening lines: "This [class/method] is responsible for..." establishes a standard rhythm that makes longer documentation blocks scannable.

---

Related Insights:
- [[function-summaries-start-with-verbs-and-type-summaries-start-with-nouns]] — frontend parallel: identical phrasing convention in JSDoc
- [[xml-summary-tags-are-capped-at-80-characters-matching-the-jsdoc-convention]] — foundation: the length constraint within which this phrasing operates

Domains:
- [[backend-architecture]]
- [[cross-cutting]]
