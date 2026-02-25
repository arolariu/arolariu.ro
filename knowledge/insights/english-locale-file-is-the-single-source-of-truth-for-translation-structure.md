---
description: "en.json defines the canonical namespace structure; ro.json and fr.json must mirror it exactly, enforced by generate.i18n.ts synchronization"
type: convention
source: "docs/rfc/1003-internationalization-system.md"
status: current
created: 2026-02-25
---

# English locale file is the single source of truth for translation structure

The English locale file (`messages/en.json`) serves as the canonical definition of the translation namespace structure. All other locale files (`ro.json`, `fr.json`) must contain exactly the same keys at every nesting level. TypeScript type generation derives exclusively from `en.json`, and the `scripts/generate.i18n.ts` script validates that secondary locale files maintain structural parity with the English source.

This single-source-of-truth model simplifies the translation workflow: new features add keys to `en.json` first, then the other locale files are updated to match. If a key exists in Romanian but not in English, or vice versa, the validation script catches the drift. The workflow is explicitly documented as: update `en.json` first, update all other locales to mirror it, then run `npm run generate:translations` to regenerate types.

Adding a new locale (the RFC uses Spanish as an example) requires six coordinated changes: create the new JSON file by copying `en.json`, update the supported locales constant in `i18n/request.ts`, update the generation script, update the provider's message map and Clerk localization map, and add a switcher entry in the Commander component. The English file's structure is the template for every new locale.

---

Related Insights:
- [[auto-generated-types-enforce-translation-key-safety-at-compile-time]] -- extends: type generation depends on en.json as its input
- [[translation-namespaces-mirror-component-hierarchy-using-mixed-case-conventions]] -- foundation: en.json defines the namespace conventions all locales inherit

Domains:
- [[frontend-patterns]]
