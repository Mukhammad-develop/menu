'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, PanInfo } from 'framer-motion';
import type { Category, MenuItem } from '@/lib/data';
import CategoryNav from './CategoryNav';

// Vertical drag distance (px) that counts as a swipe to the next/prev dish.
const SWIPE_THRESHOLD = 80;
// Cooldown after a wheel-triggered slide change, so one scroll gesture
// doesn't skip through several dishes at once.
const WHEEL_COOLDOWN_MS = 600;

interface VideoFeedProps {
  categories: Category[];
  items: MenuItem[];
}

export default function VideoFeed({ categories, items }: VideoFeedProps) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [index, setIndex] = useState(0);
  const wheelLock = useRef(false);

  const filtered = useMemo(
    () =>
      activeCategory === 'all'
        ? items
        : items.filter((item) => item.category.slug === activeCategory),
    [items, activeCategory],
  );

  // Filtering resets the feed to the first dish.
  useEffect(() => {
    setIndex(0);
  }, [activeCategory]);

  const go = (dir: 1 | -1) => {
    setIndex((i) => Math.min(Math.max(i + dir, 0), filtered.length - 1));
  };

  // Clamp the index so it stays valid when the filtered list shrinks.
  const current = Math.min(index, Math.max(filtered.length - 1, 0));

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y < -SWIPE_THRESHOLD) go(1);
    else if (info.offset.y > SWIPE_THRESHOLD) go(-1);
  };

  const onWheel = (e: React.WheelEvent) => {
    if (wheelLock.current || Math.abs(e.deltaY) < 20) return;
    wheelLock.current = true;
    go(e.deltaY > 0 ? 1 : -1);
    setTimeout(() => {
      wheelLock.current = false;
    }, WHEEL_COOLDOWN_MS);
  };

  // Keyboard arrows for desktop testing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') go(1);
      else if (e.key === 'ArrowUp') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered.length]);

  // Render only the active slide and its immediate neighbours.
  const windowed = [current - 1, current, current + 1].filter(
    (i) => i >= 0 && i < filtered.length,
  );

  return (
    <div
      className="relative h-[100dvh] w-full touch-none select-none overflow-hidden bg-black"
      onWheel={onWheel}
    >
      {filtered.length === 0 ? (
        <div className="flex h-full items-center justify-center text-white/50">
          Нет блюд в этой категории
        </div>
      ) : (
        <motion.div
          className="h-full w-full"
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.15}
          onDragEnd={onDragEnd}
        >
          {windowed.map((i) => (
            <motion.div
              key={filtered[i].id}
              className="absolute inset-0"
              initial={false}
              animate={{ y: `${(i - current) * 100}%` }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            >
              <Slide item={filtered[i]} active={i === current} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Anchored bottom UI: category carousel + "Меню" label. */}
      <div className="absolute inset-x-0 bottom-0 z-20 pb-3">
        <CategoryNav
          categories={categories}
          active={activeCategory}
          onSelect={setActiveCategory}
        />
        <div className="mt-2 flex items-center justify-center gap-1.5 text-white/70">
          {/* Tiny cloche icon in the neon accent colour. */}
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

function Slide({ item, active }: { item: MenuItem; active: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Only the active video plays; neighbours are paused and rewound.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (active) {
      video.play().catch(() => {
        /* autoplay can be blocked before first user gesture */
      });
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }, [active]);

  return (
    <div className="relative h-full w-full">
      <video
        ref={videoRef}
        src={item.videoUrl}
        poster={item.posterUrl ?? undefined}
        muted
        loop
        playsInline
        preload="metadata"
        className="h-full w-full object-cover"
      />

      {/* Top gradient keeps the dish info readable over any video. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-2/5 bg-gradient-to-b from-black/80 via-black/40 to-transparent" />

      <div className="pointer-events-none absolute inset-x-0 top-0 p-6 pt-10">
        <span className="text-xs uppercase tracking-widest text-white/60">
          {item.category.name}
        </span>
        <h1 className="mt-1 text-3xl font-bold leading-tight">{item.title}</h1>
        <p className="mt-2 line-clamp-2 max-w-md text-sm text-white/75">
          {item.description}
        </p>
        <p className="mt-3 text-2xl font-extrabold text-neon">
          {new Intl.NumberFormat('ru-RU').format(item.price)} ₽
        </p>
      </div>
    </div>
  );
}
