import {clsx, type ClassValue} from "clsx";
import {twMerge} from "tailwind-merge";

/**
 * Function that allows you to merge tailwind classes with other classes
 * @param inputs different classes to merge
 * @returns the merged classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Function that extracts a base64 string from a blob
 * @param blob The blob to extract the base64 string from
 * @returns The base64 string
 */
export async function extractBase64FromBlob(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      resolve(base64);
    };
    reader.readAsDataURL(blob);
  });
}
