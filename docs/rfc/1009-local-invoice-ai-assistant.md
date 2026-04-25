# RFC 1009: Local Invoice AI Assistant

- **Status**: Implemented
- **Date**: 2026-04-25
- **Authors**: Alexandru-Razvan Olariu, GitHub Copilot
- **Related Components**:
  - `sites/arolariu.ro/src/app/domains/invoices/_components/ai/`
  - `sites/arolariu.ro/src/app/domains/invoices/view-invoices/_components/views/GenerativeView.tsx`
  - `sites/arolariu.ro/src/app/domains/invoices/view-invoice/[id]/_components/tabs/InvoiceTabs.tsx`

---

## Abstract

This RFC documents the local-only invoice AI assistant integrated into the
invoice list and invoice detail experiences. The assistant runs entirely in the
browser with WebLLM, gates model download behind hardware and storage checks,
and constructs a privacy-safe invoice prompt from the user's IndexedDB-backed
Zustand invoice state.

---

## 1. Motivation

### 1.1 Problem Statement

Invoice users need quick answers about locally stored invoice objects without
sending invoice data to a remote model. The assistant must be usable as a
progressive enhancement because local language models require WebGPU, storage
quota, memory, and CPU capacity that are not available on all devices.

### 1.2 Design Goals

- Keep invoice chat local to the browser and avoid persisting chat history.
- Require an explicit user action before downloading model artifacts.
- Block model suggestions on devices that fail minimum hardware checks.
- Sanitize model-visible invoice context and exclude raw implementation IDs,
  scans, scan URLs, raw OCR, sharing metadata, and additional metadata.
- Preserve deterministic invoice analytics so the UI can answer common invoice
  questions without depending only on generated text.
- Localize all user-facing assistant UI in English, Romanian, and French.

---

## 2. Technical Design

### 2.1 Architecture Overview

```text
Invoice routes
  -> LocalInvoiceAssistantPanel (client component)
     -> useLocalInvoiceAssistant()
        -> analyzeLocalAiHardwareEligibility()
        -> createLocalInvoiceAssistantContext()
        -> LocalInvoiceAssistantAdapter
           -> WebLLM worker
              -> @mlc-ai/web-llm
```

The route components pass the visible invoice objects to the shared panel. The
panel delegates lifecycle concerns to `useLocalInvoiceAssistant`, which performs
hardware analysis, model loading, chat generation, interruption, reset, and
cache deletion. The adapter is the only layer that imports WebLLM, and it does
so dynamically after the user starts model loading.

### 2.2 Core Components

#### Hardware eligibility

`hardwareEligibility.ts` checks browser capabilities before the UI suggests or
downloads a model. The gate requires:

- WebGPU and a non-null WebGPU adapter.
- Web Worker support.
- At least 6 GiB available storage quota.
- At least 4 GiB `deviceMemory` when that signal is available.
- At least 4 logical cores when `hardwareConcurrency` is available.

Unavailable storage estimates are treated as ineligible because model artifacts
are large and failing late during download creates a worse recovery path.
Unavailable memory or CPU signals are treated as `unknown`, allowing the user to
try the feature with a compatibility warning.

#### Prompt context and analytics

`invoiceContext.ts` converts domain invoice objects into model-visible context.
It uses deterministic invoice aliases (`invoice-1`, `invoice-2`) and merchant
aliases (`merchant-1`, `merchant-2`) instead of raw IDs or merchant references.
It includes bounded line-item data, invoice names, currency, dates, totals, and
deterministic analytics such as spend totals, merchant breakdowns, date ranges,
and largest invoices.

The prompt context excludes:

- `userIdentifier`
- `sharedWith`
- scans and scan URLs
- raw OCR
- additional metadata and raw metadata
- implementation metadata and raw invoice identifiers

#### WebLLM adapter

`webLlmAdapter.ts` owns model loading, streaming, interruption, unloading, and
cache deletion. The default model is
`Llama-3.2-1B-Instruct-q4f16_1-MLC`, hosted by the approved WebLLM model
artifact source. The adapter creates a dedicated worker URL and initializes the
WebLLM engine only during explicit model loading.

The adapter handles late lifecycle transitions defensively. If disposal happens
while model loading is still pending, the worker is terminated after the load
promise resolves. Cache deletion unloads any active in-memory model before
removing cached artifacts.

#### Model catalog and recommender

`modelCatalog.ts` defines the curated catalog of local invoice assistant models
and provides hardware-aware recommendation logic. The catalog includes 8
selectable models verified to exist in WebLLM 0.2.82, across 4 families (Llama,
Gemma, Phi, Qwen, SmolLM) and 4 tiers (fallback, balanced, quality,
experimental). All models use q4f16_1 quantization for browser feasibility.

