import { Suspense } from 'react';
import { getCategories, getMenuItems } from '@/lib/data';
import VideoFeed from '@/components/VideoFeed';

// Always render fresh data (demo or DB) rather than a cached static page.
export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <main>
      <Suspense
        fallback={
          <div className="flex h-[100dvh] items-center justify-center text-white/50">
            Загрузка…
          </div>
        }
      >
        <Feed />
      </Suspense>
    </main>
  );
}

// Async child streamed inside the Suspense boundary.
async function Feed() {
  const [categories, items] = await Promise.all([
    getCategories(),
    getMenuItems(),
  ]);
  return <VideoFeed categories={categories} items={items} />;
}
