'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type Category, type MenuItem, type LangCode, t } from '@/lib/data';
import CategoryNav from './CategoryNav';

interface VideoFeedProps {
  categories: Category[];
  items: MenuItem[];
  languages: LangCode[];
}

// ---------------------------------------------------------------------------
// Preloader: downloads all media into memory as Blob URLs
// ---------------------------------------------------------------------------

function useMediaPreloader(items: MenuItem[]) {
  const [blobMap, setBlobMap] = useState<Map<string, string>>(new Map());
  const [loaded, setLoaded] = useState(0);
  const [total, setTotal] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (items.length === 0) {
      setReady(true);
      return;
    }

    // Collect unique URLs
    const urls = Array.from(new Set(items.map(i => i.videoUrl)));
    setTotal(urls.length);
    setLoaded(0);

    const map = new Map<string, string>();
    let cancelled = false;

    async function preloadAll() {
      // Download 3 at a time to avoid overwhelming the connection
      const queue = [...urls];
      const workers = Array.from({ length: 3 }, async () => {
        while (queue.length > 0 && !cancelled) {
          const url = queue.shift()!;
          try {
            const res = await fetch(url);
            const blob = await res.blob();
            if (!cancelled) {
              const blobUrl = URL.createObjectURL(blob);
              map.set(url, blobUrl);
              setLoaded(prev => prev + 1);
            }
          } catch (err) {
            // If a single file fails, skip it — the original URL will be used
            console.warn('Failed to preload:', url, err);
            if (!cancelled) {
              setLoaded(prev => prev + 1);
            }
          }
        }
      });

      await Promise.all(workers);

      if (!cancelled) {
        setBlobMap(new Map(map));
        setReady(true);
      }
    }

    preloadAll();

    return () => {
      cancelled = true;
      // Revoke blob URLs on unmount
      map.forEach(blobUrl => URL.revokeObjectURL(blobUrl));
    };
  }, [items]);

  // Helper: get blob URL or fallback to original
  const getUrl = useCallback(
    (originalUrl: string) => blobMap.get(originalUrl) || originalUrl,
    [blobMap],
  );

  return { ready, loaded, total, getUrl };
}

// ---------------------------------------------------------------------------
// Loading Screen
// ---------------------------------------------------------------------------

function LoadingScreen({ loaded, total }: { loaded: number; total: number }) {
  const pct = total > 0 ? Math.round((loaded / total) * 100) : 0;

  return (
    <div className="flex h-[100dvh] w-full flex-col items-center justify-center bg-black text-white">
      {/* Animated dish icon */}
      <div className="mb-8 animate-pulse">
        <svg
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#C6FF3D"
          strokeWidth="1.5"
          strokeLinecap="round"
        >
          <path d="M4 17h16" />
          <path d="M5 17a7 7 0 0 1 14 0" />
          <path d="M12 10V6" />
          <circle cx="12" cy="5" r="1" fill="#C6FF3D" stroke="none" />
        </svg>
      </div>

      <h2 className="mb-2 text-lg font-semibold tracking-wide uppercase text-white/90">
        Загрузка меню
      </h2>
      <p className="mb-6 text-sm text-white/50">
        {loaded} / {total}
      </p>

      {/* Progress bar */}
      <div className="mx-auto w-64 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full bg-[#C6FF3D] rounded-full transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="mt-3 text-xs text-white/30">{pct}%</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main VideoFeed component
// ---------------------------------------------------------------------------

export default function VideoFeed({ categories, items, languages }: VideoFeedProps) {
  const { ready, loaded, total, getUrl } = useMediaPreloader(items);
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

  const goNext = useCallback(() => {
    setIndex(prev => {
      const cur = Math.min(prev, Math.max(filtered.length - 1, 0));
      if (cur < filtered.length - 1) {
        return cur + 1;
      } else {
        const catIndex = categories.findIndex((c) => c.slug === activeCategory);
        if (catIndex !== -1) {
          const nextCatIndex = (catIndex + 1) % categories.length;
          setActiveCategory(categories[nextCatIndex].slug);
        }
        return 0;
      }
    });
  }, [filtered.length, categories, activeCategory]);

  const goPrev = useCallback(() => {
    setIndex(prev => {
      const cur = Math.min(prev, Math.max(filtered.length - 1, 0));
      if (cur > 0) {
        return cur - 1;
      } else {
        const catIndex = categories.findIndex((c) => c.slug === activeCategory);
        if (catIndex !== -1) {
          const prevCatIndex = (catIndex - 1 + categories.length) % categories.length;
          setActiveCategory(categories[prevCatIndex].slug);
        }
        return 0;
      }
    });
  }, [filtered.length, categories, activeCategory]);

  const onPointerDown = (e: React.PointerEvent) => {
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

  // Show loading screen while preloading
  if (!ready) {
    return <LoadingScreen loaded={loaded} total={total} />;
  }

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
              getUrl={getUrl}
            />
          ))}
        </div>
      )}

      {/* Language Switcher */}
      {languages.length > 1 && (
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
      )}

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

// ---------------------------------------------------------------------------
// Slide component
// ---------------------------------------------------------------------------

function isImage(url: string) {
  return /\.(jpg|jpeg|png|webp|gif)$/i.test(url);
}

function Slide({
  item,
  active,
  onEnded,
  total,
  currentIndex,
  itemIndex,
  langCode,
  getUrl,
}: {
  item: MenuItem;
  active: boolean;
  onEnded: () => void;
  total: number;
  currentIndex: number;
  itemIndex: number;
  langCode: LangCode;
  getUrl: (url: string) => string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number>();
  const isImg = isImage(item.videoUrl);

  // Use blob URL from preloader (plays from memory, no network needed)
  const mediaSrc = getUrl(item.videoUrl);

  useEffect(() => {
    if (!active) {
      if (videoRef.current) {
        videoRef.current.pause();
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    if (isImg) {
      setProgress(0);
      let startTime = performance.now();
      const duration = 5000; // 5 seconds for images

      const updateProgress = (now: number) => {
        const elapsed = now - startTime;
        if (elapsed >= duration) {
          setProgress(100);
          onEnded();
        } else {
          setProgress((elapsed / duration) * 100);
          rafRef.current = requestAnimationFrame(updateProgress);
        }
      };
      rafRef.current = requestAnimationFrame(updateProgress);
    } else {
      const video = videoRef.current;
      if (!video) return;

      const updateProgress = () => {
        if (video.duration) {
          setProgress((video.currentTime / video.duration) * 100);
        }
        rafRef.current = requestAnimationFrame(updateProgress);
      };

      video.currentTime = 0;
      setProgress(0);
      video.play().catch(() => {});
      rafRef.current = requestAnimationFrame(updateProgress);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, isImg, onEnded]);

  // Keep all slides mounted since media is in memory (no network cost)
  if (!active && Math.abs(currentIndex - itemIndex) > 2) {
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
      {isImg ? (
        <img
          src={mediaSrc}
          className="h-full w-full object-cover pointer-events-none"
          alt={translatedTitle}
        />
      ) : (
        <video
          ref={videoRef}
          src={mediaSrc}
          poster={item.posterUrl ?? undefined}
          muted
          playsInline
          preload="auto"
          className="h-full w-full object-cover pointer-events-none"
          onEnded={onEnded}
        />
      )}

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
