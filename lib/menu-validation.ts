import { categories, type CategoryId } from './menu';
export class InputError extends Error {}
export function validateItem(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new InputError('Invalid item');
  const data = input as Record<string, unknown>;
  const field = (key: string, max: number, required = false) => {
    if (typeof data[key] !== 'string') throw new InputError(`Invalid ${key}`);
    const value = (data[key] as string).trim();
    if ((required && !value) || value.length > max)
      throw new InputError(`Invalid ${key}`);
    return value;
  };
  const category = field('category', 20);
  if (!categories.some((c) => c.id === category))
    throw new InputError('Choose a category');
  if (
    typeof data.priceLbp !== 'number' ||
    !Number.isSafeInteger(data.priceLbp) ||
    data.priceLbp <= 0 ||
    data.priceLbp > 1_000_000_000
  )
    throw new InputError('Enter a whole LBP price greater than zero');
  if (typeof data.available !== 'boolean')
    throw new InputError('Invalid availability');
  return {
    category: category as CategoryId,
    nameEn: field('nameEn', 120, true),
    nameAr: field('nameAr', 120, true),
    descriptionEn: field('descriptionEn', 500),
    descriptionAr: field('descriptionAr', 500),
    priceLbp: data.priceLbp,
    available: data.available,
  };
}
export function validateRevision(input: unknown): number {
  if (typeof input !== 'number' || !Number.isSafeInteger(input) || input <= 0)
    throw new InputError('Invalid item revision');
  return input;
}
