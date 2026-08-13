import { redirect } from 'next/navigation';
import { getRestaurants } from '@/lib/data';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const rawRestaurants = await getRestaurants();
  const restaurants = JSON.parse(JSON.stringify(rawRestaurants)) as typeof rawRestaurants;

  if (restaurants.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
        <p>No restaurants configured. Visit /admin to set up.</p>
      </div>
    );
  }

  if (restaurants.length === 1) {
    redirect(`/r/${restaurants[0].slug}`);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
      <h1 className="mb-8 text-2xl font-bold">Select a Restaurant</h1>
      <div className="flex flex-col gap-4">
        {restaurants.map((restaurant) => (
          <Link
            key={restaurant.id}
            href={`/r/${restaurant.slug}`}
            className="rounded-lg border border-white/20 bg-white/5 px-6 py-3 text-center text-lg font-medium transition hover:border-[#C6FF3D] hover:text-[#C6FF3D]"
          >
            {restaurant.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
