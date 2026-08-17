'use client';

import { useState, useRef, useTransition } from 'react';
import { createMenuItem, updateMenuItem, uploadMedia } from '@/app/actions';
import { Category, MenuItem, LangCode, LANGUAGE_LABELS } from '@/lib/data';

interface MenuItemFormProps {
  categories: Category[];
  item?: MenuItem;
  restaurantId: string;
  languages: LangCode[];
}

export default function MenuItemForm({ categories, item, restaurantId, languages }: MenuItemFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  
  // Initialize translations
  const initialTranslations = languages.reduce((acc, lang) => {
    const existing = item?.translations?.find(t => t.langCode === lang);
    acc[lang] = {
      title: existing?.title || '',
      description: existing?.description || ''
    };
    return acc;
  }, {} as Record<string, { title: string; description: string }>);

  const [translations, setTranslations] = useState(initialTranslations);
  const [videoUrl, setVideoUrl] = useState(item?.videoUrl || '');
  const [uploading, setUploading] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);

  async function handleMediaUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');
    setVideoUrl(''); // Clear previous URL while uploading

    const formData = new FormData();
    formData.append('video', file);

    try {
      const res = await uploadMedia(formData);
      if (res && res.ok && res.url) {
        setVideoUrl(res.url);
      } else {
        const detail = res?.error || 'Server did not respond. Try re-uploading.';
        setError(`Upload error: ${detail} (file: ${file.name}, size: ${(file.size / 1024 / 1024).toFixed(1)}MB, type: ${file.type || 'unknown'})`);
      }
    } catch (err: any) {
      setError(`Upload failed: ${err?.message || 'Unknown error'} (file: ${file.name}, ${(file.size / 1024 / 1024).toFixed(1)}MB)`);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(formData: FormData) {
    setError('');
    
    if (!videoUrl) {
      setError('Media (video or photo) is required');
      return;
    }

    const price = Number(formData.get('price'));
    const order = Number(formData.get('order'));
    const categoryId = formData.get('categoryId') as string;
    const active = formData.get('active') === 'on';

    const data = {
      price,
      videoUrl,
      order,
      active,
      categoryId,
      translations
    };

    startTransition(async () => {
      const result = item 
        ? await updateMenuItem(item.id, data)
        : await createMenuItem(data);
        
      if (!result.ok) {
        setError(result.error || 'Something went wrong');
      } else if (!item) {
        formRef.current?.reset();
        setVideoUrl('');
        setTranslations(languages.reduce((acc, lang) => {
          acc[lang] = { title: '', description: '' };
          return acc;
        }, {} as Record<string, { title: string; description: string }>));
      }
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-4 bg-white/5 p-4 rounded-xl border border-white/10">
      {error && <div className="text-red-500 text-sm p-2 bg-red-500/10 rounded">{error}</div>}
      
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4 md:col-span-2">
          <h4 className="font-semibold text-white">Translations</h4>
          {languages.map(lang => (
            <div key={lang} className="space-y-2 p-3 bg-white/5 rounded-lg border border-white/5">
              <label className="block text-sm font-medium text-neon">
                {LANGUAGE_LABELS[lang]}
              </label>
              <input
                type="text"
                placeholder={`Title (${LANGUAGE_LABELS[lang]})`}
                value={translations[lang]?.title || ''}
                onChange={e => setTranslations(prev => ({
                  ...prev,
                  [lang]: { ...prev[lang], title: e.target.value }
                }))}
                required
                className="w-full bg-black border border-white/20 rounded p-2 text-white focus:border-neon focus:ring-1 focus:ring-neon outline-none"
              />
              <textarea
                placeholder={`Description (${LANGUAGE_LABELS[lang]})`}
                value={translations[lang]?.description || ''}
                onChange={e => setTranslations(prev => ({
                  ...prev,
                  [lang]: { ...prev[lang], description: e.target.value }
                }))}
                rows={2}
                className="w-full bg-black border border-white/20 rounded p-2 text-white focus:border-neon focus:ring-1 focus:ring-neon outline-none"
              />
            </div>
          ))}
        </div>

        <div>
          <label className="block text-sm mb-1 text-gray-400">Category</label>
          <select 
            name="categoryId" 
            defaultValue={item?.categoryId} 
            required
            className="w-full bg-black border border-white/20 rounded p-2 text-white outline-none focus:border-neon"
          >
            <option value="">Select category...</option>
            {categories.map(c => {
              const name = c.translations?.[0]?.name || c.slug;
              return <option key={c.id} value={c.id}>{name}</option>;
            })}
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1 text-gray-400">Price (UZS)</label>
          <input 
            type="number" 
            name="price"
            defaultValue={item?.price}
            required
            min="0"
            className="w-full bg-black border border-white/20 rounded p-2 text-white outline-none focus:border-neon"
          />
        </div>

        <div>
          <label className="block text-sm mb-1 text-gray-400">Order</label>
          <input 
            type="number" 
            name="order"
            defaultValue={item?.order || 0}
            required
            className="w-full bg-black border border-white/20 rounded p-2 text-white outline-none focus:border-neon"
          />
        </div>

        <div>
          <label className="block text-sm mb-1 text-gray-400">Media (Video or Photo)</label>
          {videoUrl && (
            <div className="mb-2">
              {videoUrl.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                <img src={videoUrl} alt="Preview" className="h-20 rounded object-cover" />
              ) : (
                <video src={videoUrl} className="h-20 rounded" controls muted />
              )}
              <div className="text-sm text-green-400 mt-1">✓ Media uploaded successfully</div>
            </div>
          )}
          <input 
            type="file" 
            accept="video/*,image/*"
            onChange={handleMediaUpload}
            disabled={uploading}
            className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-neon file:text-black hover:file:bg-neon/90"
          />
          {uploading && <div className="text-sm text-neon mt-1 animate-pulse">⏳ Uploading... please wait</div>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input 
          type="checkbox" 
          id={`active-${item?.id || 'new'}`}
          name="active" 
          defaultChecked={item ? item.active : true}
          className="rounded border-white/20 bg-black text-neon focus:ring-neon accent-neon"
        />
        <label htmlFor={`active-${item?.id || 'new'}`} className="text-sm text-gray-400">Active (visible to customers)</label>
      </div>

      <button 
        type="submit" 
        disabled={isPending || uploading}
        className="w-full bg-neon text-black font-semibold rounded p-2 hover:bg-neon/90 disabled:opacity-50"
      >
        {isPending ? 'Saving...' : (item ? 'Save Changes' : 'Add Dish')}
      </button>
    </form>
  );
}
