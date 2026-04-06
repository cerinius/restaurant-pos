'use client';

import { useMemo, useState } from 'react';
import { MagnifyingGlassIcon, SparklesIcon, XMarkIcon } from '@heroicons/react/24/outline';
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value || 0);
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
    ? categories.find((category) => category.id === activeCategoryId)
    : categories[0];

  const items = useMemo(() => {
    const categoryItems: any[] = activeCategory?.items || [];
    if (!search) return categoryItems;

    return categoryItems.filter((item: any) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description?.toLowerCase().includes(search.toLowerCase()),
    );
  }, [activeCategory, search]);

  const allItems = useMemo(() => {
    if (!search) return null;

    return categories.flatMap((category: any) =>
      (category.items || []).filter((item: any) =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.description?.toLowerCase().includes(search.toLowerCase()),
      ),
    );
  }, [categories, search]);

  const displayItems = search ? allItems || [] : items;
  const activeCategoryKey = activeCategoryId || categories[0]?.id || null;

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex gap-2 overflow-x-auto border-b border-white/10 bg-slate-950/40 px-4 py-4 no-scrollbar">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-12 w-28 animate-pulse rounded-2xl bg-white/10" />
          ))}
        </div>
        <div className="border-b border-white/10 bg-slate-950/30 px-4 py-4">
          <div className="h-12 animate-pulse rounded-2xl bg-white/8" />
        </div>
        <div className="grid flex-1 grid-cols-2 gap-3 p-4 lg:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-44 animate-pulse rounded-[24px] bg-white/8" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-transparent">
      <div className="border-b border-white/10 bg-slate-950/30 px-4 py-4">
        <div className="flex flex-wrap gap-2">
          {categories.map((category: any) => {
            const isActive = activeCategoryKey === category.id;
            const count = (category.items || []).filter((item: any) => item.status !== 'INACTIVE').length;

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => {
                  onCategoryChange(category.id);
                  setSearch('');
                }}
                className={clsx(
                  'touch-target inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition-all',
                  isActive
                    ? 'bg-cyan-300 text-slate-950 shadow-[0_12px_32px_rgba(34,211,238,0.22)]'
                    : 'border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10',
                )}
              >
                <span>{category.name}</span>
                <span className={clsx('rounded-full px-2 py-0.5 text-[11px]', isActive ? 'bg-slate-950/10' : 'bg-white/8 text-slate-400')}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-b border-white/10 bg-slate-950/20 px-4 py-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search menu items"
              className="input w-full rounded-2xl pl-12 pr-11 text-base"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
                aria-label="Clear search"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2 text-sm">
            <span className="ops-chip">
              {displayItems.length} item{displayItems.length === 1 ? '' : 's'}
            </span>
            {activeCategory && !search && (
              <span className="ops-chip">
                {activeCategory.name}
              </span>
            )}
          </div>
        </div>

        {activeHappyHour && (
          <div className="mt-3 flex items-center gap-3 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm">
            <SparklesIcon className="h-5 w-5 shrink-0 text-amber-300" />
            <span className="font-semibold text-amber-100">
              {activeHappyHour.name} · {activeHappyHour.discountValue}% off until {activeHappyHour.endTime}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <AnimatePresence mode="popLayout">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-4">
            {displayItems.map((item: any) => {
              const unavailable = item.status === 'OUT_OF_STOCK' || item.status === 'INACTIVE';

              return (
                <motion.button
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  type="button"
                  onClick={() => !unavailable && onItemSelect(item)}
                  disabled={unavailable}
                  className={clsx(
                    'group flex min-h-[210px] flex-col rounded-[24px] border border-white/10 bg-white/[0.04] p-3 text-left transition-all',
                    'focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950',
                    unavailable ? 'cursor-not-allowed opacity-45' : 'hover:border-cyan-300/25 hover:bg-white/[0.08]',
                  )}
                >
                  <div className="relative overflow-hidden rounded-[18px] bg-slate-800">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="h-24 w-full object-cover" />
                    ) : (
                      <div className="flex h-24 items-center justify-center bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_55%),linear-gradient(180deg,rgba(30,41,59,0.95),rgba(15,23,42,0.95))] text-3xl text-slate-300">
                        Plate
                      </div>
                    )}

                    {item.status === 'OUT_OF_STOCK' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/75">
                        <span className="rounded-full border border-red-300/25 bg-red-500/15 px-3 py-1 text-sm font-bold text-red-100">
                          86&apos;d
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-2 text-base font-bold text-slate-100">{item.name}</p>
                      {item.isPopular && (
                        <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-100">
                          Popular
                        </span>
                      )}
                    </div>

                    <p className="mt-2 line-clamp-2 text-sm text-slate-400">
                      {item.description || 'Quick add item'}
                    </p>

                    <div className="mt-auto flex items-end justify-between pt-4">
                      <span className="text-xl font-black text-cyan-300">
                        {formatCurrency(Number(item.basePrice || 0))}
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Tap to add
                      </span>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </AnimatePresence>

        {displayItems.length === 0 && (
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] px-6 text-center text-slate-400">
            <MagnifyingGlassIcon className="mb-4 h-14 w-14 text-slate-600" />
            <p className="text-lg font-bold text-slate-200">
              {search ? 'No items match that search' : 'No items in this category yet'}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {search ? 'Try a simpler keyword or switch categories.' : 'Pick another category to keep building the order.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