**Selectable models (WebLLM 0.2.82 verified):**

| Model ID | Family | Tier | VRAM (MB) | Context (tokens) | Display Name | Required Features |
|----------|--------|------|-----------|------------------|--------------|-------------------|
| `SmolLM2-360M-Instruct-q4f16_1-MLC` | smollm | fallback | 376.06 | 4096 | SmolLM2 360M Instruct | shader-f16 |
| `Qwen3-0.6B-q4f16_1-MLC` | qwen | fallback | 1403.34 | 4096 | Qwen 3 0.6B | - |
| `Llama-3.2-1B-Instruct-q4f16_1-MLC` | llama | balanced | 879.04 | 4096 | Llama 3.2 1B Instruct | - |
| `gemma-2b-it-q4f16_1-MLC` | gemma | balanced | 1476.52 | 4096 | Gemma 2B Instruct | shader-f16 |
| `gemma-2-2b-it-q4f16_1-MLC` | gemma | quality | 1895.3 | 4096 | Gemma 2 2B Instruct | shader-f16 |
| `Llama-3.2-3B-Instruct-q4f16_1-MLC` | llama | quality | 2263.69 | 4096 | Llama 3.2 3B Instruct | - |
| `Phi-3.5-mini-instruct-q4f16_1-MLC` | phi | quality | 3672.07 | 4096 | Phi 3.5 Mini Instruct | - |
| `Phi-3.5-mini-instruct-q4f16_1-MLC-1k` | phi | experimental | 2520.07 | 1024 | Phi 3.5 Mini Instruct (1k context) | - |

**Upgrade-gated candidates (`UPGRADE_GATED_MODEL_CANDIDATES`):**

These models are exported as typed records but excluded from the selectable
catalog until WebLLM upgrade and verification. They are not user-selectable
and must not appear in any UI model picker.

| Model ID | Family | Tier | VRAM (MB) | Context (tokens) | Display Name |
|----------|--------|------|-----------|------------------|--------------|
| `gemma3-1b-it-q4f16_1-MLC` | gemma | balanced | 1536 | 8192 | Gemma 3 1B Instruct |
| `Qwen3.5-0.8B-q4f16_1-MLC` | qwen | fallback | 896 | 4096 | Qwen 3.5 0.8B |
| `Qwen3.5-2B-q4f16_1-MLC` | qwen | balanced | 2048 | 4096 | Qwen 3.5 2B |
| `Phi-4-mini-instruct-q4f16_1-MLC` | phi | quality | 4096 | 16384 | Phi 4 Mini Instruct |

The recommender (`recommendLocalInvoiceAssistantModel`) filters models by:
1. Hardware eligibility status (returns null for ineligible devices)
2. Required GPU features (conservative: omitted `gpuFeatures` treated as empty set, filtering out shader-f16 models)
3. VRAM limits (when provided)
4. Available storage (model size ≈ 1.5× VRAM requirement)

**Conservative GPU feature handling:**
When `gpuFeatures` is omitted or empty, the recommender filters out all models
requiring GPU features (e.g., shader-f16). Explicit `gpuFeatures: ["shader-f16"]`
must be provided to enable shader-f16 models. This ensures devices with unknown
GPU capabilities receive safe, compatible model recommendations.

For eligible or unknown hardware with sufficient storage, it prefers balanced
tier models (defaulting to Llama 3.2 1B). For constrained devices, it falls
back to the smallest compatible model.

#### React lifecycle hook

`useLocalInvoiceAssistant.ts` exposes a compact state machine for the UI:

- `checking-hardware`
- `hardware-ineligible`
- `compatibility-unknown`
- `not-downloaded`
- `downloading`
- `ready`
- `generating`
- `cancelled`
- `error`

The hook keeps chat messages in React state only. It guards state updates after
unmount, invalidates late generation responses after interruption/reset/cache
clear, and exposes retry paths for hardware analysis, model loading, generation
errors, and cache deletion errors.

#### UI panel and route integration

`LocalInvoiceAssistantPanel.tsx` renders hardware status, model preparation,
chat messages, generation controls, reset, and cache deletion. The invoice list
route passes all visible invoices to the panel. The invoice detail route passes
the full invoice list plus `activeInvoiceId`, allowing the hook to filter the
prompt context to the current invoice.

---

## 3. Implementation Examples

### 3.1 Invoice list route

```tsx
<LocalInvoiceAssistantPanel invoices={visibleInvoices} />
```

### 3.2 Invoice detail route

```tsx
<LocalInvoiceAssistantPanel
  activeInvoiceId={invoice.id}
  invoices={invoices}
/>
```

### 3.3 Sanitized prompt context

