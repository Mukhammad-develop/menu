'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/db';
import { isDemoMode } from '@/lib/data';
import type { LangCode } from '@/lib/data';

const ADMIN_COOKIE = 'menu_admin';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface ActionResult {
  ok: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function login(password: string): Promise<ActionResult> {
  const expected = process.env.ADMIN_PASSWORD || 'admin1234';
  if (password !== expected) {
    return { ok: false, error: 'Wrong password' };
  }
  cookies().set(ADMIN_COOKIE, '1', {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
  return { ok: true };
}

export async function logout(): Promise<ActionResult> {
  cookies().delete(ADMIN_COOKIE);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Transliteration helper (for slug generation)
// ---------------------------------------------------------------------------

const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh',
  з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts',
  ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .split('')
    .map((c) => TRANSLIT[c] ?? c)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || `item-${Date.now().toString(36)}`;
}

// ---------------------------------------------------------------------------
// Restaurants
// ---------------------------------------------------------------------------

export async function createRestaurant(
  name: string,
  languages: LangCode[],
): Promise<ActionResult> {
  if (isDemoMode()) return { ok: false, error: 'Database not connected' };
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: 'Enter a restaurant name' };
  if (languages.length === 0)
    return { ok: false, error: 'Select at least one language' };
  try {
    await prisma.restaurant.create({
      data: {
        name: trimmed,
        slug: slugify(trimmed),
        languages: JSON.stringify(languages),
      },
    });
    revalidatePath('/admin');
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Create failed',
    };
  }
}

export async function updateRestaurant(
  id: string,
  name: string,
  languages: LangCode[],
): Promise<ActionResult> {
  if (isDemoMode()) return { ok: false, error: 'Database not connected' };
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: 'Enter a restaurant name' };
  if (languages.length === 0)
    return { ok: false, error: 'Select at least one language' };
  try {
    await prisma.restaurant.update({
      where: { id },
      data: {
        name: trimmed,
        languages: JSON.stringify(languages),
      },
    });
    revalidatePath('/admin');
    revalidatePath(`/admin/restaurant/${id}`);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Update failed',
    };
  }
}

export async function deleteRestaurant(id: string): Promise<ActionResult> {
  if (isDemoMode()) return { ok: false, error: 'Database not connected' };
  try {
    await prisma.restaurant.delete({ where: { id } });
    revalidatePath('/admin');
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Delete failed',
    };
  }
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

/** translations: Record<langCode, name> e.g. { ru: "Салаты", en: "Salads" } */
export async function createCategory(
  restaurantId: string,
  translations: Record<string, string>,
): Promise<ActionResult> {
  if (isDemoMode()) return { ok: false, error: 'Database not connected' };

  // Use the first non-empty translation for slug generation
  const firstName = Object.values(translations).find((v) => v.trim()) ?? '';
  if (!firstName) return { ok: false, error: 'Enter at least one category name' };

  try {
    await prisma.category.create({
      data: {
        slug: slugify(firstName),
        restaurantId,
        translations: {
          create: Object.entries(translations)
            .filter(([, name]) => name.trim())
            .map(([langCode, name]) => ({
              langCode,
              name: name.trim(),
            })),
        },
      },
    });
    revalidatePath('/');
    revalidatePath(`/admin/restaurant/${restaurantId}`);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Create failed',
    };
  }
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  if (isDemoMode()) return { ok: false, error: 'Database not connected' };
  try {
    await prisma.category.delete({ where: { id } });
    revalidatePath('/');
    revalidatePath('/admin');
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Delete failed',
    };
  }
}

// ---------------------------------------------------------------------------
// Menu items
// ---------------------------------------------------------------------------

export interface MenuItemInput {
  price: number;
  videoUrl: string;
  posterUrl?: string | null;
  order: number;
  active: boolean;
  categoryId: string;
  /** Translations keyed by langCode: { ru: { title, description }, en: { title, description } } */
  translations: Record<string, { title: string; description: string }>;
}

export async function createMenuItem(data: MenuItemInput): Promise<ActionResult> {
  if (isDemoMode()) return { ok: false, error: 'Database not connected' };
  try {
    await prisma.menuItem.create({
      data: {
        price: data.price,
        videoUrl: data.videoUrl,
        posterUrl: data.posterUrl || null,
        order: data.order,
        active: data.active,
        categoryId: data.categoryId,
        translations: {
          create: Object.entries(data.translations)
            .filter(([, v]) => v.title.trim())
            .map(([langCode, v]) => ({
              langCode,
              title: v.title.trim(),
              description: v.description.trim(),
            })),
        },
      },
    });
    revalidatePath('/');
    revalidatePath('/admin');
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Create failed',
    };
  }
}

export async function updateMenuItem(
  id: string,
  data: MenuItemInput,
): Promise<ActionResult> {
  if (isDemoMode()) return { ok: false, error: 'Database not connected' };
  try {
    // Delete existing translations and recreate them (simpler than upsert)
    await prisma.$transaction([
      prisma.menuItemTranslation.deleteMany({ where: { menuItemId: id } }),
      prisma.menuItem.update({
        where: { id },
        data: {
          price: data.price,
          videoUrl: data.videoUrl,
          posterUrl: data.posterUrl || null,
          order: data.order,
          active: data.active,
          categoryId: data.categoryId,
          translations: {
            create: Object.entries(data.translations)
              .filter(([, v]) => v.title.trim())
              .map(([langCode, v]) => ({
                langCode,
                title: v.title.trim(),
                description: v.description.trim(),
              })),
          },
        },
      }),
    ]);
    revalidatePath('/');
    revalidatePath('/admin');
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Update failed',
    };
  }
}

export async function deleteMenuItem(id: string): Promise<ActionResult> {
  if (isDemoMode()) return { ok: false, error: 'Database not connected' };
  try {
    await prisma.menuItem.delete({ where: { id } });
    revalidatePath('/');
    revalidatePath('/admin');
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Delete failed',
    };
  }
}

// ---------------------------------------------------------------------------
// Video upload (filesystem)
// ---------------------------------------------------------------------------
// Saves to public/uploads/videos/ so Next serves the file as a static asset.

const MIME_TO_EXT: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'video/x-m4v': 'm4v',
  'video/ogg': 'ogv',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export async function uploadMedia(
  formData: FormData,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const value = formData.get('video');
  if (
    !value ||
    typeof value === 'string' ||
    typeof value.arrayBuffer !== 'function' ||
    value.size === 0
  ) {
    return { ok: false, error: 'No media file provided' };
  }
  const file = value as File;
  if (!file.type.startsWith('video/') && !file.type.startsWith('image/')) {
    return { ok: false, error: 'File must be a video or image' };
  }
  try {
    const ext =
      MIME_TO_EXT[file.type] ||
      path.extname(file.name ?? '').slice(1).toLowerCase() ||
      (file.type.startsWith('image/') ? 'jpg' : 'mp4');
    const filename = `${Date.now()}-${randomUUID()}.${ext}`;
    const dir = path.join(process.cwd(), 'public', 'uploads', 'videos');
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, filename),
      Buffer.from(await file.arrayBuffer()),
    );
    return { ok: true, url: `/uploads/videos/${filename}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Upload failed' };
  }
}
