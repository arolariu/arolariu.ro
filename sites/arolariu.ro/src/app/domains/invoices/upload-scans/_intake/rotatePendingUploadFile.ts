/**
 * @fileoverview Local image rotation helper for pending scan uploads.
 * @module app/domains/invoices/upload-scans/_intake/rotatePendingUploadFile
 */

type RotateDirection = "cw" | "ccw";

type RotateInput = Readonly<{
  file: File;
  preview: string;
  direction: RotateDirection;
}>;

type RotateOutput = Readonly<{
  file: File;
  preview: string;
  mimeType: string;
  size: number;
}>;

/**
 * Rotates a pending upload image in the browser and returns replacement media.
 *
 * @param input - File, current preview URL, and rotation direction.
 * @returns Replacement file and object URL preview.
 * @throws When the input is a PDF, image loading fails, canvas is unavailable, or blob creation fails.
 */
export async function rotatePendingUploadFile({file, preview, direction}: RotateInput): Promise<RotateOutput> {
  if (file.type === "application/pdf") {
    throw new Error("PDF rotation is not supported");
  }

  const sourceUrl = URL.createObjectURL(file);
  const image = new globalThis.Image();

  try {
    await new Promise<void>((resolve, reject) => {
      image.addEventListener("load", () => resolve(), {once: true});
      image.addEventListener("error", () => reject(new Error("Failed to load pending upload image")), {once: true});
      image.src = sourceUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = image.height;
    canvas.height = image.width;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Failed to get canvas context");
    }

    const degrees = direction === "cw" ? 90 : -90;
    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate((degrees * Math.PI) / 180);
    context.drawImage(image, -image.width / 2, -image.height / 2);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) {
            resolve(result);
          } else {
            reject(new Error("Failed to create rotated upload blob"));
          }
        },
        "image/jpeg",
        0.92,
      );
    });

    const rotatedFile = new File([blob], file.name, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
    const rotatedPreview = URL.createObjectURL(rotatedFile);

    URL.revokeObjectURL(preview);

    return {
      file: rotatedFile,
      preview: rotatedPreview,
      mimeType: rotatedFile.type,
      size: rotatedFile.size,
    };
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}
