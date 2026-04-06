'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowsPointingOutIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
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
import toast from 'react-hot-toast';

import api from '@/lib/api';
import { useAuthStore, useOrderStore } from '@/store';

interface Props {
  onFire: (courseNumber?: number, priority?: string) => void;
  onPay: () => void;
  isFiring: boolean;
  mobile?: boolean;
  panelMode?: 'expanded' | 'collapsed' | 'hidden';
  onPanelModeChange?: (mode: 'expanded' | 'collapsed' | 'hidden') => void;
}

export function OrderPanel({
  onFire,
  onPay,
  isFiring,
  mobile = false,
  panelMode = 'expanded',
  onPanelModeChange,
}: Props) {
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
          'flex h-full flex-col items-center justify-center px-6 py-10 text-center',
          mobile ? 'rounded-t-3xl' : 'rounded-[30px]',
        )}
      >
        <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
          Check Summary
        </div>
        <h2 className="mt-5 text-2xl font-black text-slate-100">No active order</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
          Start by choosing a table, then this panel becomes the running ticket with totals and the fastest actions.
        </p>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'flex h-full flex-col bg-transparent',
        mobile ? 'rounded-t-3xl' : 'rounded-[30px]',
      )}
    >
      <div className="ops-toolbar px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="section-kicker">Active check</p>
            <h2 className="mt-1 truncate text-2xl font-black text-slate-100">
              {tableName ? `Table ${tableName}` : String(orderType || 'Order').replace('_', ' ')}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {activeItems.length} item{activeItems.length === 1 ? '' : 's'} on ticket
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onPanelModeChange && !mobile && (
              <>
                <button
                  type="button"
                  onClick={() => onPanelModeChange(panelMode === 'collapsed' ? 'expanded' : 'collapsed')}
                  className="touch-target inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
                  aria-label={panelMode === 'collapsed' ? 'Expand active check' : 'Collapse active check'}
                >
                  {panelMode === 'collapsed' ? (
                    <ChevronDoubleLeftIcon className="h-4 w-4" />
                  ) : (
                    <ChevronDoubleRightIcon className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onPanelModeChange('expanded')}
                  className={clsx(
                    'touch-target inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition',
                    panelMode === 'expanded'
                      ? 'border-cyan-300/30 bg-cyan-300 text-slate-950'
                      : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10',
                  )}
                  aria-label="Expand active check panel"
                >
                  <ArrowsPointingOutIcon className="h-4 w-4" />
                </button>
              </>
            )}

            <span className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-slate-200">
              #{orderId.slice(-6).toUpperCase()}
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="ops-stat">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Subtotal</p>
            <p className="mt-1 text-xl font-black text-slate-100">${subtotal.toFixed(2)}</p>
          </div>
          <div className="ops-stat">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Tax</p>
            <p className="mt-1 text-xl font-black text-slate-100">${taxTotal.toFixed(2)}</p>
          </div>
          <div className="ops-stat">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Total</p>
            <p className="mt-1 text-xl font-black text-cyan-300">${total.toFixed(2)}</p>
          </div>
        </div>

        {courses.length > 1 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCourseFilter(null)}
              className={clsx(
                'touch-target rounded-2xl px-4 py-2 text-sm font-bold transition-all',
                !courseFilter ? 'bg-cyan-300 text-slate-950' : 'border border-white/10 bg-white/5 text-slate-300',
              )}
            >
              All Courses
            </button>
            {courses.map((course) => (
              <button
                key={course}
                type="button"
                onClick={() => setCourseFilter(course === courseFilter ? null : course)}
                className={clsx(
                  'touch-target rounded-2xl px-4 py-2 text-sm font-bold transition-all',
                  courseFilter === course
                    ? 'bg-cyan-300 text-slate-950'
                    : 'border border-white/10 bg-white/5 text-slate-300',
                )}
              >
                Course {course}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <AnimatePresence initial={false}>
          {displayItems.map((item: any) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              className={clsx(
                'mb-3 rounded-[24px] border border-white/10 bg-white/[0.04] p-4 transition-all',
                item.isFired && 'opacity-85',
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex shrink-0 flex-col items-center gap-2">
                  {!item.isFired && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        updateItemMutation.mutate({ itemId: item.id, quantity: item.quantity + 1 });
                      }}
                      className="touch-target inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-100 transition hover:bg-white/10"
                    >
                      <PlusIcon className="h-5 w-5" />
                    </button>
                  )}
                  <span className="w-10 text-center text-xl font-black text-slate-100">{item.quantity}</span>
                  {!item.isFired && item.quantity > 1 && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        updateItemMutation.mutate({ itemId: item.id, quantity: item.quantity - 1 });
                      }}
                      className="touch-target inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-100 transition hover:bg-white/10"
                    >
                      <MinusIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold text-slate-100">{item.menuItemName}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {item.seatNumber ? `Seat ${item.seatNumber}` : 'No seat'} · Course {item.courseNumber || 1}
                      </p>
                    </div>
                    <span className="shrink-0 text-lg font-black text-slate-100">${Number(item.totalPrice || 0).toFixed(2)}</span>
                  </div>

                  {Array.isArray(item.modifiers) && item.modifiers.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.modifiers.map((modifier: any) => (
                        <span
                          key={`${item.id}-${modifier.modifierId || modifier.modifierName}`}
                          className="rounded-full border border-white/10 bg-slate-950/45 px-2.5 py-1 text-xs font-medium text-slate-300"
                        >
                          {modifier.modifierName}
                        </span>
                      ))}
                    </div>
                  )}

                  {item.notes && (
                    <div className="mt-3 rounded-2xl border border-amber-300/15 bg-amber-400/10 px-3 py-2.5">
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-200/80">Note</p>
                      <p className="mt-1 text-sm font-medium leading-6 text-amber-50">{item.notes}</p>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setExpandedItemId(expandedItemId === item.id ? null : item.id)}
                      className="touch-target rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-300 transition hover:bg-white/10"
                    >
                      Options
                    </button>
                    {item.isFired && (
                      <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-100">
                        Fired
                      </span>
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
                  className="touch-target inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-transparent text-slate-500 transition hover:border-red-300/20 hover:bg-red-500/10 hover:text-red-300"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>

              {expandedItemId === item.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-4 border-t border-white/10 pt-4"
                >
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3].map((course) => (
                      <button
                        key={course}
                        type="button"
                        onClick={() => updateItemMutation.mutate({ itemId: item.id, courseNumber: course })}
                        className={clsx(
                          'touch-target rounded-2xl px-3 py-2 text-sm font-bold transition-all',
                          item.courseNumber === course
                            ? 'bg-cyan-300 text-slate-950'
                            : 'border border-white/10 bg-white/5 text-slate-300',
                        )}
                      >
                        Course {course}
                      </button>
                    ))}
                    {[1, 2, 3, 4].map((seat) => (
                      <button
                        key={seat}
                        type="button"
                        onClick={() => updateItemMutation.mutate({ itemId: item.id, seatNumber: seat })}
                        className={clsx(
                          'touch-target rounded-2xl px-3 py-2 text-sm font-bold transition-all',
                          item.seatNumber === seat
                            ? 'bg-fuchsia-500 text-white'
                            : 'border border-white/10 bg-white/5 text-slate-300',
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
          <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] text-center text-slate-400">
            <p className="text-lg font-bold text-slate-200">No items added yet</p>
            <p className="mt-2 text-sm text-slate-500">Use the menu to build the check, then fire when ready.</p>
          </div>
        )}
      </div>

      <div className="border-t border-white/10 bg-slate-950/45 p-4">
        <button
          type="button"
          onClick={() => setShowDiscounts((current) => !current)}
          className="touch-target mb-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 bg-white/[0.03] py-3 text-sm font-bold text-slate-300 transition hover:bg-white/[0.06]"
        >
          <TagIcon className="h-5 w-5" />
          Apply Discount
          <ChevronDownIcon className={clsx('h-5 w-5 transition-transform', showDiscounts && 'rotate-180')} />
        </button>

        {showDiscounts && <DiscountPicker onApply={(payload) => addDiscountMutation.mutate(payload)} />}

        <div className="mt-4 space-y-2 text-base">
          <div className="flex justify-between font-medium text-slate-300">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          {discountTotal > 0 && (
            <div className="flex justify-between font-medium text-emerald-300">
              <span>Discount</span>
              <span>-${discountTotal.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-medium text-slate-300">
            <span>Tax</span>
            <span>${taxTotal.toFixed(2)}</span>
          </div>
          {tipTotal > 0 && (
            <div className="flex justify-between font-medium text-slate-300">
              <span>Tip</span>
              <span>${tipTotal.toFixed(2)}</span>
            </div>
          )}
        </div>

        <div className="mt-4 grid gap-3">
          <AnimatePresence mode="wait">
            {fireConfirm ? (
              <motion.div
                key="fire-confirm"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="rounded-[24px] border border-amber-300/20 bg-amber-400/10 p-4"
              >
                <p className="text-center text-sm font-bold text-amber-100">
                  Send all unfired items to the kitchen now?
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFireConfirm(false)}
                    className="touch-target rounded-2xl border border-white/10 bg-white/5 py-3 text-sm font-bold text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFireConfirm(false);
                      onFire();
                    }}
                    disabled={isFiring}
                    className="touch-target flex items-center justify-center gap-2 rounded-2xl bg-orange-500 py-3 text-sm font-black text-white disabled:opacity-60"
                  >
                    <FireIcon className="h-5 w-5" />
                    {isFiring ? 'Sending...' : 'Fire Now'}
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.button
                key="fire-idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                type="button"
                onClick={() => setFireConfirm(true)}
                disabled={isFiring || activeItems.length === 0}
                className="touch-target flex w-full items-center justify-center gap-2 rounded-2xl border border-orange-300/25 bg-orange-500/12 py-4 text-base font-black text-orange-200 transition hover:bg-orange-500/18 disabled:opacity-50"
              >
                <FireIcon className="h-6 w-6" />
                Fire to Kitchen
              </motion.button>
            )}
          </AnimatePresence>

          <button
            type="button"
            onClick={onPay}
            disabled={activeItems.length === 0 || total <= 0}
            className="touch-target flex w-full items-center justify-center gap-3 rounded-2xl bg-emerald-400 py-4 text-lg font-black text-slate-950 transition hover:bg-emerald-300 disabled:opacity-50"
          >
            <CreditCardIcon className="h-6 w-6" />
            Pay ${total.toFixed(2)}
          </button>
        </div>
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
    <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04]">
      {discounts.map((discount: any) => (
        <button
          key={discount.id}
          type="button"
          onClick={() => onApply({ discountId: discount.id })}
          className="touch-target flex w-full items-center justify-between border-b border-white/10 px-4 py-3 text-left transition hover:bg-white/[0.05] last:border-b-0"
        >
          <span className="text-sm font-semibold text-slate-200">{discount.name}</span>
          <span className="text-sm font-black text-emerald-300">
            {discount.type === 'FLAT'
              ? `-$${discount.value}`
              : discount.type === 'COMP'
                ? 'COMP'
                : `-${discount.value}%`}
          </span>
        </button>
      ))}
      {discounts.length === 0 && (
        <p className="py-4 text-center text-sm text-slate-500">No discounts configured</p>
      )}
    </div>
  );
}
