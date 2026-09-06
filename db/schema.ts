import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const menuItems = sqliteTable('menu_items', {
  id: text('id').primaryKey(),
  category: text('category').notNull(),
  nameEn: text('name_en').notNull(),
  nameAr: text('name_ar').notNull(),
  descriptionEn: text('description_en').notNull().default(''),
  descriptionAr: text('description_ar').notNull().default(''),
  priceLbp: integer('price_lbp').notNull(),
  available: integer('available', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
