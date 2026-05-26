import {
  ACCEPTED_UPLOAD_FILE_EXTENSIONS,
  ACCEPTED_UPLOAD_MIME_TYPES,
  MAX_UPLOAD_FILE_SIZE_BYTES,
  type UploadBatchValidationResult,
  type UploadValidationResult,
} from "./uploadTypes";

function getFileExtension(fileName: string): string | null {
  const extension = fileName.split(".").pop()?.toLowerCase();
  return extension && extension.length > 0 ? extension : null;
}

export function validateUploadFile(file: File): UploadValidationResult {
  if (!ACCEPTED_UPLOAD_MIME_TYPES.has(file.type)) {
    return {
      isValid: false,
      file,
      reason: "unsupported-type",
      message: `Unsupported file type: ${file.type || "unknown"}`,
    };
  }

  const extension = getFileExtension(file.name);
  if (extension === null || !ACCEPTED_UPLOAD_FILE_EXTENSIONS.has(extension)) {
    return {
      isValid: false,
      file,
      reason: "unsupported-extension",
      message: `Unsupported file extension: ${file.name}`,
    };
  }

  if (file.size > MAX_UPLOAD_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      file,
      reason: "file-too-large",
      message: `File too large: ${file.name} (max 10MB)`,
    };
  }

  return {isValid: true, file};
}

export function validateUploadFiles(files: Iterable<File>): UploadBatchValidationResult {
  const validFiles: File[] = [];
  const invalidFiles: UploadBatchValidationResult["invalidFiles"] = [];

  for (const file of files) {
    const result = validateUploadFile(file);
    if (result.isValid) {
      validFiles.push(result.file);
    } else {
      invalidFiles.push(result);
    }
  }

  return {validFiles, invalidFiles};
}

export function extractFilesFromDataTransferItems(items: DataTransferItemList): File[] {
  const files: File[] = [];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (item?.kind === "file") {
      const file = item.getAsFile();
      if (file) {
        files.push(file);
      }
    }
  }
  return files;
}
