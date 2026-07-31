'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { put } from '@vercel/blob';
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

// --- Video upload (Vercel Blob) --------------------------------------------

export async function uploadVideo(
  formData: FormData,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return { ok: false, error: 'BLOB_READ_WRITE_TOKEN not set' };
  }
  const file = formData.get('video');
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'No video file provided' };
  }
  try {
    const blob = await put(`videos/${Date.now()}-${file.name}`, file, {
      access: 'public',
    });
    return { ok: true, url: blob.url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Upload failed' };
  }
}
