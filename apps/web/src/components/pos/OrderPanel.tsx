'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronDownIcon,
  CreditCardIcon,
  FireIcon,
  MinusIcon,
  PlusIcon,
  TagIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';

import api from '@/lib/api';
import { useAuthStore, useOrderStore } from '@/store';
import toast from 'react-hot-toast';

interface Props {
  onFire: (courseNumber?: number, priority?: string) => void;
  onPay: () => void;
  isFiring: boolean;
  mobile?: boolean;
}

export function OrderPanel({ onFire, onPay, isFiring, mobile = false }: Props) {
  const { user } = useAuthStore();
  const {
    orderId,
    items,
    subtotal,
    taxTotal,
    discountTotal,
    tipTotal,
    total,
    tableName,
    orderType,
    setOrder,
  } = useOrderStore();
  const queryClient = useQueryClient();
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [showDiscounts, setShowDiscounts] = useState(false);
  const [courseFilter, setCourseFilter] = useState<number | null>(null);
  const [fireConfirm, setFireConfirm] = useState(false);

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
    mutationFn: ({ itemId, ...payload }: any) => api.updateOrderItem(orderId!, itemId, payload),
    onSuccess: (data) => setOrder(data.data),
  });

  const addDiscountMutation = useMutation({
    mutationFn: (payload: any) => api.addDiscount(orderId!, payload),
    onSuccess: async (data) => {
      setOrder(data.data);
      setShowDiscounts(false);
      toast.success('Discount applied');
      await queryClient.invalidateQueries({ queryKey: ['order', orderId] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to apply discount'),
  });

  const { data: discountsData } = useDiscountsQuery();
  const activeItems = items.filter((item: any) => !item.isVoided);
  const courses = Array.from(new Set(activeItems.map((item: any) => item.courseNumber || 1))).sort(
    (left, right) => left - right,
  );
  const displayItems = courseFilter
    ? activeItems.filter((item: any) => (item.courseNumber || 1) === courseFilter)
    : activeItems;

  const handleVoidItem = (item: any) => {
    const requiresReason = item.isFired || ['OWNER', 'MANAGER'].includes(user?.role || '');
    let reason: string | undefined;

    if (requiresReason) {
      reason = window.prompt('Void reason', item.isFired ? 'Guest change after fire' : '')?.trim();

      if (!reason) {
        toast.error('A reason is required for audited voids');
        return;
      }
    }

    voidItemMutation.mutate({ itemId: item.id, reason });
  };

  if (!orderId) {
    return (
      <div
        className={clsx(
          'flex flex-col items-center justify-center bg-slate-900 text-center text-slate-500',
          mobile
            ? 'h-full rounded-t-3xl border-t border-slate-700 px-6 py-10 xl:rounded-none xl:border-l xl:border-t-0'
            : 'w-full border-l border-slate-700 px-6 py-10 xl:w-80',
        )}
      >
        <span className="mb-3 text-4xl">Check</span>
        <p className="text-sm font-medium text-slate-300">No active order</p>
        <p className="mt-1 text-xs text-slate-500">Select a table to start a ticket.</p>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'flex h-full flex-col bg-slate-900',
        mobile
          ? 'rounded-t-3xl border-t border-slate-700 shadow-2xl xl:rounded-none xl:border-l xl:border-t-0 xl:shadow-none'
          : 'w-full border-l border-slate-700 xl:w-80',
      )}
    >
      <div className="border-b border-slate-700 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-100">
              {tableName ? `Table ${tableName}` : orderType.replace('_', ' ')}
            </h2>
            <p className="text-xs text-slate-500">
              {activeItems.length} item{activeItems.length === 1 ? '' : 's'}
            </p>
          </div>
          <span className="rounded-xl border border-blue-700/50 bg-blue-900/50 px-2 py-1 text-xs font-medium text-blue-300">
            #{orderId.slice(-6).toUpperCase()}
          </span>
        </div>

        {courses.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => setCourseFilter(null)}
              className={clsx(
                'touch-target rounded-xl px-3 text-xs font-medium transition-all',
                !courseFilter ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400',
              )}
            >
              All Courses
            </button>
            {courses.map((course) => (
              <button
                key={course}
                onClick={() => setCourseFilter(course === courseFilter ? null : course)}
                className={clsx(
                  'touch-target rounded-xl px-3 text-xs font-medium transition-all',
                  courseFilter === course
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400',
                )}
              >
                Course {course}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence initial={false}>
          {displayItems.map((item: any) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12, height: 0 }}
              className={clsx(
                'border-b border-slate-700/50 transition-all',
                item.isFired && 'opacity-70',
              )}
            >
              <button
                type="button"
                onClick={() => setExpandedItemId(expandedItemId === item.id ? null : item.id)}
                className="flex w-full items-start gap-3 px-3 py-3 text-left hover:bg-slate-800/40"
              >
                <div className="flex shrink-0 flex-col items-center gap-1">
                  {!item.isFired && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        updateItemMutation.mutate({
                          itemId: item.id,
                          quantity: item.quantity + 1,
                        });
                      }}
                      className="touch-target inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700 text-slate-100 transition hover:bg-slate-600"
                    >
                      <PlusIcon className="h-4 w-4" />
                    </button>
                  )}
                  <span className="w-8 text-center text-sm font-bold text-slate-100">{item.quantity}</span>
                  {!item.isFired && item.quantity > 1 && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        updateItemMutation.mutate({
                          itemId: item.id,
                          quantity: item.quantity - 1,
                        });
                      }}
                      className="touch-target inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700 text-slate-100 transition hover:bg-slate-600"
                    >
                      <MinusIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-slate-100">{item.menuItemName}</p>
                    <span className="text-sm font-bold text-slate-200">${item.totalPrice.toFixed(2)}</span>
                  </div>

                  {Array.isArray(item.modifiers) && item.modifiers.length > 0 && (
                    <p className="mt-1 text-xs text-slate-500">
                      {item.modifiers.map((modifier: any) => modifier.modifierName).join(', ')}
                    </p>
                  )}

                  {item.notes && <p className="mt-1 text-xs italic text-amber-300">Note: {item.notes}</p>}

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {item.isFired && (
                      <span className="rounded-full bg-orange-900/50 px-2 py-0.5 text-[11px] font-medium text-orange-300">
                        Fired
                      </span>
                    )}
                    {item.status === 'READY' && (
                      <span className="rounded-full bg-emerald-900/50 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                        Ready
                      </span>
                    )}
                    {item.seatNumber && (
                      <span className="text-[11px] font-medium text-slate-500">Seat {item.seatNumber}</span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleVoidItem(item);
                  }}
                  disabled={voidItemMutation.isPending}
                  className="touch-target inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-500 transition hover:bg-red-600/10 hover:text-red-400"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </button>

              {expandedItemId === item.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-slate-800/50 px-3 pb-3"
                >
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3].map((course) => (
                      <button
                        key={course}
                        onClick={() =>
                          updateItemMutation.mutate({ itemId: item.id, courseNumber: course })
                        }
                        className={clsx(
                          'touch-target rounded-xl px-3 text-xs font-medium transition-all',
                          item.courseNumber === course
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-slate-300',
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
                          'touch-target rounded-xl px-3 text-xs font-medium transition-all',
                          item.seatNumber === seat
                            ? 'bg-violet-600 text-white'
                            : 'bg-slate-700 text-slate-300',
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
          <div className="flex h-40 flex-col items-center justify-center text-slate-500">
            <p className="text-sm font-medium">No items added yet</p>
            <p className="mt-1 text-xs text-slate-600">Tap menu items to build the check.</p>
          </div>
        )}
      </div>

      <div className="border-t border-slate-700 px-4 py-3">
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-slate-400">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          {discountTotal > 0 && (
            <div className="flex justify-between text-emerald-400">
              <span>Discount</span>
              <span>-${discountTotal.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-slate-400">
            <span>Tax</span>
            <span>${taxTotal.toFixed(2)}</span>
          </div>
          {tipTotal > 0 && (
            <div className="flex justify-between text-slate-400">
              <span>Tip</span>
              <span>${tipTotal.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-700 pt-2 text-base font-bold text-slate-100">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="px-4 pb-3">
        <button
          onClick={() => setShowDiscounts((current) => !current)}
          className="touch-target flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-700 px-3 text-xs font-medium text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
        >
          <TagIcon className="h-4 w-4" />
          Apply Discount
          <ChevronDownIcon
            className={clsx('h-4 w-4 transition-transform', showDiscounts && 'rotate-180')}
          />
        </button>

        {showDiscounts && <DiscountPicker onApply={(payload) => addDiscountMutation.mutate(payload)} />}
      </div>

      <div className="space-y-2 px-4 pb-4">
        {/* ── Fire button: 2-step confirm ────────────────── */}
        <AnimatePresence mode="wait">
          {fireConfirm ? (
            <motion.div
              key="fire-confirm"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="space-y-2"
            >
              <p className="text-center text-xs font-semibold text-amber-300">
                Confirm — send all unfired items to kitchen?
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setFireConfirm(false)}
                  className="touch-target rounded-2xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setFireConfirm(false); onFire(); }}
                  disabled={isFiring}
                  className="touch-target flex items-center justify-center gap-2 rounded-2xl bg-orange-500 py-3 text-sm font-bold text-white transition hover:bg-orange-400 disabled:opacity-50 fire-confirm-ring"
                >
                  <FireIcon className="h-4 w-4" />
                  {isFiring ? 'Sending…' : 'Fire Now'}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="fire-idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFireConfirm(true)}
              disabled={isFiring || activeItems.length === 0}
              className="touch-target flex w-full items-center justify-center gap-2 rounded-2xl border border-orange-400/30 bg-orange-500/15 px-4 py-3.5 text-sm font-bold text-orange-100 transition hover:bg-orange-500/25 disabled:opacity-50"
            >
              <FireIcon className="h-5 w-5" />
              Fire to Kitchen
            </motion.button>
          )}
        </AnimatePresence>

        <button
          onClick={onPay}
          disabled={activeItems.length === 0 || total <= 0}
          className="touch-target btn-success flex w-full items-center justify-center gap-2 rounded-2xl text-base"
        >
          <CreditCardIcon className="h-5 w-5" />
          Pay ${total.toFixed(2)}
        </button>
      </div>
    </div>
  );
}

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
    <div className="mt-2 overflow-hidden rounded-2xl border border-slate-700 bg-slate-800">
      {discounts.map((discount: any) => (
        <button
          key={discount.id}
          onClick={() => onApply({ discountId: discount.id })}
          className="touch-target flex w-full items-center justify-between border-b border-slate-700/50 px-3 text-left transition hover:bg-slate-700 last:border-0"
        >
          <span className="text-xs font-medium text-slate-200">{discount.name}</span>
          <span className="text-xs font-bold text-emerald-400">
            {discount.type === 'FLAT'
              ? `-$${discount.value}`
              : discount.type === 'COMP'
                ? 'COMP'
                : `-${discount.value}%`}
          </span>
        </button>
      ))}
      {discounts.length === 0 && (
        <p className="py-3 text-center text-xs text-slate-500">No discounts configured</p>
      )}
    </div>
  );
}
