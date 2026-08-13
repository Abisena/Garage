import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Cache buster: 2.0.5-bundle-mode
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}