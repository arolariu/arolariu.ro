import type {InvoiceScan} from "../_types/InvoiceScan";

/**
 * Rotates an image file by a specified angle.
 * This function uses a canvas to perform the rotation and returns a new File object.
 * @param file The InvoiceScan object containing the image to rotate.
 * @param deltaRotation The angle in degrees to rotate the image.
 * @returns A Promise that resolves to a new File object with the rotated image.
 */
export async function rotateImageImpl(file: InvoiceScan, deltaRotation: number): Promise<{file: File; blob: Blob; url: string}> {
  if (file.type !== "image") {
    throw new Error("Rotation supported only for images");
  }

  return new Promise((resolve, reject) => {
    const img = new Image();

    // Use event listeners instead of overriding onload/onerror for better composability.
    img.addEventListener(
      "load",
      () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          return reject(new Error("Could not get 2D context for canvas"));
        }

        // Calculate the total rotation including any previous CSS rotation
        // The `file.rotation` here represents the *current CSS rotation* applied to the image.
        // We need to apply `deltaRotation` on top of that.
        const currentCssRotation = file.rotation || 0;
        const totalRotation = (currentCssRotation + deltaRotation + 360) % 360; // Ensure positive modulo

        // Determine canvas dimensions based on the total rotation
        const {width, height} = img;

        if (totalRotation === 90 || totalRotation === 270) {
          // Swap width and height for 90 or 270 degree rotations
          canvas.width = height;
          canvas.height = width;
        } else {
          canvas.width = width;
          canvas.height = height;
        }

        // Translate to center of canvas, rotate, then translate back
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((totalRotation * Math.PI) / 180);
        ctx.drawImage(img, -width / 2, -height / 2);

        canvas.toBlob((blob) => {
          if (blob) {
            // Create a new File object with the rotated image data
            const newFile = new File([blob], file.file.name, {type: file.file.type});
            const url = URL.createObjectURL(blob);
            resolve({file: newFile, blob, url});
          } else {
            reject(new Error("Canvas to Blob conversion failed"));
          }
        }, file.file.type);
      },
      {once: true},
    );

    img.addEventListener(
      "error",
      (error) => {
        reject(new Error(`Image loading error: ${JSON.stringify(error && (error as any).message ? (error as any).message : error)}`));
      },
      {once: true},
    );

    // Setting src after listeners are attached ensures we don't miss a synchronous cached load event.
    img.src = file.preview; // This is a blob URL, so CORS is not an issue
  });
}
