import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Function that allows you to merge tailwind classes with other classes
 * @param inputs different classes to merge
 * @returns the merged classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
