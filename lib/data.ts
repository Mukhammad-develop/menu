// Data layer: reads from PostgreSQL via Prisma when DATABASE_URL is set,
// otherwise falls back to built-in demo data so the app runs with zero setup.

import { prisma } from '@/lib/db';
import { demoCategories, demoMenuItems } from '@/lib/demo-data';

export interface Category {
  id: string;
  name: string;
  slug: string;
  order: number;
}

export interface MenuItem {
  id: string;
  title: string;
  description: string;
  price: number;
  videoUrl: string;
  posterUrl: string | null;
  order: number;
  active: boolean;
  categoryId: string;
  category: Category;
}

export function isDemoMode(): boolean {
  return !process.env.DATABASE_URL;
}

export async function getCategories(): Promise<Category[]> {
  if (isDemoMode()) {
    return [...demoCategories].sort((a, b) => a.order - b.order);
  }
  return prisma.category.findMany({ orderBy: { order: 'asc' } });
}

export async function getMenuItems(categorySlug?: string): Promise<MenuItem[]> {
  if (isDemoMode()) {
    let items = demoMenuItems.filter((item) => item.active);
    if (categorySlug) {
      const category = demoCategories.find((c) => c.slug === categorySlug);
      items = category ? items.filter((i) => i.categoryId === category.id) : [];
    }
    return items
      .sort((a, b) => a.order - b.order)
      .map((item) => ({
        ...item,
        category: demoCategories.find((c) => c.id === item.categoryId)!,
      }));
  }

  return prisma.menuItem.findMany({
    where: {
      active: true,
      ...(categorySlug ? { category: { slug: categorySlug } } : {}),
    },
    orderBy: { order: 'asc' },
    include: { category: true },
  });
}

// Admin CRUD list: every item, including inactive ones.
export async function getAllMenuItems(): Promise<MenuItem[]> {
  if (isDemoMode()) {
    return [...demoMenuItems]
      .sort((a, b) => a.order - b.order)
      .map((item) => ({
        ...item,
        category: demoCategories.find((c) => c.id === item.categoryId)!,
      }));
  }
  return prisma.menuItem.findMany({
    orderBy: { order: 'asc' },
    include: { category: true },
  });
}
