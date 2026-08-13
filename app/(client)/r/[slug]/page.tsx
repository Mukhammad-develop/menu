import { notFound } from 'next/navigation';
import { getRestaurant, getCategories, getMenuItems } from '@/lib/data';
import VideoFeed from '@/components/VideoFeed';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

export default async function RestaurantPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const restaurant = await getRestaurant(slug);

  if (!restaurant || !restaurant.active) {
    notFound();
  }

  const [rawCategories, rawItems] = await Promise.all([
    getCategories(restaurant.id),
    getMenuItems(restaurant.id)
  ]);
  
  const categories = JSON.parse(JSON.stringify(rawCategories)) as typeof rawCategories;
  const items = JSON.parse(JSON.stringify(rawItems)) as typeof rawItems;

  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-black text-white">Loading...</div>}>
      <VideoFeed 
        categories={categories} 
        items={items} 
        languages={restaurant.languages} 
      />
    </Suspense>
  );
}
