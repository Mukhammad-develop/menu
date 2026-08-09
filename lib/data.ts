// Data layer: reads from MySQL via Prisma when DATABASE_URL is set,
// otherwise falls back to built-in demo data so the app runs with zero setup.

import { prisma } from '@/lib/db';
import { demoCategories, demoMenuItems } from '@/lib/demo-data';

// ---------------------------------------------------------------------------
// Language support
// ---------------------------------------------------------------------------

export const SUPPORTED_LANGUAGES = ['uz', 'ru', 'en', 'tr'] as const;
export type LangCode = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<LangCode, string> = {
  uz: "O'zbekcha",
  ru: 'Русский',
  en: 'English',
  tr: 'Türkçe',
};

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  languages: LangCode[];
  active: boolean;
  createdAt: Date;
  _count?: { categories: number };
}

export interface CategoryTranslation {
  id: string;
  categoryId: string;
  langCode: string;
  name: string;
}

export interface MenuItemTranslation {
  id: string;
  menuItemId: string;
  langCode: string;
  title: string;
  description: string;
}

export interface Category {
  id: string;
  slug: string;
  order: number;
  restaurantId: string;
  translations: CategoryTranslation[];
}

export interface MenuItem {
  id: string;
  price: number;
  videoUrl: string;
  posterUrl: string | null;
  order: number;
  active: boolean;
  categoryId: string;
  category: Category;
  translations: MenuItemTranslation[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function isDemoMode(): boolean {
  return !process.env.DATABASE_URL;
}

/** Resolve the best translation from a translations array. */
export function t<T extends { langCode: string }>(
  translations: T[],
  langCode: string,
  fallbackLangCode?: string,
): T | undefined {
  return (
    translations.find((tr) => tr.langCode === langCode) ||
    (fallbackLangCode
      ? translations.find((tr) => tr.langCode === fallbackLangCode)
      : undefined) ||
    translations[0]
  );
}

/** Parse the JSON-encoded languages column into a typed array. */
function parseLanguages(languagesJson: string): LangCode[] {
  try {
    const parsed = JSON.parse(languagesJson);
    if (Array.isArray(parsed)) return parsed as LangCode[];
    return ['ru'];
  } catch {
    return ['ru'];
  }
}

// ---------------------------------------------------------------------------
// Restaurants
// ---------------------------------------------------------------------------

export async function getRestaurants(): Promise<Restaurant[]> {
  if (isDemoMode()) return [];
  const rows = await prisma.restaurant.findMany({
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { categories: true } } },
  });
  return rows.map((r) => ({
    ...r,
    languages: parseLanguages(r.languages),
  }));
}

export async function getRestaurant(slug: string): Promise<Restaurant | null> {
  if (isDemoMode()) return null;
  const r = await prisma.restaurant.findUnique({ where: { slug } });
  if (!r) return null;
  return { ...r, languages: parseLanguages(r.languages) };
}

export async function getRestaurantById(
  id: string,
): Promise<Restaurant | null> {
  if (isDemoMode()) return null;
  const r = await prisma.restaurant.findUnique({ where: { id } });
  if (!r) return null;
  return { ...r, languages: parseLanguages(r.languages) };
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function getCategories(
  restaurantId?: string,
): Promise<Category[]> {
  if (isDemoMode()) {
    return [...demoCategories]
      .sort((a, b) => a.order - b.order)
      .map((c) => ({
        id: c.id,
        slug: c.slug,
        order: c.order,
        restaurantId: '',
        translations: [
          { id: '', categoryId: c.id, langCode: 'ru', name: c.name },
        ],
      }));
  }
  return prisma.category.findMany({
    where: restaurantId ? { restaurantId } : {},
    orderBy: { order: 'asc' },
    include: { translations: true },
  });
}

// ---------------------------------------------------------------------------
// Menu items
// ---------------------------------------------------------------------------

export async function getMenuItems(
  restaurantId?: string,
  categorySlug?: string,
): Promise<MenuItem[]> {
  if (isDemoMode()) {
    let items = demoMenuItems.filter((item) => item.active);
    if (categorySlug) {
      const category = demoCategories.find((c) => c.slug === categorySlug);
      items = category
        ? items.filter((i) => i.categoryId === category.id)
        : [];
    }
    return items.sort((a, b) => a.order - b.order).map((item) => {
      const cat = demoCategories.find((c) => c.id === item.categoryId)!;
      return {
        id: item.id,
        price: item.price,
        videoUrl: item.videoUrl,
        posterUrl: item.posterUrl,
        order: item.order,
        active: item.active,
        categoryId: item.categoryId,
        category: {
          id: cat.id,
          slug: cat.slug,
          order: cat.order,
          restaurantId: '',
          translations: [
            { id: '', categoryId: cat.id, langCode: 'ru', name: cat.name },
          ],
        },
        translations: [
          {
            id: '',
            menuItemId: item.id,
            langCode: 'ru',
            title: item.title,
            description: item.description,
          },
        ],
      };
    });
  }

  return prisma.menuItem.findMany({
    where: {
      active: true,
      ...(restaurantId ? { category: { restaurantId } } : {}),
      ...(categorySlug ? { category: { slug: categorySlug } } : {}),
    },
    orderBy: { order: 'asc' },
    include: {
      category: { include: { translations: true } },
      translations: true,
    },
  });
}

// Admin CRUD list: every item, including inactive ones.
export async function getAllMenuItems(
  restaurantId?: string,
): Promise<MenuItem[]> {
  if (isDemoMode()) {
    return [...demoMenuItems].sort((a, b) => a.order - b.order).map((item) => {
      const cat = demoCategories.find((c) => c.id === item.categoryId)!;
      return {
        id: item.id,
        price: item.price,
        videoUrl: item.videoUrl,
        posterUrl: item.posterUrl,
        order: item.order,
        active: item.active,
        categoryId: item.categoryId,
        category: {
          id: cat.id,
          slug: cat.slug,
          order: cat.order,
          restaurantId: '',
          translations: [
            { id: '', categoryId: cat.id, langCode: 'ru', name: cat.name },
          ],
        },
        translations: [
          {
            id: '',
            menuItemId: item.id,
            langCode: 'ru',
            title: item.title,
            description: item.description,
          },
        ],
      };
    });
  }
  return prisma.menuItem.findMany({
    where: restaurantId ? { category: { restaurantId } } : {},
    orderBy: { order: 'asc' },
    include: {
      category: { include: { translations: true } },
      translations: true,
    },
  });
}
