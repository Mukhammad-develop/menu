'use client';

import type { Category } from '@/lib/data';

interface CategoryNavProps {
  categories: Category[];
  active: string; // 'all' or a category slug
  onSelect: (slug: string) => void;
}

// Horizontally scrollable glassmorphism pill carousel. "Все" comes first.
export default function CategoryNav({
  categories,
  active,
  onSelect,
}: CategoryNavProps) {
  const pills = [{ slug: 'all', name: 'Все' }, ...categories];

  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto px-5 py-1">
      {pills.map((pill) => {
        const isActive = active === pill.slug;
        return (
          <button
            key={pill.slug}
            onClick={() => onSelect(pill.slug)}
            className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm backdrop-blur-md transition-colors duration-200 ${
              isActive
                ? 'border-neon bg-white/10 text-neon'
                : 'border-white/20 bg-white/10 text-white/80 hover:bg-white/20'
            }`}
          >
            {pill.name}
          </button>
        );
      })}
    </div>
  );
}
