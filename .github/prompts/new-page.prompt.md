---
name: "new-page"
description: 'Scaffolds a new Next.js page following the Island pattern with RSC page, Client Component island, i18n, metadata, and Vitest tests.'
agent: 'agent'
model: 'Claude Sonnet 4.5'
tools: ['codebase', 'search', 'editFiles', 'terminalLastCommand']
---

# New Page Generator

## Purpose

Scaffold a complete Next.js page following the arolariu.ro Island pattern with all required artifacts.

---

## What Gets Generated

### 1. Server Component Page (`page.tsx`)

```tsx
// sites/arolariu.ro/src/app/[route]/page.tsx
import type {Metadata} from "next";
import {createMetadata} from "@/metadata";
import {getTranslations} from "next-intl/server";
import Render[PageName]Screen from "./island";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("[Namespace].__metadata__");
  return createMetadata({title: t("title"), description: t("description")});
}

export default async function [PageName]Page(): Promise<React.JSX.Element> {
  // Server-side data fetching here
  return <Render[PageName]Screen />;
}
```

### 2. Client Component Island (`island.tsx`)

```tsx
// sites/arolariu.ro/src/app/[route]/island.tsx
"use client";

import {useTranslations} from "next-intl";

interface Props {
  // Props from server component
}

export default function Render[PageName]Screen(props: Readonly<Props>): React.JSX.Element {
  const t = useTranslations("[Namespace]");

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      {/* Page content */}
    </main>
  );
}
```

### 3. i18n Messages

Add keys to all 3 locale files:

```json
// messages/en.json
{
  "[Namespace]": {
    "__metadata__": {
      "title": "[Page Title]",
      "description": "[Page description for SEO]"
    },
    "title": "[Display Title]"
  }
}
```

```json
// messages/ro.json (Romanian translation)
// messages/fr.json (French translation)
```

### 4. Loading State (`loading.tsx`)

```tsx
// sites/arolariu.ro/src/app/[route]/loading.tsx
import {Skeleton} from "@arolariu/components";

export default function Loading(): React.JSX.Element {
  return (
    <main className="container mx-auto px-4 py-8">
      <Skeleton className="h-8 w-64 mb-4" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-3/4" />
    </main>
  );
}
```

### 5. Tests

```tsx
// sites/arolariu.ro/src/app/[route]/__tests__/island.test.tsx
import {describe, expect, it} from "vitest";
import {render, screen} from "@testing-library/react";
import Render[PageName]Screen from "../island";

describe("Render[PageName]Screen", () => {
  it("should render without crashing", () => {
    render(<Render[PageName]Screen />);
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("should display the page title", () => {
    render(<Render[PageName]Screen />);
    expect(screen.getByRole("heading", {level: 1})).toBeInTheDocument();
  });
});
```

---

## Checklist

- [ ] `page.tsx` is a Server Component (no `"use client"`)
- [ ] `island.tsx` is a Client Component with `"use client"`
- [ ] Props interface uses `Readonly<Props>`
- [ ] Explicit return types on all functions
- [ ] `generateMetadata()` uses `createMetadata()` and `getTranslations()`
- [ ] i18n keys added to `en.json`, `ro.json`, and `fr.json`
- [ ] `loading.tsx` provides skeleton UI during loading
- [ ] Tests cover rendering and key interactions
- [ ] No `any` types used
- [ ] JSDoc comments on the island component
- [ ] All user-facing strings use `useTranslations()` or `getTranslations()`

## RFC Grounding Checklist (Mandatory)

Before final output or code changes:

1. Map task scope to relevant RFC IDs using `.github/agent-governance/rfc-grounding-protocol.md`.
2. Read the referenced source files and verify RFC guidance is still current.
3. If RFC and source conflict, follow source-of-truth code and record RFC drift for remediation.
4. Include concrete evidence in outputs (file paths, command results, and validation notes).

## Execution Contract

### Context Intake
- Read `.github/instructions/frontend.instructions.md` and `.github/instructions/react.instructions.md`.
- Consult RFC 1003 (i18n), RFC 1004 (metadata), RFC 1007 (frontend patterns).
- Inspect neighboring route patterns in `sites/arolariu.ro/src/app/**`.

### RFC and Source Checks
1. Identify impacted domain and map to RFC IDs using `.github/agent-governance/rfc-grounding-protocol.md`.
2. Read the referenced source files before generating edits.
3. If RFC and source conflict, follow source and flag RFC drift.

### Implementation Steps
1. Produce a file-level change plan before edits.
2. Apply minimal, behavior-safe modifications aligned with repository conventions.
3. Record assumptions explicitly when requirements are ambiguous.

### Validation Steps
```bash
npm run build:website
npm run test:website
```

### Ask-User Criteria
Ask the user before proceeding when:
- design choices materially change behavior or UX,
- security, auth, infra, or destructive actions are involved,
- scope boundaries are ambiguous and multiple valid options exist.

### Output Contract
- **Success:** list files changed, validations run, and residual risks.
- **Failure:** provide exact failing step/output, impacted files, and a safe next action.

## Self-Audit and Uncertainty Protocol (Mandatory)

For non-trivial tasks, complete this checklist before final output:

1. **Assumptions:** list non-obvious assumptions that influenced decisions.
2. **Risk Flags:** identify security, behavior, deployment, or data risks.
3. **Confidence:** report `high`, `medium`, or `low` with brief justification.
4. **Evidence:** cite changed files, executed commands, and validation outcomes.

Escalate to the user before continuing when security/auth/infra/destructive or major behavior-changing decisions are involved.

