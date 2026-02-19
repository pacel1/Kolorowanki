import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from "@coloring/config/locales";
import type { SupportedLocale } from "@coloring/config/locales";

export type Locale = SupportedLocale;

export const locales: Locale[] = [...SUPPORTED_LOCALES];
export const defaultLocale: Locale = DEFAULT_LOCALE;

export function isValidLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}
