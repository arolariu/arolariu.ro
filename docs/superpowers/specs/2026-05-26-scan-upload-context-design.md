# Scan Upload Context Refactor Design

Date: 2026-05-26
Status: Approved for implementation planning

## Goal

Refactor the `upload-scans` route-level upload context so client-side scan uploads are reliable, easy to reason about, and DRY. The route keeps transient upload state in memory while moving reusable upload logic into focused utilities.

The final behavior is unchanged at the product level: users add scans, upload up to five in parallel, see each scan's upload journey, and then navigate to `view-scans` after the scans are registered server-side.

## Current Problems

- `ScanUploadContext.tsx` mixes queue state, validation, upload orchestration, progress batching, object URL cleanup, Zustand persistence, toasts, and post-upload prompt signaling.
- Upload validation is duplicated between `UploadArea.tsx` and the context.
- `UploadPreview.tsx` duplicates upload status types instead of sharing route-level upload types.
- Attempts and `retrying` status exist in the model but are not implemented as a clear retry state machine.
- Completed prompt data is reconstructed from items that are later removed from `pendingUploads`.
- `view-scans` currently auto-syncs only when `lastSyncTimestamp` is empty, so a previously cached scan list may skip a fresh Azure fetch after navigating from upload.

## Architecture

Use a route-scoped upload module. Keep the provider in `_context/` and place helper files in `upload-scans/_utils/`.

```text
upload-scans/
  _context/
    ScanUploadContext.tsx
  _utils/
    uploadTypes.ts
    uploadValidation.ts
    uploadReducer.ts
    uploadRunner.ts
```

### Responsibilities

`ScanUploadContext.tsx` stays the route-level integration point. It wires the reducer, upload runner, UI toasts, object URL cleanup, and context hook.

`_utils/uploadTypes.ts` defines shared queue item types, status literals, result types, and constants:

- concurrency limit: `5`
- max attempts: `3`
- max file size: `10 MB`
- accepted MIME types and extensions

`_utils/uploadValidation.ts` validates files from input, drag/drop, and paste paths. It returns typed validation results so UI code can show precise user-facing errors without duplicating rules.

`_utils/uploadReducer.ts` owns pure queue transitions: add, remove, rename, upload started, retry started, progress updated, upload completed, upload failed, release file reference, clear, and stats updates.

`_utils/uploadRunner.ts` owns the single-file upload journey. It receives upload dependencies, runs the SAS/direct-upload/register path, uses the existing server-upload fallback when needed, retries up to three attempts, and returns a typed result.

## State Model

The upload queue remains route-scoped because it stores browser-only transient data:

- `File`
- object URL preview
- progress
- attempt count
- local error
- local completion metadata

The upload context must not persist uploaded scan entities into `useScansStore`. The `view-scans` route remains the source of truth for fetching Azure scans and persisting them into the Zustand cache.

The context exposes a small UI-facing API:

- `pendingUploads`
- `isUploading`
- `sessionStats`
- `completedBatch`
- `addFiles(files)`
- `removeFiles(ids)`
- `clearAll()`
- `renameFile(id, newName)`
- `uploadAll()`
- `resetSessionStats()`

## Upload Flow

All file entry paths use the same validator:

1. Input selection, drag/drop, and paste extract candidate files.
2. `addFiles` validates every file.
3. Valid files become queue items with stable IDs, object URL previews, `status: "idle"`, and `attempts: 0`.
4. Invalid files are rejected with explicit toast messages.

`uploadAll` snapshots `idle` and `failed` items, locks the active batch, and executes tasks with a concurrency limit of five.

Each upload item follows this lifecycle:

```text
idle | failed
  -> uploading (attempt 1)
  -> retrying (attempt 2)
  -> retrying (attempt 3)
  -> completed | failed
```

Active uploads remain non-removable. Failed uploads stay in the queue and can be retried by pressing Upload again.

On success:

1. The server has registered the scan.
2. The local item records a completion summary for the route UI.
3. The local `File` reference is released.
4. The object URL is revoked exactly once.
5. The item is removed after a short display delay.

The post-upload prompt uses `completedBatch`, not disappearing queue items. When a server blob URL is available, the completion summary uses it; otherwise it falls back to the safest available local preview before cleanup.

## View-Scans Handoff

The upload route will not call `addScan` on the Zustand scans store.

To guarantee that newly uploaded scans appear after navigation, `view-scans/_hooks/useScans.tsx` should always background-sync from Azure on mount after IndexedDB hydration. It can still render cached scans immediately for perceived performance, but it should not skip the fresh fetch simply because `lastSyncTimestamp` exists.

Manual sync remains available and continues to show success/error toasts. Automatic background sync should avoid toast spam on transient network failures.

## Error Handling

The upload runner returns typed results instead of relying on mutable counters inside concurrent tasks. Failure points are explicit:

- missing `File` reference
- SAS generation failed
- direct Azure PUT failed
- registration failed
- server fallback failed
- unexpected exception

Retries are automatic per item up to three attempts. Attempt one uses `uploading`; attempts two and three use `retrying` and expose the attempt number to the UI.

Batch toasts summarize successful and failed counts. Per-file errors remain on failed cards.

## Cleanup

Cleanup is centralized in the provider/reducer boundary:

- Object URLs are revoked once.
- `File` references are released after success.
- Pending removal timers are cleared on unmount.
- Pending `requestAnimationFrame` callbacks are cancelled on unmount.
- Active uploads remain locked until their task finishes.

## Component Changes

`UploadArea.tsx` focuses on browser events and delegates validation to `_utils/uploadValidation.ts`.

`UploadPreview.tsx` imports shared upload types from `_utils/uploadTypes.ts` and focuses on rendering, pagination, and remove actions.

`island.tsx` reads `completedBatch` from context for the post-upload prompt instead of deriving prompt state from `pendingUploads`.

## Testing Plan

Add focused tests around the extracted units:

- validation accepts JPEG, PNG, and PDF and rejects unsupported type, invalid extension, and files over 10 MB
- reducer covers add, remove, rename, upload start, retry, success, failure, clear, and stats transitions
- runner retries up to three attempts, respects explicit fallback behavior, and returns typed success/failure results
- concurrency remains capped at five
- `useScans` always starts a background sync on mount after hydration while keeping manual-sync toast behavior

Component tests should remain lighter because most upload behavior moves into pure utilities.

## Implementation Notes

- Keep all user-facing strings routed through `next-intl`.
- Do not introduce `any` or unsafe casts.
- Preserve route-scoped Context rather than creating a new Zustand upload queue.
- Keep `_context/ScanUploadContext.tsx` as the only context file; helpers live in `_utils/`.
- Do not add upload cancellation in this refactor. Active uploads stay locked.
