'use client';

import { useState, useMemo } from 'react';
import { MagnifyingGlassIcon, FireIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

interface Props {
  categories: any[];
  activeCategoryId: string | null;
  onCategoryChange: (id: string | null) => void;
  onItemSelect: (item: any) => void;
  activeHappyHour: any;
  isLoading?: boolean;
}

export function MenuGrid({
  categories,
  activeCategoryId,
  onCategoryChange,
  onItemSelect,
  activeHappyHour,
  isLoading = false,
}: Props) {
  const [search, setSearch] = useState('');

  const activeCategory = activeCategoryId
    ? categories.find((c) => c.id === activeCategoryId)
    : categories[0];

  const items = useMemo(() => {
    const categoryItems: any[] = activeCategory?.items || [];
    if (!search) return categoryItems;
    return categoryItems.filter((item: any) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description?.toLowerCase().includes(search.toLowerCase())
    );
  }, [activeCategory, search]);

  const allItems = useMemo(() => {
    if (!search) return null;
    return categories.flatMap((c: any) =>
      (c.items || []).filter((item: any) =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.description?.toLowerCase().includes(search.toLowerCase())
      )
    );
  }, [search, categories]);

  const displayItems = search ? allItems || [] : items;

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex gap-2 overflow-x-auto border-b border-white/10 bg-slate-950/60 px-3 py-3 no-scrollbar">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-11 w-28 animate-pulse rounded-2xl bg-white/10" />
          ))}
        </div>
        <div className="border-b border-white/10 bg-slate-950/40 px-3 py-3">
          <div className="h-11 animate-pulse rounded-2xl bg-white/8" />
        </div>
        <div className="grid flex-1 grid-cols-2 gap-2 p-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-[22px] bg-white/8" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* ── Category Tabs ─────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-1 px-3 py-2 border-b border-white/10 bg-slate-950/60 overflow-x-auto no-scrollbar">
        {categories.map((cat: any) => {
          const isActive = (activeCategoryId || categories[0]?.id) === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => { onCategoryChange(cat.id); setSearch(''); }}
              className={clsx(
                'shrink-0 touch-target inline-flex items-center gap-1.5 rounded-2xl px-3 py-2 text-sm font-semibold transition-all whitespace-nowrap touch-manipulation',
                isActive
                  ? 'bg-cyan-300 text-slate-950 shadow-[0_8px_24px_rgba(34,211,238,0.22)]'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white',
              )}
              style={!isActive && cat.color ? { borderLeft: `3px solid ${cat.color}` } : {}}
            >
              {cat.name}
              <span className={clsx('text-[11px] font-bold', isActive ? 'text-slate-950/60' : 'text-slate-500')}>
                {(cat.items || []).filter((i: any) => i.status !== 'INACTIVE').length}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Search ────────────────────────────────────── */}
      <div className="shrink-0 px-3 py-2 border-b border-white/10 bg-slate-950/40">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items…"
            className="input w-full pl-9 py-2 text-sm touch-manipulation"
          />
        </div>

        {activeHappyHour && (
          <div className="mt-2 flex items-center gap-2 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-3 py-2">
            <FireIcon className="w-4 h-4 text-amber-300 shrink-0" />
            <span className="text-xs text-amber-200 font-semibold">
              {activeHappyHour.name} · {activeHappyHour.discountValue}% off until {activeHappyHour.endTime}
            </span>
          </div>
        )}
      </div>

      {/* ── Items Grid ────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-3">
        {search && (
          <p className="text-xs text-slate-500 mb-3 px-1">
            {displayItems.length} result{displayItems.length !== 1 ? 's' : ''} for &ldquo;{search}&rdquo;
          </p>
        )}

        <AnimatePresence mode="popLayout">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {displayItems.map((item: any) => (
              <motion.button
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.1 }}
                onClick={() => item.status !== 'OUT_OF_STOCK' && onItemSelect(item)}
                disabled={item.status === 'OUT_OF_STOCK' || item.status === 'INACTIVE'}
                className={clsx(
                  'pos-item-btn p-3 text-left relative group touch-manipulation',
                  item.status === 'OUT_OF_STOCK' && 'cursor-not-allowed opacity-50',
                  item.status === 'INACTIVE' && 'opacity-30',
                )}
              >
                {item.isPopular && (
                  <span className="absolute top-2 right-2 text-[10px] leading-none">⭐</span>
                )}
                {item.isFeatured && (
                  <span className="absolute top-2 left-2 rounded-md bg-amber-400 px-1 py-0.5 text-[9px] font-black text-slate-950">NEW</span>
                )}

                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-full h-14 object-cover rounded-xl mb-2" />
                ) : (
                  <div className="w-full h-10 rounded-xl mb-2 bg-white/5 flex items-center justify-center text-xl">🍽️</div>
                )}

                <span className="block font-semibold text-xs text-slate-100 leading-tight line-clamp-2 w-full">
                  {item.name}
                </span>
                <span className="block text-sm font-black text-cyan-300 mt-1 tabular-nums">
                  ${item.basePrice.toFixed(2)}
                </span>

                {item.status === 'OUT_OF_STOCK' && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-[22px] bg-slate-900/75">
                    <span className="rotate-[-15deg] rounded border-2 border-red-400 px-1.5 py-0.5 text-xs font-black text-red-300">
                      86&apos;d
                    </span>
                  </div>
                )}

                {item.prepTime > 0 && (
                  <span className="block text-[10px] text-slate-500 mt-0.5 tabular-nums">{item.prepTime}m</span>
                )}
              </motion.button>
            ))}
          </div>
        </AnimatePresence>

        {displayItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <span className="text-4xl mb-3">🔍</span>
            <p className="text-sm font-medium">
              {search ? 'No items match your search' : 'No items in this category'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
