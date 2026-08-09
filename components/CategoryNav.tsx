'use client';

import { type Category, t } from '@/lib/data';

interface CategoryNavProps {
  categories: Category[];
  active: string;
  onSelect: (slug: string) => void;
  langCode: string;
}

// Circular "coverflow" style spotlight carousel
export default function CategoryNav({
  categories,
  active,
  onSelect,
  langCode,
}: CategoryNavProps) {
  const activeIndex = categories.findIndex((c) => c.slug === active);
  const len = categories.length;

  return (
    <div className="relative flex h-24 w-full items-center justify-center overflow-hidden">
      {categories.map((pill, i) => {
        // Calculate shortest distance in circular array
        let diff = (i - activeIndex) % len;
        if (diff < 0) diff += len;
        if (diff > Math.floor(len / 2)) {
          diff -= len;
        }

        const absDiff = Math.abs(diff);
        const isActive = diff === 0;
        const isVisible = absDiff <= 2;

        const translateX = diff * 80; // 80px shift per item
        const scale = isActive ? 1.15 : Math.max(1 - absDiff * 0.2, 0.7);
        const opacity = isActive ? 1 : Math.max(1 - absDiff * 0.4, 0);
        const zIndex = 10 - absDiff;
        
        const translatedName = t(pill.translations, langCode)?.name ?? pill.slug;

        return (
          <button
            key={pill.slug}
            onClick={() => onSelect(pill.slug)}
            className={`absolute flex h-[72px] w-[72px] flex-col items-center justify-center rounded-[18px] border backdrop-blur-md transition-all duration-300 ease-out ${
              isActive
                ? 'border-[#C6FF3D] bg-black/60 text-[#C6FF3D] shadow-[0_0_15px_rgba(198,255,61,0.25)]'
                : 'border-white/20 bg-black/20 text-white/70 hover:bg-black/40'
            }`}
            style={{
              transform: `translateX(${translateX}px) scale(${scale})`,
              opacity: isVisible ? opacity : 0,
              zIndex,
              pointerEvents: isVisible ? 'auto' : 'none',
            }}
          >
            <span
              className="text-center text-[11px] font-medium leading-[1.2] tracking-wide"
              style={{ whiteSpace: 'pre-wrap' }}
            >
              {translatedName.replace(' ', '\n')}
            </span>
          </button>
        );
      })}
    </div>
  );
}
