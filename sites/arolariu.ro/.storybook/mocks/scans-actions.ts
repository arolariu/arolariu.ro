/**
 * Browser-safe boundary for standalone scan server actions in Storybook.
 *
 * Storybook does not apply Next.js Server Action RPC transforms. Returning an
 * explicit failure keeps real scan components interactive without contacting
 * auth, configuration, or Azure services, and prevents background hydration
 * syncs from replacing story-owned Zustand fixtures.
 */

type StorybookActionFailure = Readonly<{
  success: false;
  error: Readonly<{
    code: "STORYBOOK_SERVER_ACTION_UNAVAILABLE";
    message: string;
  }>;
}>;

const STORYBOOK_ACTION_FAILURE: StorybookActionFailure = {
  success: false,
  error: {
    code: "STORYBOOK_SERVER_ACTION_UNAVAILABLE",
    message: "Server actions are unavailable in Storybook.",
  },
};

function unavailableAction(): Promise<StorybookActionFailure> {
  return Promise.resolve(STORYBOOK_ACTION_FAILURE);
}

/** Prevents background scan synchronization from replacing seeded fixtures. */
export function fetchScans(): Promise<StorybookActionFailure> {
  return unavailableAction();
}

/** Prevents scan uploads from crossing Storybook's browser boundary. */
export function createScan(): Promise<StorybookActionFailure> {
  return unavailableAction();
}

/** Prevents direct-upload target creation from crossing the browser boundary. */
export function createScanUploadTarget(): Promise<StorybookActionFailure> {
  return unavailableAction();
}

/** Prevents scan mutations from crossing Storybook's browser boundary. */
export function updateScan(): Promise<StorybookActionFailure> {
  return unavailableAction();
}

/** Prevents scan deletion from crossing Storybook's browser boundary. */
export function deleteScan(): Promise<StorybookActionFailure> {
  return unavailableAction();
}
