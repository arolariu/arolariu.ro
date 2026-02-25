---
description: "Functions use 'Fetches', 'Formats', 'Validates'; types use 'Represents', 'Defines', 'Type for' — enforcing scannable consistency across IntelliSense and TypeDoc"
type: convention
source: "docs/rfc/1002-comprehensive-jsdoc-documentation-standard.md"
status: current
created: 2026-02-25
---

# Function summaries start with verbs and type summaries start with nouns

This codebase enforces a phrasing convention for JSDoc summary lines that creates instant visual distinction between functions and types. Function summaries begin with action verbs in present tense ("Fetches", "Formats", "Validates", "Provides"), while type and interface summaries begin with descriptive nouns ("Represents", "Defines", "Type for"). Parameter descriptions follow a third pattern: "The [noun] to [verb]..."

The convention improves scannability in two contexts. In VS Code IntelliSense, where developers see a list of completions with brief descriptions, the verb/noun prefix immediately communicates whether the symbol is callable or structural. In TypeDoc-generated documentation, the consistent phrasing produces clean index pages where functions and types are visually grouped by their description patterns.

Combined with the 80-character summary cap, this phrasing convention means every JSDoc summary follows a predictable template: `[Verb/Noun] [object] [context]`. This predictability is not just aesthetic — it reduces cognitive load when scanning large files or documentation pages and makes search more effective because developers can predict the phrasing of what they are looking for.

---

Related Insights:
- [[jsdoc-summaries-are-capped-at-80-characters-for-intellisense-readability]] — foundation: the length constraint that pairs with this phrasing convention
- [[eslint-plugin-jsdoc-enforces-documentation-completeness-at-lint-time]] — enables: require-description ensures a summary line exists to follow this convention

Domains:
- [[frontend-patterns]]
