import type {PendingUpload, SessionStats, UploadAction, UploadState} from "./uploadTypes";

const initialSessionStats: SessionStats = {
  totalAdded: 0,
  totalCompleted: 0,
  totalFailed: 0,
};

export const initialUploadState: UploadState = {
  pendingUploads: [],
  isUploading: false,
  sessionStats: initialSessionStats,
  completedBatch: [],
};

function isRemovable(upload: PendingUpload): boolean {
  return upload.status === "idle" || upload.status === "failed";
}

function updateUpload(uploads: PendingUpload[], uploadId: string, update: (upload: PendingUpload) => PendingUpload): PendingUpload[] {
  return uploads.map((upload) => (upload.id === uploadId ? update(upload) : upload));
}

export function selectUploadableItems(state: UploadState): PendingUpload[] {
  return state.pendingUploads.filter((upload) => upload.status === "idle" || upload.status === "failed");
}

export function uploadReducer(state: UploadState, action: UploadAction): UploadState {
  switch (action.type) {
    case "uploads-added":
      return {
        ...state,
        pendingUploads: [...state.pendingUploads, ...action.uploads],
        sessionStats: {
          ...state.sessionStats,
          totalAdded: state.sessionStats.totalAdded + action.uploads.length,
        },
      };

    case "uploads-removed": {
      const ids = new Set(action.ids);
      return {
        ...state,
        pendingUploads: state.pendingUploads.filter((upload) => !ids.has(upload.id) || !isRemovable(upload)),
      };
    }

    case "uploads-cleared":
      return {
        ...state,
        pendingUploads: state.pendingUploads.filter((upload) => !isRemovable(upload)),
      };

    case "upload-renamed":
      return {
        ...state,
        pendingUploads: updateUpload(state.pendingUploads, action.id, (upload) =>
          isRemovable(upload) ? {...upload, name: action.name} : upload,
        ),
      };

    case "batch-started":
      return {...state, isUploading: true, completedBatch: []};

    case "batch-finished":
      return {...state, isUploading: false};

    case "upload-progressed":
      return {
        ...state,
        pendingUploads: updateUpload(state.pendingUploads, action.id, (upload) => ({
          ...upload,
          status: action.status,
          progress: action.progress,
          attempts: action.attempts,
          ...(action.error === undefined ? {} : {error: action.error}),
          ...(action.blobUrl === undefined ? {} : {blobUrl: action.blobUrl}),
        })),
      };

    case "upload-completed":
      return {
        ...state,
        pendingUploads: updateUpload(state.pendingUploads, action.id, (upload) => {
          const {error: _error, ...uploadWithoutError} = upload;
          return {
            ...uploadWithoutError,
            file: null,
            preview: "",
            status: "completed",
            progress: 100,
            attempts: action.attempts,
            blobUrl: action.blobUrl,
          };
        }),
        completedBatch: [
          ...state.completedBatch,
          ...state.pendingUploads
            .filter((upload) => upload.id === action.id)
            .map((upload) => ({
              id: upload.id,
              name: upload.name,
              preview: action.blobUrl || upload.preview,
            })),
        ],
        sessionStats: {
          ...state.sessionStats,
          totalCompleted: state.sessionStats.totalCompleted + 1,
        },
      };

    case "upload-failed":
      return {
        ...state,
        pendingUploads: updateUpload(state.pendingUploads, action.id, (upload) => ({
          ...upload,
          status: "failed",
          progress: 0,
          attempts: action.attempts,
          error: action.error,
        })),
        sessionStats: {
          ...state.sessionStats,
          totalFailed: state.sessionStats.totalFailed + 1,
        },
      };

    case "upload-removed-after-completion":
      return {
        ...state,
        pendingUploads: state.pendingUploads.filter((upload) => upload.id !== action.id),
      };

    case "session-stats-reset":
      return {...state, sessionStats: initialSessionStats};

    case "completed-batch-cleared":
      return {...state, completedBatch: []};
  }
}
