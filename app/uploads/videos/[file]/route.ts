import { readFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

const EXT_TO_MIME: Record<string, string> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  m4v: 'video/x-m4v',
  ogv: 'video/ogg',
};

// Serves uploaded videos straight from disk. Required because `next start`
// only serves public/ files that existed when the server booted — a video
// uploaded at runtime would 404 until the next restart without this handler.
export async function GET(
  _req: Request,
  { params }: { params: { file: string } },
) {
  const { file } = params;
  // Single-segment, safe filenames only (no path traversal).
  if (!/^[\w.-]+$/.test(file)) {
    return new NextResponse('Not found', { status: 404 });
  }
  try {
    const data = await readFile(
      path.join(process.cwd(), 'public', 'uploads', 'videos', file),
    );
    const ext = path.extname(file).slice(1).toLowerCase();
    return new NextResponse(new Uint8Array(data), {
      headers: {
        'Content-Type': EXT_TO_MIME[ext] ?? 'application/octet-stream',
        // Filenames are unique (timestamp + uuid), so cache forever.
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
