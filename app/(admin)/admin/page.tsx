import { redirect } from 'next/navigation';
import { getRestaurants, isDemoMode, SUPPORTED_LANGUAGES, LANGUAGE_LABELS, LangCode } from '@/lib/data';
import { createRestaurant, deleteRestaurant, logout } from '@/app/actions';
import DeleteButton from '@/components/DeleteButton';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const rawRestaurants = await getRestaurants();
  const restaurants = JSON.parse(JSON.stringify(rawRestaurants)) as typeof rawRestaurants;
  const demoMode = isDemoMode();

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <form action={async () => {
          'use server';
          await logout();
          redirect('/admin/login');
        }}>
          <button className="text-sm px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
            Logout
          </button>
        </form>
      </div>

      {demoMode && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 p-4 rounded-xl text-sm">
          Demo mode is active. Changes will not be saved.
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-b border-white/10 pb-2">Restaurants</h2>
        
        <div className="grid gap-4">
          {restaurants.map(r => (
            <div key={r.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
              <Link href={`/admin/restaurant/${r.id}`} className="flex-1 hover:opacity-80">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-lg">{r.name}</h3>
                  <span className="text-sm text-gray-500">/{r.slug}</span>
                </div>
                <div className="flex gap-2 mt-2">
                  {r.languages.map(lang => (
                    <span key={lang} className="text-xs px-2 py-0.5 bg-neon/10 text-neon rounded-full">
                      {LANGUAGE_LABELS[lang]}
                    </span>
                  ))}
                  {r._count?.categories !== undefined && (
                    <span className="text-xs px-2 py-0.5 bg-white/10 rounded-full text-gray-400">
                      {r._count.categories} categories
                    </span>
                  )}
                </div>
              </Link>
              <div className="ml-4 pl-4 border-l border-white/10">
                <DeleteButton 
                  action={deleteRestaurant.bind(null, r.id)}
                />
              </div>
            </div>
          ))}
          {restaurants.length === 0 && (
            <div className="text-center py-8 text-gray-500 bg-white/5 rounded-2xl border border-white/10">
              No restaurants found.
            </div>
          )}
        </div>

        <div className="mt-8 p-4 bg-white/5 border border-white/10 rounded-2xl">
          <h3 className="font-semibold mb-4">Add New Restaurant</h3>
          <form action={async (formData: FormData) => {
            'use server';
            const name = formData.get('name') as string;
            const languages = SUPPORTED_LANGUAGES.filter(lang => formData.get(`lang_${lang}`) === 'on') as LangCode[];
            if (!name || languages.length === 0) return;
            await createRestaurant(name, languages);
          }} className="space-y-4">
            <div>
              <label className="block text-sm mb-1 text-gray-400">Name</label>
              <input 
                type="text" 
                name="name" 
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
                      defaultChecked={lang === 'en' || lang === 'ru' || lang === 'uz'}
                      className="rounded border-white/20 bg-black text-neon focus:ring-neon accent-neon"
                    />
                    <span className="text-sm">{LANGUAGE_LABELS[lang]}</span>
                  </label>
                ))}
              </div>
            </div>

            <button type="submit" className="w-full bg-neon text-black font-semibold rounded p-2 hover:bg-neon/90">
              Add Restaurant
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
