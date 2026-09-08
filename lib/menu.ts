export type Language = 'en' | 'ar';
export type CategoryId = string;

export interface MenuCategory {
  id: CategoryId;
  nameEn: string;
  nameAr: string;
  imagePosition: string;
  createdAt: string;
  updatedAt: string;
}
export interface MenuItem {
  id: string;
  category: CategoryId;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  priceLbp: number;
  available: boolean;
  createdAt: string;
  updatedAt: string;
}
export const formatPrice = (value: number, lang: Language) =>
  `${new Intl.NumberFormat(lang === 'ar' ? 'ar-LB' : 'en-US', { maximumFractionDigits: 0 }).format(value)} ${lang === 'ar' ? 'ل.ل.' : 'LBP'}`;
