import {clsx, type ClassValue} from "clsx";

/**
 * Helper function that merges CSS class names.
 * Uses clsx for conditional class name composition.
 * @param inputs Array of class names
 * @returns Merged class names string
 */
export function cn(...inputs: ReadonlyArray<ClassValue>): string {
  return clsx(inputs);
}
