'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { type Category, type MenuItem, type LangCode, t } from '@/lib/data';
import CategoryNav from './CategoryNav';

interface VideoFeedProps {
  categories: Category[];
  items: MenuItem[];
  languages: LangCode[];
}

export default function VideoFeed({ categories, items, languages }: VideoFeedProps) {
  const [activeCategory, setActiveCategory] = useState(categories[0]?.slug || '');
  const [index, setIndex] = useState(0);
  const [langCode, setLangCode] = useState<LangCode>(languages[0]);

  const filtered = useMemo(
    () => items.filter((item) => item.category.slug === activeCategory),
    [items, activeCategory],
  );

  useEffect(() => {
    setIndex(0);
  }, [activeCategory]);

  const current = Math.min(index, Math.max(filtered.length - 1, 0));

  const goNext = () => {
    if (current < filtered.length - 1) {
      setIndex(current + 1);
    } else {
      const catIndex = categories.findIndex((c) => c.slug === activeCategory);
      if (catIndex !== -1) {
        const nextCatIndex = (catIndex + 1) % categories.length;
        setActiveCategory(categories[nextCatIndex].slug);
      }
    }
  };

  const goPrev = () => {
    if (current > 0) {
      setIndex(current - 1);
    } else {
      const catIndex = categories.findIndex((c) => c.slug === activeCategory);
      if (catIndex !== -1) {
        const prevCatIndex = (catIndex - 1 + categories.length) % categories.length;
        setActiveCategory(categories[prevCatIndex].slug);
      }
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    // Avoid triggering navigation when clicking on the category nav area
    const target = e.target as HTMLElement;
    if (target.closest('.category-nav-container')) return;
    if (target.closest('.lang-switcher')) return;

    const { clientX } = e;
    const width = window.innerWidth;
    if (clientX < width * 0.3) {
      goPrev();
    } else {
      goNext();
    }
  };

  return (
    <div className="relative h-[100dvh] w-full touch-none select-none overflow-hidden bg-black">
      {filtered.length === 0 ? (
        <div className="flex h-full items-center justify-center text-white/50">
          Нет блюд в этой категории
        </div>
      ) : (
        <div className="h-full w-full" onPointerDown={onPointerDown}>
          {filtered.map((item, i) => (
            <Slide
              key={item.id}
              item={item}
              active={i === current}
              onEnded={goNext}
              total={filtered.length}
              currentIndex={current}
              itemIndex={i}
              langCode={langCode}
            />
          ))}
        </div>
      )}

      {/* Language Switcher */}
      <div className="lang-switcher absolute top-6 right-4 z-20 flex gap-1 pointer-events-auto">
        {languages.map((lang) => (
          <button
            key={lang}
            onClick={() => setLangCode(lang)}
            className={`px-2 py-1 text-xs font-bold rounded transition-colors ${
              lang === langCode 
                ? 'bg-[#C6FF3D] text-black' 
                : 'bg-black/40 text-white/70 backdrop-blur-md'
            }`}
          >
            {lang.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Anchored bottom UI: category carousel + "Меню" label. */}
      <div className="category-nav-container absolute inset-x-0 bottom-0 z-20 pb-3 pointer-events-none">
        <div className="pointer-events-auto">
          <CategoryNav
            categories={categories}
            active={activeCategory}
            onSelect={setActiveCategory}
            langCode={langCode}
          />
        </div>
        <div className="mt-2 flex items-center justify-center gap-1.5 text-white/70">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#C6FF3D"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M4 17h16" />
            <path d="M5 17a7 7 0 0 1 14 0" />
            <path d="M12 10V8" />
            <circle cx="12" cy="7" r="1" fill="#C6FF3D" stroke="none" />
          </svg>
          <span className="text-xs uppercase tracking-[0.3em]">Меню</span>
        </div>
      </div>
    </div>
  );
}

function Slide({
  item,
  active,
  onEnded,
  total,
  currentIndex,
  itemIndex,
  langCode,
}: {
  item: MenuItem;
  active: boolean;
  onEnded: () => void;
  total: number;
  currentIndex: number;
  itemIndex: number;
  langCode: LangCode;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number>();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateProgress = () => {
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100);
      }
      rafRef.current = requestAnimationFrame(updateProgress);
    };

    if (active) {
      video.currentTime = 0;
      setProgress(0);
      video.play().catch(() => {});
      rafRef.current = requestAnimationFrame(updateProgress);
    } else {
      video.pause();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active]);

  // Keep neighbouring slides mounted for preload, but visually hidden
  if (!active && Math.abs(currentIndex - itemIndex) > 1) {
    return null;
  }

  const translatedTitle = t(item.translations, langCode)?.title ?? '';
  const translatedDescription = t(item.translations, langCode)?.description ?? '';

  return (
    <div
      className={`absolute inset-0 h-full w-full ${
        active ? 'z-10 opacity-100' : 'z-0 opacity-0 pointer-events-none'
      }`}
    >
      <video
        ref={videoRef}
        src={item.videoUrl}
        poster={item.posterUrl ?? undefined}
        muted
        playsInline
        preload={Math.abs(currentIndex - itemIndex) <= 1 ? 'auto' : 'none'}
        className="h-full w-full object-cover pointer-events-none"
        onEnded={onEnded}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-black/80 via-black/40 to-transparent" />

      <div className="pointer-events-none absolute inset-x-0 top-0 px-4 pt-6">
        {/* Progress Bars */}
        {active && (
          <div className="flex gap-1.5 mb-6">
            {Array.from({ length: total }).map((_, i) => (
              <div key={i} className="h-[3px] flex-1 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white"
                  style={{
                    width:
                      i < currentIndex
                        ? '100%'
                        : i === currentIndex
                        ? `${progress}%`
                        : '0%',
                  }}
                />
              </div>
            ))}
          </div>
        )}

        <h1 className="text-[26px] font-bold leading-tight text-white mb-1 drop-shadow-md">
          {translatedTitle}
        </h1>
        {translatedDescription && (
          <p className="mb-2 text-sm font-medium leading-snug text-white/70 drop-shadow-md max-w-[90%]">
            {translatedDescription}
          </p>
        )}
        <p className="text-[22px] font-extrabold text-white drop-shadow-md">
          {new Intl.NumberFormat('ru-RU').format(item.price)} UZS
        </p>
      </div>
    </div>
  );
}
