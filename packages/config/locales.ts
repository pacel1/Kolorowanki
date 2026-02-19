export const SUPPORTED_LOCALES = [
  "en",
  "es",
  "pt-BR",
  "de",
  "fr",
  "it",
  "nl",
  "tr",
  "pl",
  "sv",
  "no",
  "da",
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "en";
