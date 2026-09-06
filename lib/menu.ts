export type Language = 'en' | 'ar';
export const categories = [
  { id: 'manakish', en: 'Manakish', ar: 'مناقيش', position: '0% 6%' },
  { id: 'croissants', en: 'Croissants', ar: 'كرواسون', position: '100% 9%' },
  { id: 'soiree', en: 'Soiree', ar: 'سواريه', position: '100% 52%' },
  { id: 'pizza', en: 'Pizza', ar: 'بيتزا', position: '100% 100%' },
  { id: 'drinks', en: 'Cold drinks', ar: 'مشروبات باردة', position: '22% 99%' },
] as const;
export type CategoryId = (typeof categories)[number]['id'];
export interface MenuItem {
  id: string;
  category: CategoryId;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  priceLbp: number;
  available: boolean;
  createdAt: number;
  updatedAt: number;
}
export const formatPrice = (value: number, lang: Language) =>
  `${new Intl.NumberFormat(lang === 'ar' ? 'ar-LB' : 'en-US', { maximumFractionDigits: 0 }).format(value)} ${lang === 'ar' ? 'ل.ل.' : 'LBP'}`;
