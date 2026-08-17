'use client';

import { useState, useRef, useEffect } from 'react';
import { type LangCode, LANGUAGE_LABELS } from '@/lib/data';

interface LangSwitcherProps {
  languages: LangCode[];
  current: LangCode;
  onChange: (lang: LangCode) => void;
}

export default function LangSwitcher({ languages, current, onChange }: LangSwitcherProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [open]);

  if (languages.length <= 1) return null;

  return (
    <div ref={ref} className="lang-switcher relative pointer-events-auto">
      {/* Current language button */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full bg-black/50 backdrop-blur-md text-white border border-white/20 transition-all active:scale-95"
      >
        <span className="text-[#C6FF3D]">{current.toUpperCase()}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M2 4L5 7L8 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Dropdown */}
      <div
        className={`absolute right-0 mt-1.5 overflow-hidden rounded-xl bg-black/80 backdrop-blur-xl border border-white/15 shadow-2xl transition-all duration-200 origin-top ${
          open
            ? 'opacity-100 scale-y-100 pointer-events-auto'
            : 'opacity-0 scale-y-0 pointer-events-none'
        }`}
      >
        {languages.map((lang) => (
          <button
            key={lang}
            onClick={() => {
              onChange(lang);
              setOpen(false);
            }}
            className={`w-full px-4 py-2.5 text-left text-sm font-medium flex items-center gap-3 transition-colors ${
              lang === current
                ? 'text-[#C6FF3D] bg-white/10'
                : 'text-white/80 hover:bg-white/5'
            }`}
          >
            <span className="text-xs font-bold w-6">{lang.toUpperCase()}</span>
            <span className="text-white/50 text-xs">{LANGUAGE_LABELS[lang]}</span>
            {lang === current && (
              <span className="ml-auto text-[#C6FF3D] text-xs">✓</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
