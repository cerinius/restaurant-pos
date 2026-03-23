
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { PlusIcon, PencilIcon, TrashIcon, EyeSlashIcon, EyeIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { MenuItemForm } from '@/components/admin/MenuItemForm';
import { CategoryForm } from '@/components/admin/CategoryForm';
import { LoadingNotice, SkeletonBlock } from '@/components/ui/LoadingState';

const MENU_CATEGORIES_QUERY_KEY = ['categories-admin-with-items'];

function MenuPageSkeleton() {
  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex w-52 shrink-0 flex-col border-r border-slate-700 bg-slate-900">
        <div className="border-b border-slate-700 px-3 py-3">
          <SkeletonBlock className="h-5 w-24" />
        </div>
        <div className="space-y-2 px-2 py-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-11 w-full" />
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="border-b border-slate-700 bg-slate-950/50 px-6 py-4">
          <SkeletonBlock className="h-7 w-52" />
          <SkeletonBlock className="mt-2 h-4 w-20" />
        </div>
        <div className="space-y-4 p-6">
          <LoadingNotice
            title="Loading menu workspace"
            description="We are pulling categories, items, and modifier groups now."
          />
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="card flex items-center gap-4 px-4 py-3">
              <SkeletonBlock className="h-12 w-12 shrink-0" />
              <div className="flex-1">
                <SkeletonBlock className="h-5 w-48" />
                <SkeletonBlock className="mt-2 h-4 w-72" />
              </div>
              <div className="w-20">
                <SkeletonBlock className="h-5 w-full" />
                <SkeletonBlock className="mt-2 h-4 w-14" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MenuAdminPage() {
  const qc = useQueryClient();
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [editingItem, setEditingItem]     = useState<any>(null);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [showItemForm, setShowItemForm]   = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);

  const { data: catData, isLoading: categoriesLoading } = useQuery({ queryKey: MENU_CATEGORIES_QUERY_KEY, queryFn: () => api.getCategories(true) });
  const { data: modsData, isLoading: modifierGroupsLoading } = useQuery({ queryKey: ['modifier-groups'],  queryFn: () => api.getModifierGroups() });

  const categories: any[] = catData?.data || [];
  const modGroups: any[]  = modsData?.data || [];

  const activeCategory = activeCategoryId
    ? categories.find((c) => c.id === activeCategoryId)
    : categories[0];

  if ((categoriesLoading || modifierGroupsLoading) && categories.length === 0) {
    return <MenuPageSkeleton />;
  }

  const deleteCatMutation = useMutation({
    mutationFn: (id: string) => api.deleteCategory(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: MENU_CATEGORIES_QUERY_KEY }); toast.success('Category deleted'); },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Cannot delete'),
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id: string) => api.deleteMenuItem(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: MENU_CATEGORIES_QUERY_KEY }); toast.success('Item deleted'); },
  });

  const toggleItemMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      status === 'OUT_OF_STOCK' ? api.eightySixItem(id, true) : api.eightySixItem(id, false),
    onSuccess: () => qc.invalidateQueries({ queryKey: MENU_CATEGORIES_QUERY_KEY }),
  });

  const eightySixMutation = useMutation({
    mutationFn: ({ id, restore }: { id: string; restore: boolean }) => api.eightySixItem(id, restore),
    onSuccess: () => { qc.invalidateQueries({ queryKey: MENU_CATEGORIES_QUERY_KEY }); toast.success('Item status updated'); },
  });

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Categories Sidebar */}
      <div className="w-52 bg-slate-900 border-r border-slate-700 flex flex-col shrink-0">
        <div className="flex items-center justify-between px-3 py-3 border-b border-slate-700">
          <span className="text-sm font-bold text-slate-200">Categories</span>
          <button
            onClick={() => { setEditingCategory(null); setShowCategoryForm(true); }}
            className="p-1 bg-blue-600 hover:bg-blue-500 rounded-lg transition-all"
          >
            <PlusIcon className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {categories.map((cat: any) => (
            <div
              key={cat.id}
              className={clsx(
                'group flex items-center justify-between px-2.5 py-2 rounded-xl cursor-pointer transition-all',
                (activeCategoryId || categories[0]?.id) === cat.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              )}
              onClick={() => setActiveCategoryId(cat.id)}
            >
              <div className="flex items-center gap-2 min-w-0">
                {cat.color && <div className="w-2 h-2 rounded-full shrink-0" style={{ background: cat.color }} />}
                <span className="text-sm font-medium truncate">{cat.name}</span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingCategory(cat); setShowCategoryForm(true); }}
                  className="p-0.5 hover:text-blue-300 transition-colors"
                >
                  <PencilIcon className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-950/50 shrink-0">
          <div>
            <h1 className="text-xl font-bold text-slate-100">
              {activeCategory?.name || 'Menu Items'}
            </h1>
            <p className="text-sm text-slate-400">
              {(activeCategory?.items || []).length} items
            </p>
          </div>
          <button
            onClick={() => { setEditingItem(null); setShowItemForm(true); }}
            className="btn-primary flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4" />
            Add Item
          </button>
        </div>

        {/* Items Table */}
        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-2">
            <AnimatePresence>
              {(activeCategory?.items || []).map((item: any) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={clsx(
                    'card flex items-center gap-4 px-4 py-3 group transition-all',
                    item.status === 'OUT_OF_STOCK' ? 'opacity-60' : '',
                    item.status === 'INACTIVE' ? 'opacity-30' : ''
                  )}
                >
                  {/* Image */}
                  <div className="w-12 h-12 bg-slate-700 rounded-xl flex items-center justify-center shrink-0 text-2xl overflow-hidden">
                    {item.image ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" /> : 'ð½ï¸'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-100 truncate">{item.name}</p>
                      {item.isPopular  && <span className="text-xs bg-amber-900/50 text-amber-300 px-1.5 py-0.5 rounded border border-amber-700/50">Popular</span>}
                      {item.isFeatured && <span className="text-xs bg-purple-900/50 text-purple-300 px-1.5 py-0.5 rounded border border-purple-700/50">Featured</span>}
                      {item.status === 'OUT_OF_STOCK' && <span className="text-xs bg-red-900/50 text-red-300 px-1.5 py-0.5 rounded border border-red-700/50 font-bold">86'd</span>}
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{item.description || 'â'}</p>
                    <div className="flex items-center gap-3 mt-1">
                      {(item.modifierGroups || []).map((mg: any) => (
                        <span key={mg.modifierGroupId} className="text-xs text-slate-500">
                          â¢ {mg.modifierGroup?.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-right shrink-0">
                    <p className="font-bold text-slate-100">${item.basePrice.toFixed(2)}</p>
                    <p className="text-xs text-slate-500">{item.prepTime}m prep</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => eightySixMutation.mutate({ id: item.id, restore: item.status === 'OUT_OF_STOCK' })}
                      className={clsx('p-1.5 rounded-lg transition-all',
                        item.status === 'OUT_OF_STOCK'
                          ? 'text-emerald-400 hover:bg-emerald-900/30'
                          : 'text-amber-400 hover:bg-amber-900/30'
                      )}
                      title={item.status === 'OUT_OF_STOCK' ? 'Restore item' : "86 item (out of stock)"}
                    >
                      {item.status === 'OUT_OF_STOCK' ? <EyeIcon className="w-4 h-4" /> : <EyeSlashIcon className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => { setEditingItem(item); setShowItemForm(true); }}
                      className="p-1.5 text-blue-400 hover:bg-blue-900/30 rounded-lg transition-all"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${item.name}"?`)) deleteItemMutation.mutate(item.id);
                      }}
                      className="p-1.5 text-red-400 hover:bg-red-900/30 rounded-lg transition-all"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {(activeCategory?.items || []).length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                <span className="text-4xl mb-3">ð½ï¸</span>
                <p>No items in this category yet</p>
                <button
                  onClick={() => { setEditingItem(null); setShowItemForm(true); }}
                  className="btn-primary mt-4"
                >
                  Add First Item
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Item Form Modal */}
      {showItemForm && (
        <MenuItemForm
          item={editingItem}
          categoryId={activeCategory?.id}
          categories={categories}
          modifierGroups={modGroups}
          onClose={() => { setShowItemForm(false); setEditingItem(null); }}
          onSaved={() => {
            setShowItemForm(false);
            setEditingItem(null);
            qc.invalidateQueries({ queryKey: MENU_CATEGORIES_QUERY_KEY });
          }}
        />
      )}

      {/* Category Form Modal */}
      {showCategoryForm && (
        <CategoryForm
          category={editingCategory}
          onClose={() => { setShowCategoryForm(false); setEditingCategory(null); }}
          onSaved={() => {
            setShowCategoryForm(false);
            setEditingCategory(null);
            qc.invalidateQueries({ queryKey: MENU_CATEGORIES_QUERY_KEY });
          }}
        />
      )}
    </div>
  );
}
