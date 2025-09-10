import {clsx, type ClassValue} from "clsx";
import {twMerge} from "tailwind-merge";

/**
 * Helper function that merges tailwindcss
 * class names in the given input array.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
