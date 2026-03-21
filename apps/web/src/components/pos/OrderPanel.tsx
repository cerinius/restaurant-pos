
'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOrderStore, useAuthStore } from '@/store';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useState } from 'react';
import {
  FireIcon,
  CreditCardIcon,
  TrashIcon,
  PlusIcon,
  MinusIcon,
  TagIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

interface Props {
  onFire: (courseNumber?: number, priority?: string) => void;
  onPay: () => void;
  isFiring: boolean;
}

export function OrderPanel({ onFire, onPay, isFiring }: Props) {
  const { user } = useAuthStore();
  const { orderId, items, subtotal, taxTotal, discountTotal, tipTotal, total, tableName, orderType, setOrder } = useOrderStore();
  const queryClient = useQueryClient();
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [showDiscounts, setShowDiscounts] = useState(false);
  const [courseFilter, setCourseFilter] = useState<number | null>(null);

  const voidItemMutation = useMutation({
    mutationFn: ({ itemId, reason }: { itemId: string; reason?: string }) =>
      api.voidOrderItem(orderId!, itemId, reason),
    onSuccess: (data) => {
      setOrder(data.data);
      toast.success('Item removed');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to remove item'),
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, ...payload }: any) =>
      api.updateOrderItem(orderId!, itemId, payload),
    onSuccess: (data) => setOrder(data.data),
  });

  const addDiscountMutation = useMutation({
    mutationFn: (payload: any) => api.addDiscount(orderId!, payload),
    onSuccess: (data) => {
      setOrder(data.data);
      setShowDiscounts(false);
      toast.success('Discount applied');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to apply discount'),
  });

  const { data: discountsData } = useDiscountsQuery();

const activeItems = items.filter((i: any) => !i.isVoided);

const courses = Array.from(
  new Set(activeItems.map((i: any) => i.courseNumber || 1))
).sort((a, b) => a - b);

const displayItems = courseFilter
  ? activeItems.filter((i: any) => (i.courseNumber || 1) === courseFilter)
  : activeItems;

  if (!orderId) {
    return (
      <div className="w-72 xl:w-80 bg-slate-900 border-l border-slate-700 flex flex-col items-center justify-center text-slate-500 shrink-0">
        <span className="text-4xl mb-3">ð</span>
        <p className="text-sm font-medium">No active order</p>
        <p className="text-xs mt-1 text-slate-600">Select a table to start</p>
      </div>
    );
  }

  return (
    <div className="w-72 xl:w-80 bg-slate-900 border-l border-slate-700 flex flex-col shrink-0">
      {/* Order Header */}
      <div className="px-4 py-3 border-b border-slate-700 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-100 text-sm">
              {tableName ? `Table ${tableName}` : orderType.replace('_', ' ')}
            </h2>
            <p className="text-xs text-slate-500">{activeItems.length} item{activeItems.length !== 1 ? 's' : ''}</p>
          </div>
          <span className="text-xs px-2 py-1 bg-blue-900/50 text-blue-300 rounded-lg font-medium border border-blue-700/50">
            #{orderId.slice(-6).toUpperCase()}
          </span>
        </div>

        {/* Course tabs */}
        {courses.length > 1 && (
          <div className="flex gap-1 mt-2">
            <button
              onClick={() => setCourseFilter(null)}
              className={clsx('px-2 py-0.5 rounded-lg text-xs font-medium transition-all',
                !courseFilter ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              )}
            >All</button>
            {courses.map((c) => (
              <button
                key={c}
                onClick={() => setCourseFilter(c === courseFilter ? null : c)}
                className={clsx('px-2 py-0.5 rounded-lg text-xs font-medium transition-all',
                  courseFilter === c ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                )}
              >
                Course {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence>
          {displayItems.map((item: any) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20, height: 0 }}
              className={clsx(
                'border-b border-slate-700/50 transition-all',
                item.isFired ? 'opacity-70' : ''
              )}
            >
              <div
                className="flex items-start gap-2 px-3 py-2.5 cursor-pointer hover:bg-slate-800/50"
                onClick={() => setExpandedItemId(expandedItemId === item.id ? null : item.id)}
              >
                {/* Qty controls */}
                <div className="flex flex-col items-center gap-0.5 shrink-0">
                  {!item.isFired && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateItemMutation.mutate({ itemId: item.id, quantity: item.quantity + 1 });
                      }}
                      className="w-5 h-5 bg-slate-700 rounded flex items-center justify-center hover:bg-slate-600 transition-all"
                    >
                      <PlusIcon className="w-3 h-3" />
                    </button>
                  )}
                  <span className="text-sm font-bold text-slate-200 w-5 text-center">{item.quantity}</span>
                  {!item.isFired && item.quantity > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateItemMutation.mutate({ itemId: item.id, quantity: item.quantity - 1 });
                      }}
                      className="w-5 h-5 bg-slate-700 rounded flex items-center justify-center hover:bg-slate-600 transition-all"
                    >
                      <MinusIcon className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Item info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-xs font-semibold text-slate-200 leading-tight truncate">
                      {item.menuItemName}
                    </p>
                    <span className="text-xs font-bold text-slate-300 shrink-0">
                      ${item.totalPrice.toFixed(2)}
                    </span>
                  </div>

                  {/* Modifiers */}
                  {Array.isArray(item.modifiers) && item.modifiers.length > 0 && (
                    <p className="text-xs text-slate-500 mt-0.5 leading-tight">
                      {item.modifiers.map((m: any) => m.modifierName).join(', ')}
                    </p>
                  )}

                  {/* Notes */}
                  {item.notes && (
                    <p className="text-xs text-amber-400 mt-0.5 italic">ð {item.notes}</p>
                  )}

                  {/* Status badges */}
                  <div className="flex items-center gap-1 mt-0.5">
                    {item.isFired && (
                      <span className="text-xs px-1 py-0.5 bg-orange-900/50 text-orange-300 rounded border border-orange-700/30 font-medium">
                        ð¥ Fired
                      </span>
                    )}
                    {item.status === 'READY' && (
                      <span className="text-xs px-1 py-0.5 bg-emerald-900/50 text-emerald-300 rounded border border-emerald-700/30 font-medium">
                        â Ready
                      </span>
                    )}
                    {item.seatNumber && (
                      <span className="text-xs text-slate-500">Seat {item.seatNumber}</span>
                    )}
                  </div>
                </div>

                {/* Remove button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    voidItemMutation.mutate({ itemId: item.id });
                  }}
                  disabled={voidItemMutation.isPending}
                  className="p-1 text-slate-600 hover:text-red-400 transition-colors shrink-0"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Expanded item actions */}
              {expandedItemId === item.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-3 pb-2 bg-slate-800/50"
                >
                  <div className="flex gap-1 flex-wrap">
                    {[1, 2, 3].map((course) => (
                      <button
                        key={course}
                        onClick={() => updateItemMutation.mutate({ itemId: item.id, courseNumber: course })}
                        className={clsx(
                          'px-2 py-0.5 rounded-lg text-xs font-medium transition-all',
                          item.courseNumber === course
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-slate-400 hover:text-slate-200'
                        )}
                      >
                        Course {course}
                      </button>
                    ))}
                    {[1, 2, 3, 4].map((seat) => (
                      <button
                        key={seat}
                        onClick={() => updateItemMutation.mutate({ itemId: item.id, seatNumber: seat })}
                        className={clsx(
                          'px-2 py-0.5 rounded-lg text-xs font-medium transition-all',
                          item.seatNumber === seat
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-700 text-slate-400 hover:text-slate-200'
                        )}
                      >
                        Seat {seat}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {activeItems.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-slate-600">
            <p className="text-sm">No items added yet</p>
          </div>
        )}
      </div>

      {/* Totals */}
      <div className="border-t border-slate-700 px-4 py-3 space-y-1 shrink-0">
        <div className="flex justify-between text-xs text-slate-400">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        {discountTotal > 0 && (
          <div className="flex justify-between text-xs text-emerald-400">
            <span>Discount</span>
            <span>-${discountTotal.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-xs text-slate-400">
          <span>Tax</span>
          <span>${taxTotal.toFixed(2)}</span>
        </div>
        {tipTotal > 0 && (
          <div className="flex justify-between text-xs text-slate-400">
            <span>Tip</span>
            <span>${tipTotal.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-slate-100 text-base pt-1 border-t border-slate-700">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>

      {/* Discount button */}
      <div className="px-4 pb-2 shrink-0">
        <button
          onClick={() => setShowDiscounts(!showDiscounts)}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all border border-dashed border-slate-700"
        >
          <TagIcon className="w-3.5 h-3.5" />
          Apply Discount
          <ChevronDownIcon className={clsx('w-3 h-3 transition-transform', showDiscounts && 'rotate-180')} />
        </button>

        {showDiscounts && (
          <DiscountPicker onApply={(payload) => addDiscountMutation.mutate(payload)} />
        )}
      </div>

      {/* Action Buttons */}
      <div className="px-4 pb-4 space-y-2 shrink-0">
        {/* Fire button */}
        <button
          onClick={() => onFire()}
          disabled={isFiring || activeItems.length === 0}
          className="w-full h-12 bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FireIcon className="w-5 h-5" />
          {isFiring ? 'Sending...' : 'Fire to Kitchen'}
        </button>

        {/* Pay button */}
        <button
          onClick={onPay}
          disabled={activeItems.length === 0 || total <= 0}
          className="w-full h-12 btn-success flex items-center justify-center gap-2 text-base"
        >
          <CreditCardIcon className="w-5 h-5" />
          Pay ${total.toFixed(2)}
        </button>
      </div>
    </div>
  );
}

// Helper hook & sub-component
function useDiscountsQuery() {
  return useQuery({
    queryKey: ['discounts'],
    queryFn: () => api.getDiscounts(),
    staleTime: 1000 * 60 * 10,
  });
}

function DiscountPicker({ onApply }: { onApply: (payload: any) => void }) {
  const { data } = useDiscountsQuery();
  const discounts: any[] = data?.data || [];

  return (
    <div className="mt-2 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      {discounts.map((d: any) => (
        <button
          key={d.id}
          onClick={() => onApply({ discountId: d.id })}
          className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-700 transition-all text-left border-b border-slate-700/50 last:border-0"
        >
          <span className="text-xs font-medium text-slate-200">{d.name}</span>
          <span className="text-xs text-emerald-400 font-bold">
            {d.type === 'FLAT' ? `-$${d.value}` : d.type === 'COMP' ? 'COMP' : `-${d.value}%`}
          </span>
        </button>
      ))}
      {discounts.length === 0 && (
        <p className="text-xs text-slate-500 text-center py-3">No discounts configured</p>
      )}
    </div>
  );
}
