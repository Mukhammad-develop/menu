import { stat } from 'fs/promises';
import { createReadStream } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

const EXT_TO_MIME: Record<string, string> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  m4v: 'video/x-m4v',
  ogv: 'video/ogg',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

// Serves uploaded media (videos and images) straight from disk.
// Required because `next start` only serves public/ files that existed when
// the server booted — a file uploaded at runtime would 404 without this handler.
// Supports Range requests for proper video streaming (required by Safari).
export async function GET(
  req: NextRequest,
  { params }: { params: { file: string } },
) {
  const { file } = params;
  // Single-segment, safe filenames only (no path traversal).
  if (!/^[\w.-]+$/.test(file)) {
    return new NextResponse('Not found', { status: 404 });
  }

  const filePath = path.join(process.cwd(), 'public', 'uploads', 'videos', file);
  const ext = path.extname(file).slice(1).toLowerCase();
  const contentType = EXT_TO_MIME[ext] ?? 'application/octet-stream';

  let fileSize: number;
  try {
    const stats = await stat(filePath);
    fileSize = stats.size;
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }

  const rangeHeader = req.headers.get('range');

  // For images or requests without Range, serve the full file
  if (!rangeHeader || contentType.startsWith('image/')) {
    try {
      const stream = createReadStream(filePath);
      const readable = new ReadableStream({
        start(controller) {
          stream.on('data', (chunk: any) => controller.enqueue(new Uint8Array(chunk)));
          stream.on('end', () => controller.close());
          stream.on('error', (err) => controller.error(err));
        },
        cancel() {
          stream.destroy();
        },
      });
      return new NextResponse(readable, {
        headers: {
          'Content-Type': contentType,
          'Content-Length': String(fileSize),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    } catch {
      return new NextResponse('Not found', { status: 404 });
    }
  }

  // Parse Range header for video streaming
  const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
  if (!match) {
    return new NextResponse('Invalid Range', { status: 416 });
  }

  const start = parseInt(match[1], 10);
  const end = match[2] ? parseInt(match[2], 10) : Math.min(start + 1024 * 1024 - 1, fileSize - 1); // 1MB chunks
  const chunkSize = end - start + 1;

  if (start >= fileSize || end >= fileSize) {
    return new NextResponse('Range Not Satisfiable', {
      status: 416,
      headers: { 'Content-Range': `bytes */${fileSize}` },
    });
  }

  const stream = createReadStream(filePath, { start, end });
  const readable = new ReadableStream({
    start(controller) {
      stream.on('data', (chunk: any) => controller.enqueue(new Uint8Array(chunk)));
      stream.on('end', () => controller.close());
      stream.on('error', (err) => controller.error(err));
    },
    cancel() {
      stream.destroy();
    },
  });

  return new NextResponse(readable, {
    status: 206,
    headers: {
      'Content-Type': contentType,
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Content-Length': String(chunkSize),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
