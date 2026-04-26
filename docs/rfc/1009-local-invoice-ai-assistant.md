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
selectable models verified to exist in WebLLM 0.2.82, across 5 families (Llama,
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

### 5.3 In-Browser Benchmark

An in-app benchmark tool allows users to measure local model performance on their
current browser and hardware without sending invoice data.

**Manual Benchmark Instructions:**

1. Navigate to the invoices domain and open the local AI assistant panel.
2. Wait for hardware analysis and model download to complete (lifecycle: `ready`).
3. Click the **"Run benchmark"** button in the benchmark section.
4. The assistant generates a privacy-safe test response (~60 tokens) and displays:
   - **First token latency** (ms) - time to first generated output
   - **Estimated tokens/sec** (chunk-based proxy, not true token count)
   - **Total duration** (ms)
   - **Characters/sec**
   - **Model ID**

**Important Caveats:**

- Benchmark results apply **only** to that exact device, browser, GPU, and thermal state.
- Results vary based on:
  - GPU model and driver version
  - Available VRAM and system memory
  - CPU performance and thermal throttling
  - Browser WebGPU implementation (Chrome vs. Firefox vs. Edge)
  - Background processes and system load
- **Estimated tokens/sec** is a chunk/delta count proxy. WebLLM streaming API does not
  currently expose true token usage. If true token counts become available in future
  WebLLM versions, the metric will be updated.
- Benchmark does NOT send invoice data - it uses a generic privacy-focused prompt.
- Results are session-only and not persisted or sent to any server.
- For comparable device benchmarks, document:
  - Device model (e.g., "MacBook Pro M2 Max 32GB")
  - Browser and version (e.g., "Chrome 125.0.6422.112")
  - GPU (e.g., "Apple M2 Max integrated GPU")
  - Model ID (e.g., "Llama-3.2-1B-Instruct-q4f16_1-MLC")
  - Thermal state (e.g., "cool idle" vs. "warm after sustained load")

**Recording Results:**

When documenting benchmark results in PR descriptions or analysis notes, use this format:

```
Device: MacBook Pro M2 Max 32GB
Browser: Chrome 125.0.6422.112
GPU: Apple M2 Max (integrated)
Model: Llama-3.2-1B-Instruct-q4f16_1-MLC
Prompt Version: 1.0
Thermal: Cool idle

Results:
- First token: 142ms
- Tokens/sec: 23.4 (estimated, chunk-based)
- Duration: 1920ms
- Characters/sec: 95
```

This data helps understand real-world performance across different hardware configurations
but should never be used for cross-device comparisons or performance claims.


---

## 6. Security Considerations

### 6.1 Privacy and Data Isolation

The feature does not send invoice prompt data to a server. However, model
artifacts are downloaded from the approved external model host after explicit
user action. The UI discloses this behavior before the download button is used.

Prompt sanitization reduces the model-visible data surface by excluding user
identifiers, sharing metadata, scans, raw OCR, and raw implementation IDs. The
worker entry point accepts same-origin messages only, and the adapter owns
worker termination during unload and disposal.

### 6.2 Model Artifact Hosts and CSP

**Allowed external hosts:**

| Host | Purpose | Artifact Types | CSP Directive |
|------|---------|----------------|---------------|
| `https://huggingface.co/mlc-ai` | Model artifacts | Weights (*.bin, *.safetensors), tokenizer config, model config | `connect-src` |
| `https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs` | WebLLM prebuilt libraries | WASM model execution libraries (*.wasm) | `connect-src` |
| `https://*.blob.core.windows.net` | Azure Blob Storage | Scan upload/download for existing invoice scan flows | `connect-src` |

**Model artifact hosts (derived from catalog):**

All models in the selectable catalog (`LOCAL_INVOICE_ASSISTANT_MODELS`) use
`https://huggingface.co/mlc-ai` as the artifact host for model weights, tokenizer,
and config files. CSP origins are dynamically derived from catalog entries via
`deriveUniqueArtifactOrigins()` to ensure CSP stays synchronized with catalog changes.

**WebLLM binary library host (explicit runtime dependency):**

WebLLM 0.2.82 fetches prebuilt WASM model execution libraries from
`https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/`.
This host is explicitly allowed in CSP as `WEBLLM_BINARY_LIBRARY_HOST` constant.
Source: `@mlc-ai/web-llm/lib/index.js` modelLibURLPrefix (line ~920).

**Azure Blob Storage (existing invoice scan flows):**

Azure Blob Storage (`https://*.blob.core.windows.net`) is allowed in `connect-src`
for existing scan upload/download flows:
- **Upload:** `upload-scans/_context/ScanUploadContext.tsx` uses `fetch(sasUrl)` to upload scans directly to Azure Blob SAS URLs
- **Download:** `_components/ScanCard.tsx` uses `fetch(scan.blobUrl)` to download scan images for display

This is separate from local AI assistant functionality and predates this RFC.
Development environments also allow Azurite local emulator (`http://localhost:10000`).

**CSP enforcement:**
- `connect-src`: Explicit allowlist of model artifact origins (HuggingFace) + WebLLM binary library origin (GitHub raw) + Azure Blob Storage (scan uploads/downloads)
- `worker-src`: Allows Web Worker creation for WebLLM engine (blob: + trusted domains)
- `script-src`: Includes `'unsafe-eval'` required for WASM module instantiation

**Security guarantees:**
1. Arbitrary model IDs from UI/user input are rejected by catalog lookup at adapter boundary
2. Only curated models from `LOCAL_INVOICE_ASSISTANT_MODELS` are loadable
3. Artifact host URLs come from trusted catalog metadata, not user input
4. Upgrade-gated models are excluded until verification
5. CSP `connect-src` blocks connections to arbitrary origins (no broad `https:`)
6. Model artifact origins derived from catalog, ensuring CSP/catalog consistency
7. WebLLM binary library origin explicit and documented (runtime dependency)
8. Artifact origin derivation is fail-closed: rejects malformed URLs and non-HTTPS protocols

**Preventing malicious model IDs:**
The `getLocalInvoiceAssistantModelById(modelId: string)` helper ensures only
catalog-verified model IDs can be loaded. The adapter enforces this validation
at load/delete boundaries, rejecting arbitrary user input, malicious URLs,
or upgrade-gated model IDs before WebLLM initialization.

### 6.3 Cache and Storage Behavior

**WebLLM model artifacts:**
- Cached using browser **Cache API** (managed by WebLLM library)
- Persistent across sessions until explicitly cleared or browser quota exceeded
- Model size: ~1.5× VRAM requirement (e.g., Llama 3.2 1B ≈ 1.3 GB cached)
- Cleared via `adapter.deleteCachedModel()` or browser settings

**Invoice data (separate storage):**
- Stored in **IndexedDB** via Zustand persistence middleware
- Completely isolated from model artifact cache
- Clearing model cache does **not** delete invoice data
- Invoice data cleared only via explicit user action in invoice UI

**Cache clearing impact:**
- Removes model weights, tokenizer, and WASM libraries from Cache API
- Requires re-download (~1-4 GB depending on model) to use assistant again
- Does not affect chat history (session-only React state, not persisted)
- Does not affect invoice data (remains in IndexedDB)

**Storage quota considerations:**
- Minimum 6 GB available storage required before download
- Hardware eligibility check gates download if quota unavailable
- Browser may evict cache if quota exceeded (WebLLM handles gracefully)

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

