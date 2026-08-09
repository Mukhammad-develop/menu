import { getRestaurantById, getCategories, getAllMenuItems, isDemoMode, SUPPORTED_LANGUAGES, LANGUAGE_LABELS, LangCode } from '@/lib/data';
import { updateRestaurant, createCategory, deleteCategory, deleteMenuItem } from '@/app/actions';
import DeleteButton from '@/components/DeleteButton';
import MenuItemForm from '@/components/MenuItemForm';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function RestaurantDashboard({ params }: { params: { id: string } }) {
  const restaurant = await getRestaurantById(params.id);
  
  if (!restaurant) {
    redirect('/admin');
  }

  const categories = await getCategories(restaurant.id);
  const dishes = await getAllMenuItems(restaurant.id);
  const demoMode = isDemoMode();

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <Link href="/admin" className="text-gray-400 hover:text-white text-sm flex items-center gap-2 mb-4">
          ← Back to restaurants
        </Link>
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">{restaurant.name}</h1>
          <div className="flex gap-2">
            {restaurant.languages.map(lang => (
              <span key={lang} className="text-xs px-2 py-0.5 bg-neon/10 text-neon rounded-full">
                {LANGUAGE_LABELS[lang]}
              </span>
            ))}
          </div>
        </div>
      </div>

      {demoMode && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 p-4 rounded-xl text-sm">
          Demo mode is active. Changes will not be saved.
        </div>
      )}

      {/* Settings Form */}
      <details className="bg-white/5 border border-white/10 rounded-2xl group">
        <summary className="p-4 font-semibold cursor-pointer select-none">
          Restaurant Settings
        </summary>
        <div className="p-4 border-t border-white/10">
          <form action={async (formData: FormData) => {
            'use server';
            const name = formData.get('name') as string;
            const langs = SUPPORTED_LANGUAGES.filter(lang => formData.get(`lang_${lang}`) === 'on') as LangCode[];
            if (name && langs.length > 0) {
              await updateRestaurant(restaurant.id, name, langs);
            }
          }} className="space-y-4">
            <div>
              <label className="block text-sm mb-1 text-gray-400">Name</label>
              <input 
                type="text" 
                name="name" 
                defaultValue={restaurant.name}
                required 
                className="w-full bg-black border border-white/20 rounded p-2 text-white outline-none focus:border-neon"
              />
            </div>
            
            <div>
              <label className="block text-sm mb-2 text-gray-400">Languages</label>
              <div className="flex flex-wrap gap-4">
                {SUPPORTED_LANGUAGES.map(lang => (
                  <label key={lang} className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      name={`lang_${lang}`}
                      defaultChecked={restaurant.languages.includes(lang)}
                      className="rounded border-white/20 bg-black text-neon focus:ring-neon accent-neon"
                    />
                    <span className="text-sm">{LANGUAGE_LABELS[lang]}</span>
                  </label>
                ))}
              </div>
            </div>

            <button type="submit" className="bg-neon text-black font-semibold rounded px-4 py-2 hover:bg-neon/90 text-sm">
              Save Settings
            </button>
          </form>
        </div>
      </details>

      {/* Categories */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-b border-white/10 pb-2">Categories</h2>
        
        <div className="grid gap-2">
          {categories.map(c => (
            <div key={c.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
              <div className="text-sm">
                {restaurant.languages.map(lang => {
                  const t = c.translations?.find(tr => tr.langCode === lang);
                  return t ? t.name : '-';
                }).join(' / ')}
              </div>
              <DeleteButton 
                action={async () => {
                  'use server';
                  return deleteCategory(c.id);
                }}
                text="✕"
                className="text-gray-400 hover:text-red-500 px-2 text-lg"
              />
            </div>
          ))}
        </div>

        <form action={async (formData: FormData) => {
          'use server';
          const translations: Record<string, string> = {};
          restaurant.languages.forEach(lang => {
            const val = formData.get(`name_${lang}`) as string;
            if (val) translations[lang] = val;
          });
          if (Object.keys(translations).length > 0) {
            await createCategory(restaurant.id, translations);
          }
        }} className="flex flex-wrap gap-2 items-end p-3 bg-white/5 border border-white/10 rounded-xl">
          {restaurant.languages.map(lang => (
            <div key={lang} className="flex-1 min-w-[150px]">
              <label className="block text-xs mb-1 text-gray-400">Name ({LANGUAGE_LABELS[lang]})</label>
              <input 
                type="text" 
                name={`name_${lang}`} 
                required 
                className="w-full bg-black border border-white/20 rounded p-1.5 text-sm text-white outline-none focus:border-neon"
              />
            </div>
          ))}
          <button type="submit" className="bg-white/10 hover:bg-white/20 font-semibold rounded px-4 py-1.5 text-sm h-[34px]">
            Add
          </button>
        </form>
      </section>

      {/* Dishes */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-b border-white/10 pb-2">Dishes</h2>

        <details className="bg-neon/5 border border-neon/20 rounded-2xl group mb-4">
          <summary className="p-4 font-semibold text-neon cursor-pointer select-none">
            + Add Dish
          </summary>
          <div className="p-4 pt-0 border-t border-neon/20 mt-4">
            <MenuItemForm categories={categories} restaurantId={restaurant.id} languages={restaurant.languages} />
          </div>
        </details>

        <div className="space-y-2">
          {dishes.map(dish => {
            const firstTitle = dish.translations?.find(t => restaurant.languages.includes(t.langCode as LangCode))?.title || dish.translations?.[0]?.title || 'Untitled';
            return (
              <details key={dish.id} className="bg-white/5 border border-white/10 rounded-xl group overflow-hidden">
                <summary className="p-3 flex flex-wrap gap-4 items-center cursor-pointer select-none hover:bg-white/5">
                  <div className="flex-1 min-w-[200px]">
                    <div className="font-medium flex items-center gap-2">
                      {firstTitle}
                      {!dish.active && <span className="text-[10px] bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded">Hidden</span>}
                    </div>
                    <div className="text-xs text-gray-500">
                      {dish.category?.translations?.[0]?.name || 'No Category'} • {dish.price.toLocaleString()} UZS
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {dish.videoUrl && (
                      <a href={dish.videoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-neon hover:underline" onClick={e => e.stopPropagation()}>
                        View Video
                      </a>
                    )}
                    <DeleteButton 
                      action={async () => {
                        'use server';
                        return deleteMenuItem(dish.id);
                      }}
                    />
                    <span className="text-gray-500 group-open:rotate-180 transition-transform">▼</span>
                  </div>
                </summary>
                <div className="p-4 border-t border-white/10 bg-black/50">
                  <MenuItemForm categories={categories} item={dish} restaurantId={restaurant.id} languages={restaurant.languages} />
                </div>
              </details>
            );
          })}
          {dishes.length === 0 && (
            <div className="text-center py-8 text-gray-500 bg-white/5 rounded-2xl border border-white/10">
              No dishes yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
