
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

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '',
  OUT_OF_STOCK: 'opacity-50',
  INACTIVE: 'opacity-30',
};

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

  // All items for search across all categories
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
        <div className="flex gap-2 overflow-x-auto border-b border-slate-700 bg-slate-900 px-3 py-3 no-scrollbar">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-11 w-28 animate-pulse rounded-2xl bg-slate-800" />
          ))}
        </div>
        <div className="border-b border-slate-700 bg-slate-900 px-3 py-3">
          <div className="h-11 animate-pulse rounded-2xl bg-slate-800" />
        </div>
        <div className="grid flex-1 grid-cols-2 gap-3 p-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-3xl bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Category Tabs */}
      <div className="shrink-0 flex items-center gap-1 px-3 py-2 bg-slate-900 border-b border-slate-700 overflow-x-auto no-scrollbar">
        {categories.map((cat: any) => (
          <button
            key={cat.id}
            onClick={() => { onCategoryChange(cat.id); setSearch(''); }}
            className={clsx(
              'shrink-0 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap',
              (activeCategoryId || categories[0]?.id) === cat.id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            )}
            style={
              (activeCategoryId || categories[0]?.id) !== cat.id && cat.color
                ? { borderLeft: `3px solid ${cat.color}` }
                : {}
            }
          >
            {cat.name}
            <span className="ml-1.5 text-xs opacity-60">
              {(cat.items || []).filter((i: any) => i.status !== 'INACTIVE').length}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="shrink-0 px-3 py-2 bg-slate-900 border-b border-slate-700">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items..."
            className="input w-full pl-9 py-2 text-sm"
          />
        </div>

        {activeHappyHour && (
          <div className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-amber-900/40 border border-amber-600/50 rounded-xl">
            <FireIcon className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs text-amber-300 font-medium">
              ðº {activeHappyHour.name} â {activeHappyHour.discountValue}% off until {activeHappyHour.endTime}
            </span>
          </div>
        )}
      </div>

      {/* Items Grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {search && (
          <p className="text-xs text-slate-500 mb-3">
            {displayItems.length} result{displayItems.length !== 1 ? 's' : ''} for "{search}"
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
                  'pos-item-btn p-3 text-left relative group',
                  STATUS_COLORS[item.status] || '',
                  item.status === 'OUT_OF_STOCK' && 'cursor-not-allowed'
                )}
              >
                {/* Popular badge */}
                {item.isPopular && (
                  <span className="absolute top-1.5 right-1.5 text-xs">â­</span>
                )}
                {/* Featured badge */}
                {item.isFeatured && (
                  <span className="absolute top-1.5 left-1.5 bg-amber-500 text-black text-xs px-1 rounded font-bold">NEW</span>
                )}

                {/* Image */}
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-16 object-cover rounded-lg mb-2"
                  />
                ) : (
                  <div className="w-full h-12 bg-slate-700 rounded-lg mb-2 flex items-center justify-center text-2xl">
                    ð½ï¸
                  </div>
                )}

                {/* Name */}
                <span className="font-semibold text-xs text-slate-100 leading-tight line-clamp-2 w-full">
                  {item.name}
                </span>

                {/* Price */}
                <span className="text-sm font-bold text-blue-400 mt-1">
                  ${item.basePrice.toFixed(2)}
                </span>

                {/* 86'd overlay */}
                {item.status === 'OUT_OF_STOCK' && (
                  <div className="absolute inset-0 bg-slate-900/70 rounded-2xl flex items-center justify-center">
                    <span className="text-red-400 font-black text-sm rotate-[-15deg] border-2 border-red-400 px-2 py-0.5 rounded">
                      86'd
                    </span>
                  </div>
                )}

                {/* Prep time */}
                {item.prepTime > 0 && (
                  <span className="text-xs text-slate-500 mt-0.5">{item.prepTime}m</span>
                )}
              </motion.button>
            ))}
          </div>
        </AnimatePresence>

        {displayItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <span className="text-4xl mb-3">ð</span>
            <p>{search ? 'No items match your search' : 'No items in this category'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
