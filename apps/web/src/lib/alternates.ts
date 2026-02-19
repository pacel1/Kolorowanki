/**
 * lib/alternates.ts
 *
 * Builds the Next.js `alternates` metadata object for a coloring page.
 *
 * Canonical:
 *   Absolute URL for the *current* locale version of the page.
 *   e.g. https://example.com/pt-BR/coloring/kolorowanki-koty
 *
 * Languages (hreflang map):
 *   One entry per available translation, keyed by the locale string which
 *   already follows BCP 47 (e.g. "pt-BR", "en", "de").
 *   An extra "x-default" entry points to the DEFAULT_LOCALE translation.
 *
 * Note on pt-BR:
 *   The locale is stored in the DB as "pt-BR" (with a hyphen).  The URL
 *   segment is also "pt-BR" so both the canonical path and the hreflang
 *   key are correct without any transformation.
 */

import { DEFAULT_LOCALE } from '@coloring/config/locales';

export interface HreflangRow {
  /** BCP 47 locale string, e.g. "en", "pt-BR" */
  locale: string;
  /** Translated slug for this locale */
  slug: string;
}

export interface ColoringAlternates {
  /** Absolute canonical URL for the current locale */
  canonical: string;
  /** hreflang → absolute URL map (including x-default) */
  languages: Record<string, string>;
}

/**
 * Builds canonical + hreflang alternates for a coloring page.
 *
 * @param currentLocale  The locale being rendered (e.g. "pt-BR").
 * @param currentSlug    The translated slug for the current locale.
 * @param allTranslations  All available locale+slug pairs for this page
 *                         (typically from getColoringHreflang or a DB query).
 * @param siteUrl        Site origin without trailing slash
 *                       (defaults to NEXT_PUBLIC_SITE_URL env var).
 */
export function buildColoringAlternates(
  currentLocale: string,
  currentSlug: string,
  allTranslations: HreflangRow[],
  siteUrl: string = process.env.NEXT_PUBLIC_SITE_URL ?? '',
): ColoringAlternates {
  // Absolute canonical for the current locale version
  const canonical = `${siteUrl}/${currentLocale}/coloring/${currentSlug}`;

  // Build hreflang map – locale strings are already BCP 47 (pt-BR, en, …)
  const languages: Record<string, string> = {};

  for (const { locale, slug } of allTranslations) {
    languages[locale] = `${siteUrl}/${locale}/coloring/${slug}`;
  }

  // x-default → DEFAULT_LOCALE translation (fall back to first available)
  const defaultRow =
    allTranslations.find((r) => r.locale === DEFAULT_LOCALE) ??
    allTranslations[0];

  if (defaultRow) {
    languages['x-default'] = `${siteUrl}/${defaultRow.locale}/coloring/${defaultRow.slug}`;
  }

  return { canonical, languages };
}
