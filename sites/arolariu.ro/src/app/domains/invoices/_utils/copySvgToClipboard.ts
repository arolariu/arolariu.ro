/**
 * @fileoverview Utility for copying SVG elements as PNG images to clipboard.
 * @module domains/invoices/_utils/copySvgToClipboard
 */

/**
 * Copies an SVG element as a PNG image to the clipboard.
 *
 * @remarks
 * This utility converts an SVG element to a PNG image by:
 * 1. Serializing the SVG to a data URL
 * 2. Drawing it onto a canvas
 * 3. Converting the canvas to a PNG blob
 * 4. Writing the blob to the clipboard
 *
 * Useful for sharing QR codes or other vector graphics as images.
 *
 * @param svgElement - The SVG element to convert and copy
 * @param size - The size (width and height) of the output image in pixels
 * @throws Error if canvas context cannot be created or blob creation fails
 *
 * @example
 * ```typescript
 * const qrCode = document.querySelector("#qr-code");
 * if (qrCode) {
 *   await copySvgToClipboard(qrCode, 256);
 * }
 * ```
 */
export async function copySvgToClipboard(svgElement: Element, size = 128): Promise<void> {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not create canvas context");
  }

  const img = new Image();
  const svgData = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([svgData], {type: "image/svg+xml;charset=utf-8"});
  const url = URL.createObjectURL(svgBlob);

  try {
    await new Promise<void>((resolve, reject) => {
      img.addEventListener("load", () => resolve());
      img.addEventListener("error", reject);
      img.src = url;
    });

    ctx.drawImage(img, 0, 0);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Failed to create blob"))), "image/png");
    });

    const item = new ClipboardItem({[blob.type]: blob});
    await navigator.clipboard.write([item]);
  } finally {
    URL.revokeObjectURL(url);
  }
}
