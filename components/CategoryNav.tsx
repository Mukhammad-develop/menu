'use client';

import type { Category } from '@/lib/data';

interface CategoryNavProps {
  categories: Category[];
  active: string; // 'all' or a category slug
  onSelect: (slug: string) => void;
}

// Horizontally scrollable category carousel with rounded square buttons
export default function CategoryNav({
  categories,
  active,
  onSelect,
}: CategoryNavProps) {
  const pills = [{ slug: 'all', name: 'Все позиции' }, ...categories];

  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto px-5 py-2">
      {pills.map((pill) => {
        const isActive = active === pill.slug;
        return (
          <button
            key={pill.slug}
            onClick={() => onSelect(pill.slug)}
            className={`flex h-[72px] w-[72px] shrink-0 flex-col items-center justify-center rounded-[18px] border backdrop-blur-md transition-colors duration-200 ${
              isActive
                ? 'border-[#C6FF3D] bg-black/40 text-[#C6FF3D]'
                : 'border-white/20 bg-black/20 text-white/90 hover:bg-black/40'
            }`}
          >
            <span
              className="text-center text-[11px] font-medium leading-[1.2] tracking-wide"
              style={{ whiteSpace: 'pre-wrap' }}
            >
              {pill.name.replace(' ', '\n')}
            </span>
          </button>
        );
      })}
    </div>
  );
}
