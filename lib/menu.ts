export type Language = 'en' | 'ar';
export type CategoryId = string;

export interface MenuCategory {
  id: CategoryId;
  nameEn: string;
  nameAr: string;
  imagePosition: string;
  imagePath: string | null;
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
  variants: MenuItemVariant[];
  available: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface MenuItemVariant {
  nameEn: string;
  nameAr: string;
  priceLbp: number;
}
export const formatPrice = (value: number, lang: Language) =>
  `${new Intl.NumberFormat(lang === 'ar' ? 'ar-LB' : 'en-US', { maximumFractionDigits: 0 }).format(value)} ${lang === 'ar' ? 'ل.ل.' : 'LBP'}`;
