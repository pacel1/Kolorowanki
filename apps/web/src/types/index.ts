import type { SupportedLocale } from "@coloring/config/locales";

export type Locale = SupportedLocale;

export type LocalizedString = Record<string, string>;

export interface Category {
  id: string;
  /** Translated slug for the current locale (used in URL) */
  slug: string;
  /** Canonical English slug (used for filtering pages) */
  categorySlug?: string;
  name: LocalizedString;
  description: LocalizedString;
  imageUrl: string;
  /** Number of published pages in this category */
  count?: number;
}

export interface ColoringPage {
  id: string;
  slug: string;
  title: LocalizedString;
  description: LocalizedString;
  categoryId: string;
  categorySlug: string;
  imageUrl: string;
  thumbnailUrl: string;
  tags: string[];
  createdAt: string; // ISO date string – ready for API
}

export interface PackItem {
  coloringId: string;
  slug: string;
  title: string;
  thumbnailUrl: string;
}

export interface Pack {
  items: PackItem[];
}

// API-ready response shapes (for future use)
export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
