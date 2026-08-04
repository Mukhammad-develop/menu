'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/db';
import { isDemoMode } from '@/lib/data';

const ADMIN_COOKIE = 'menu_admin';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export interface MenuItemInput {
  title: string;
  description: string;
  price: number;
  videoUrl: string;
  posterUrl?: string | null;
  order: number;
  active: boolean;
  categoryId: string;
}

// --- Auth -----------------------------------------------------------------

export async function login(password: string): Promise<ActionResult> {
  const expected = process.env.ADMIN_PASSWORD || 'admin1234';
  if (password !== expected) {
    return { ok: false, error: 'Неверный пароль' };
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

// --- Categories --------------------------------------------------------------

const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh',
  з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts',
  ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

function slugifyCategory(name: string): string {
  const slug = name
    .toLowerCase()
    .split('')
    .map((c) => TRANSLIT[c] ?? c)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || `cat-${Date.now().toString(36)}`;
}

export async function createCategory(name: string): Promise<ActionResult> {
  if (isDemoMode()) {
    return { ok: false, error: 'Database not connected' };
  }
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: 'Введите название категории' };
  try {
    await prisma.category.create({
      data: { name: trimmed, slug: slugifyCategory(trimmed) },
    });
    revalidatePath('/');
    revalidatePath('/admin');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Create failed' };
  }
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  if (isDemoMode()) {
    return { ok: false, error: 'Database not connected' };
  }
  try {
    await prisma.category.delete({ where: { id } });
    revalidatePath('/');
    revalidatePath('/admin');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Delete failed (maybe it has items?)' };
  }
}

// --- Menu item CRUD (demo mode is read-only) ------------------------------

export async function createMenuItem(data: MenuItemInput): Promise<ActionResult> {
  if (isDemoMode()) {
    return { ok: false, error: 'Database not connected' };
  }
  try {
    await prisma.menuItem.create({
      data: { ...data, posterUrl: data.posterUrl || null },
    });
    revalidatePath('/');
    revalidatePath('/admin');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Create failed' };
  }
}

export async function updateMenuItem(
  id: string,
  data: MenuItemInput,
): Promise<ActionResult> {
  if (isDemoMode()) {
    return { ok: false, error: 'Database not connected' };
  }
  try {
    await prisma.menuItem.update({
      where: { id },
      data: { ...data, posterUrl: data.posterUrl || null },
    });
    revalidatePath('/');
    revalidatePath('/admin');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Update failed' };
  }
}

export async function deleteMenuItem(id: string): Promise<ActionResult> {
  if (isDemoMode()) {
    return { ok: false, error: 'Database not connected' };
  }
  try {
    await prisma.menuItem.delete({ where: { id } });
    revalidatePath('/');
    revalidatePath('/admin');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Delete failed' };
  }
}

// --- Video upload (filesystem) ----------------------------------------------
// Saves to public/uploads/videos/ so Next serves the file as a static asset.
// No database involved — uploads work in demo mode too.

const MIME_TO_EXT: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'video/x-m4v': 'm4v',
  'video/ogg': 'ogv',
};

export async function uploadVideo(
  formData: FormData,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const value = formData.get('video');
  // Duck-typed instead of `instanceof File`: on the server the parsed File
  // can come from a different realm than the global, breaking instanceof.
  if (
    !value ||
    typeof value === 'string' ||
    typeof value.arrayBuffer !== 'function' ||
    value.size === 0
  ) {
    return { ok: false, error: 'No video file provided' };
  }
  const file = value as File;
  if (!file.type.startsWith('video/')) {
    return { ok: false, error: 'File must be a video' };
  }
  try {
    const ext =
      MIME_TO_EXT[file.type] ||
      path.extname(file.name ?? '').slice(1).toLowerCase() ||
      'mp4';
    const filename = `${Date.now()}-${randomUUID()}.${ext}`;
    const dir = path.join(process.cwd(), 'public', 'uploads', 'videos');
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
    return { ok: true, url: `/uploads/videos/${filename}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Upload failed' };
  }
}
