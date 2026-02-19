/**
 * SEO quality helpers.
 *
 * isThinPage – returns true when a translation is considered "thin content"
 * and should be excluded from Google's index.
 *
 * Rules (any one condition → thin):
 *  • status !== PUBLISHED
 *  • description is missing or shorter than 120 characters
 *  • seoTitle is missing
 *  • seoDescription is missing
 *  • fewer than 2 tags
 */

export interface SeoQualityInput {
  /** ColoringPage.status from the DB */
  status: string;
  description: string | null | undefined;
  seoTitle: string | null | undefined;
  seoDescription: string | null | undefined;
  /** Number of tags attached to this translation */
  tagCount: number;
}

const MIN_DESCRIPTION_LENGTH = 120;
const MIN_TAG_COUNT = 2;

export function isThinPage(input: SeoQualityInput): boolean {
  if (input.status !== 'PUBLISHED') return true;
  if (!input.seoTitle) return true;
  if (!input.seoDescription) return true;
  if (!input.description || input.description.length < MIN_DESCRIPTION_LENGTH) return true;
  if (input.tagCount < MIN_TAG_COUNT) return true;
  return false;
}
