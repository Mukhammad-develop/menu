'use client';

import { useRef, useState } from 'react';
import { uploadVideo } from '@/app/actions';
import { useActionQueue } from '@/hooks/use-action-queue';

interface UploadFormProps {
  // Called with the public Blob URL after a successful upload, so a parent
  // form can fill its videoUrl field automatically.
  onUploaded?: (url: string) => void;
}

export default function UploadForm({ onUploaded }: UploadFormProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const enqueue = useActionQueue();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError('Выберите видеофайл');
      return;
    }
    setPending(true);
    setError(null);
    setStatus(null);

    const formData = new FormData();
    formData.set('video', file);

    // Queued so an upload never overlaps a save triggered right before it.
    void enqueue(async () => {
      const res = await uploadVideo(formData);
      setPending(false);
      if (res.ok && res.url) {
        setStatus(res.url);
        onUploaded?.(res.url);
      } else {
        setError(res.error ?? 'Ошибка загрузки');
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          className="text-sm text-white/70 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-sm file:text-white hover:file:bg-white/20"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg border border-neon px-3 py-2 text-sm text-neon transition-colors hover:bg-neon hover:text-black disabled:opacity-50"
        >
          {pending ? 'Загрузка…' : 'Загрузить видео'}
        </button>
      </div>
      {status && (
        <p className="break-all text-xs text-neon">Загружено: {status}</p>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </form>
  );
}
