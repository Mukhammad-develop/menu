'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createMenuItem, updateMenuItem } from '@/app/actions';
import type { Category, MenuItem } from '@/lib/data';
import { useActionQueue } from '@/hooks/use-action-queue';
import UploadForm from './UploadForm';

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

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    setStatus(null);

    const data = {
      title,
      description,
      price: parseFloat(price) || 0,
      videoUrl,
      order: parseInt(order, 10) || 0,
      active,
      categoryId,
    };

    // Sequential dispatch: rapid repeated saves are applied one by one.
    void enqueue(async () => {
      const res = item
        ? await updateMenuItem(item.id, data)
        : await createMenuItem(data);
      setPending(false);
      if (res.ok) {
        setStatus('Сохранено');
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
      <input
        value={videoUrl}
        onChange={(e) => setVideoUrl(e.target.value)}
        placeholder="URL видео"
        type="url"
        required
        className={inputCls}
      />
      <UploadForm onUploaded={setVideoUrl} />
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
