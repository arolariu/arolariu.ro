import {clsx, type ClassValue} from "clsx";
import {twMerge} from "tailwind-merge";

/**
 * Helper function that merges tailwindcss
 * class names in the given input array.
 * @param inputs Array of class names
 * @returns Merged class names
 */
export function cn(...inputs: ReadonlyArray<ClassValue>): Readonly<string> {
  return twMerge(clsx(inputs));
}
