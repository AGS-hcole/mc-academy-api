/**
 * Converts a string to a URL-friendly slug.
 * Handles lowercase, removes diacritics, replaces spaces with hyphens,
 * removes non-alphanumeric characters (except hyphens), and compacts multiple hyphens.
 *
 * @param text - The text to convert to a slug
 * @returns A URL-friendly slug
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD') // Decompose accents
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars except hyphens
    .replace(/\-\-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+/, '') // Trim hyphens from start
    .replace(/-+$/, ''); // Trim hyphens from end
}

/**
 * Generates a unique slug from a base slug by appending a numeric suffix.
 * Checks if the slug exists using the provided checker function.
 *
 * @param baseSlug - The base slug to make unique
 * @param existsChecker - Async function that returns true if the slug exists
 * @returns A unique slug
 */
export async function generateUniqueSlug(
  baseSlug: string,
  existsChecker: (slug: string) => Promise<boolean>,
): Promise<string> {
  let slug = baseSlug;
  let counter = 2;

  while (await existsChecker(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}