```json
{
  "analytics": {
    "invoiceCount": 2,
    "merchantBreakdown": {
      "merchant-1": {
        "invoiceCount": 2,
        "totalAmountByCurrency": {
          "RON": 100
        }
      }
    }
  },
  "invoices": [
    {
      "invoiceAlias": "invoice-1",
      "merchantAlias": "merchant-1",
      "name": "Grocery receipt",
      "totalAmount": 42
    }
  ]
}
```

---

## 4. Trade-offs and Alternatives

### 4.1 Considered Alternatives

- **Remote hosted model**: Lower device requirements, but violates the
  local-only privacy requirement for this feature.
- **Automatic model download**: Reduces friction, but can surprise users with a
  multi-gigabyte download and must not occur before explicit consent.
- **No hardware gate**: Simpler implementation, but fails late on low-end
  devices and creates poor mobile and low-end laptop UX.
- **Raw invoice IDs in prompts**: Easier traceability, but unnecessarily exposes
  implementation identifiers to the model context.

### 4.2 Trade-offs

- **Pros**: Strong privacy posture, low server cost, offline-friendly after
  model download, and deterministic analytics for common invoice summaries.
- **Cons**: Large download size, WebGPU dependency, variable performance across
  devices, and more complex client lifecycle management.

---

## 5. Performance Considerations

### 5.1 Performance Impact

The model artifacts are large and require several GiB of available browser
storage. Model loading can take significant time on low-end hardware, and
generation speed varies by GPU, memory, thermal throttling, and browser WebGPU
implementation. The feature is therefore progressive: unsupported or
underpowered devices receive a localized fallback message instead of a download
prompt.

### 5.2 Optimization Strategies

- Limit prompt context to 25 invoices by default.
- Limit line items to 20 items per invoice by default.
- Use deterministic analytics so the prompt can stay compact.
- Keep WebLLM out of the initial route bundle by dynamically importing it in the
  adapter path.
- Use a quantized 1B model to balance capability with browser feasibility.

---

## 6. Security Considerations

The feature does not send invoice prompt data to a server. However, model
artifacts are downloaded from the approved external model host after explicit
user action. The UI discloses this behavior before the download button is used.

Prompt sanitization reduces the model-visible data surface by excluding user
identifiers, sharing metadata, scans, raw OCR, and raw implementation IDs. The
worker entry point accepts same-origin messages only, and the adapter owns
worker termination during unload and disposal.

---

## 7. Testing Strategy

### 7.1 Unit Tests

The focused unit suite covers:

- hardware eligibility and ineligibility reasons
- storage-estimate unavailability blocking the feature
- model catalog structure, tier classification, and upgrade-gated exclusions
- hardware-aware model recommendation (eligible, unknown, ineligible, storage/VRAM constraints)
- prompt context sanitization, aliasing, limits, and analytics
- WebLLM adapter loading, streaming, interruption, disposal, and cache deletion
- hook lifecycle transitions, error recovery, retry, and late response guards
- panel UI states, hardware fallback, retry, stop generation, and error dismiss
- route wiring for invoice list and invoice detail views

### 7.2 Integration Tests

Route-level component tests verify that the invoice list assistant receives the
visible invoice collection and the invoice detail assistant is scoped to the
active invoice.

### 7.3 Manual Checks

Manual browser checks should cover:

1. Ineligible device fallback.
2. Compatibility warning on unknown CPU or memory signals.
3. Explicit model download.
4. Interrupting an in-progress answer.
5. Clearing cached model artifacts.

---

## 8. Migration Guide

There are no data migrations. Chat history is session-only React state, and
model artifacts are owned by browser/WebLLM cache storage.

---

## 9. Documentation Requirements

- [x] TSDoc/JSDoc for local assistant source modules.
- [x] RFC documenting local assistant architecture and privacy model.
- [x] Localized UI copy for English, Romanian, and French.
- [x] Tests covering privacy, lifecycle, and route integration behavior.

---

## 10. Future Work

- Add a remote AI assistant option for devices that fail local requirements.
- Add richer deterministic analytics before invoking the model.
- Add browser capability telemetry without collecting invoice content.
- Add manual QA documentation for WebGPU-capable browsers and mobile devices.

---

## 11. References

- [RFC 1002: Comprehensive JSDoc documentation standard](./1002-comprehensive-jsdoc-documentation-standard.md)
- [RFC 1003: Internationalization system](./1003-internationalization-system.md)
- [RFC 1005: State management (Zustand)](./1005-state-management-zustand.md)
- [RFC 1007: Advanced frontend patterns](./1007-advanced-frontend-patterns.md)

---

**Document Version**: 1.0.0
**Last Updated**: 2026-04-25
**Status**: Implemented
