'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createMenuItem, updateMenuItem, uploadVideo } from '@/app/actions';
import type { Category, MenuItem } from '@/lib/data';
import { useActionQueue } from '@/hooks/use-action-queue';

interface MenuItemFormProps {
  categories: Category[];
  // When provided the form edits this item, otherwise it creates a new one.
  item?: MenuItem;
}

const inputCls =
  'w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-neon';

export default function MenuItemForm({ categories, item }: MenuItemFormProps) {
  const [title, setTitle] = useState(item?.title ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [price, setPrice] = useState(item ? String(item.price) : '');
  const [videoUrl, setVideoUrl] = useState(item?.videoUrl ?? '');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [categoryId, setCategoryId] = useState(
    item?.categoryId ?? categories[0]?.id ?? '',
  );
  const [order, setOrder] = useState(item ? String(item.order) : '0');
  const [active, setActive] = useState(item?.active ?? true);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const enqueue = useActionQueue();
  const router = useRouter();

  if (categories.length === 0) {
    return (
      <p className="text-sm text-yellow-200">
        Сначала добавьте хотя бы одну категорию выше — без неё блюдо создать
        нельзя.
      </p>
    );
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFile && !videoUrl.trim()) {
      setError('Добавьте видео: загрузите файл или укажите URL');
      return;
    }
    setPending(true);
    setError(null);
    setStatus(null);

    // Sequential dispatch: rapid repeated saves are applied one by one.
    void enqueue(async () => {
      // Upload-first: if a file is chosen, it wins over the URL field.
      let finalVideoUrl = videoUrl.trim();
      if (videoFile) {
        const fd = new FormData();
        fd.set('video', videoFile);
        const up = await uploadVideo(fd);
        if (!up.ok || !up.url) {
          setPending(false);
          setError(up.error ?? 'Ошибка загрузки видео');
          return;
        }
        finalVideoUrl = up.url;
      }

      const data = {
        title,
        description,
        price: parseFloat(price) || 0,
        videoUrl: finalVideoUrl,
        order: parseInt(order, 10) || 0,
        active,
        categoryId,
      };

      const res = item
        ? await updateMenuItem(item.id, data)
        : await createMenuItem(data);
      setPending(false);
      if (res.ok) {
        setStatus('Сохранено');
        setVideoFile(null);
        router.refresh();
      } else {
        setError(res.error ?? 'Ошибка сохранения');
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Название блюда"
          required
          className={inputCls}
        />
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Цена"
          type="number"
          step="0.01"
          min="0"
          required
          className={inputCls}
        />
      </div>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Описание"
        required
        rows={2}
        className={inputCls}
      />
      <div className="space-y-2">
        <label className="block text-sm text-white/70">
          Видео блюда (файл)
        </label>
        <input
          type="file"
          accept="video/*"
          onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm text-white/70 file:mr-3 file:rounded-lg file:border-0 file:bg-neon file:px-3 file:py-2 file:text-sm file:font-semibold file:text-black hover:file:opacity-90"
        />
        {videoFile ? (
          <p className="text-xs text-neon">Выбрано: {videoFile.name}</p>
        ) : item ? (
          <p className="text-xs text-white/40">
            Не выбирайте файл, чтобы оставить текущее видео.
          </p>
        ) : null}
        <details>
          <summary className="cursor-pointer text-xs text-white/50 hover:text-white/80">
            или укажите URL видео
          </summary>
          <input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://… (необязательно)"
            type="url"
            className={`${inputCls} mt-2`}
          />
        </details>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className={inputCls}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id} className="bg-black">
              {c.name}
            </option>
          ))}
        </select>
        <input
          value={order}
          onChange={(e) => setOrder(e.target.value)}
          placeholder="Порядок"
          type="number"
          className={inputCls}
        />
        <label className="flex items-center gap-2 text-sm text-white/80">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="h-4 w-4 accent-[#C6FF3D]"
          />
          Активно
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-neon px-4 py-2 text-sm font-semibold text-black transition-opacity disabled:opacity-50"
        >
          {pending ? 'Сохранение…' : item ? 'Сохранить' : 'Добавить блюдо'}
        </button>
        {status && <span className="text-sm text-neon">{status}</span>}
        {error && <span className="text-sm text-red-400">{error}</span>}
      </div>
    </form>
  );
}
