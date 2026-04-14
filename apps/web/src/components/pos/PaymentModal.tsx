'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  BanknotesIcon,
  CheckCircleIcon,
  CreditCardIcon,
  GiftIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';

import api from '@/lib/api';
import { useAuthStore, useOrderStore } from '@/store';

interface Props {
  orderId: string;
  onClose: () => void;
  onPaid: () => void;
}

type SplitMode = 'FULL' | 'SEAT' | 'AMOUNT';

const TIP_PRESETS = [15, 18, 20, 25];
const METHODS = [
  { id: 'CASH', label: 'Cash', Icon: BanknotesIcon },
  { id: 'CREDIT_CARD', label: 'Credit', Icon: CreditCardIcon },
  { id: 'DEBIT_CARD', label: 'Debit', Icon: CreditCardIcon },
  { id: 'GIFT_CARD', label: 'Gift Card', Icon: GiftIcon },
];

function roundCurrency(value: number) {
  return Number(value.toFixed(2));
}

export function PaymentModal({ orderId, onClose, onPaid }: Props) {
  const { user } = useAuthStore();
  const { total, subtotal, setOrder } = useOrderStore();
  const [method, setMethod] = useState('CREDIT_CARD');
  const [splitMode, setSplitMode] = useState<SplitMode>('FULL');
  const [selectedSeatKey, setSelectedSeatKey] = useState<string | null>(null);
  const [tipPercent, setTipPercent] = useState<number | null>(18);
  const [customTip, setCustomTip] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [cashReceived, setCashReceived] = useState('');
  const [giftCardCode, setGiftCardCode] = useState('');
  const [paid, setPaid] = useState(false);
  const [changeAmount, setChangeAmount] = useState(0);

  const { data: orderData, isLoading, refetch } = useQuery({
    queryKey: ['order-payment', orderId],
    queryFn: () => api.getOrder(orderId),
  });

  const order = orderData?.data;
  const capturedPayments = (order?.payments || []).filter((payment: any) => payment.status === 'CAPTURED');
  const capturedTips = capturedPayments.reduce((sum: number, payment: any) => sum + Number(payment.tipAmount || 0), 0);
  const capturedTendered = capturedPayments.reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0);
  const baseOrderTotal = Math.max(0, Number(order?.total ?? total) - capturedTips);
  const baseRemaining = Math.max(0, baseOrderTotal - (capturedTendered - capturedTips));
  const subtotalValue = Number(order?.subtotal ?? subtotal) || 0;

  const seatSplits = useMemo(() => {
    const activeItems = (order?.items || []).filter((item: any) => !item.isVoided);
    const grouped = new Map<string, { label: string; subtotal: number; count: number }>();

    activeItems.forEach((item: any) => {
      const key = item.seatNumber ? `seat-${item.seatNumber}` : 'seat-unassigned';
      const current = grouped.get(key) || {
        label: item.seatNumber ? `Seat ${item.seatNumber}` : 'Unassigned',
        subtotal: 0,
        count: 0,
      };

      current.subtotal += Number(item.totalPrice || 0);
      current.count += 1;
      grouped.set(key, current);
    });

    const entries = Array.from(grouped.entries()).map(([key, value]) => ({ key, ...value }));
    if (!entries.length || subtotalValue <= 0) return [];

    let allocated = 0;

    return entries.map((entry, index) => {
      const baseAmount =
        index === entries.length - 1
          ? roundCurrency(baseOrderTotal - allocated)
          : roundCurrency((entry.subtotal / subtotalValue) * baseOrderTotal);

      allocated += baseAmount;

      return {
        ...entry,
        baseAmount: Math.max(0, baseAmount),
      };
    });
  }, [baseOrderTotal, order?.items, subtotalValue]);

  const selectedSeat = seatSplits.find((seat) => seat.key === selectedSeatKey) || seatSplits[0] || null;
  const canSplitChecks = ['OWNER', 'MANAGER'].includes(String(user?.role || '').toUpperCase());

  const selectedBaseAmount = useMemo(() => {
    if (splitMode === 'SEAT') return Math.min(baseRemaining, Number(selectedSeat?.baseAmount || 0));
    if (splitMode === 'AMOUNT') return Math.min(baseRemaining, Number(customAmount || 0));
    return baseRemaining;
  }, [baseRemaining, customAmount, selectedSeat?.baseAmount, splitMode]);

  const tipAmount = customTip
    ? Number(customTip) || 0
    : tipPercent !== null
      ? roundCurrency(selectedBaseAmount * (tipPercent / 100))
      : 0;

  const finalTotal = roundCurrency(selectedBaseAmount + tipAmount);
  const cashChange = method === 'CASH' && cashReceived ? roundCurrency(Number(cashReceived) - finalTotal) : 0;

  const paymentMutation = useMutation({
    mutationFn: (payload: any) => api.processPayment(payload),
    onSuccess: async (data) => {
      if (data.data.order) setOrder(data.data.order);

      await refetch();

      if (data.data.isPaid) {
        setPaid(true);
        setChangeAmount(data.data.change || 0);
        setTimeout(() => onPaid(), 1500);
        return;
      }

      setCustomTip('');
      setCashReceived('');
      setCustomAmount('');
      toast.success(`Partial payment saved. $${data.data.remaining.toFixed(2)} still due.`);
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Payment failed'),
  });

  const handlePay = () => {
    if (selectedBaseAmount <= 0) {
      toast.error('Enter a valid amount to charge');
      return;
    }

    paymentMutation.mutate({
      orderId,
      method,
      amount: finalTotal,
      tipAmount,
      giftCardCode: method === 'GIFT_CARD' ? giftCardCode : undefined,
      splitMode,
      splitSeat: splitMode === 'SEAT' ? selectedSeat?.label : undefined,
      baseAmount: selectedBaseAmount,
    });
  };

  if (paid) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.84, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="card mx-4 flex w-full max-w-sm flex-col items-center p-10 text-center"
        >
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}>
            <CheckCircleIcon className="mb-4 h-20 w-20 text-emerald-400" />
          </motion.div>
          <h2 className="mb-2 text-2xl font-black text-slate-100">Payment Complete</h2>
          <p className="mb-4 text-sm text-slate-400">Tendered: ${finalTotal.toFixed(2)}</p>
          {changeAmount > 0 && (
            <div className="mb-4 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-6 py-3">
              <p className="text-xl font-black text-emerald-100">Change: ${changeAmount.toFixed(2)}</p>
            </div>
          )}
          <p className="text-xs text-slate-500">Closing order...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm md:items-center">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="card flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden"
      >
        <div className="ops-toolbar flex items-center justify-between gap-3 px-5 py-5">
          <div>
            <p className="section-kicker">Checkout</p>
            <h2 className="mt-1 text-2xl font-black text-white">Order #{orderId.slice(-6).toUpperCase()}</h2>
            <p className="mt-1 text-sm text-slate-400">Fast tender flow built for counter and table service.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="touch-target inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-h-0 overflow-y-auto px-5 py-5">
            {isLoading ? (
              <div className="space-y-3">
                <div className="h-14 animate-pulse rounded-2xl bg-slate-800" />
                <div className="h-32 animate-pulse rounded-2xl bg-slate-800" />
                <div className="h-24 animate-pulse rounded-2xl bg-slate-800" />
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-3 gap-3">
                  <div className="ops-stat">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Paid</p>
                    <p className="mt-1 text-2xl font-black text-emerald-100">${capturedTendered.toFixed(2)}</p>
                  </div>
                  <div className="ops-stat">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Due</p>
                    <p className="mt-1 text-2xl font-black text-white">${baseRemaining.toFixed(2)}</p>
                  </div>
                  <div className="ops-stat">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Tips</p>
                    <p className="mt-1 text-2xl font-black text-amber-100">${capturedTips.toFixed(2)}</p>
                  </div>
                </div>

                <section className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <label className="label mb-0">Split Check</label>
                    {!canSplitChecks && <span className="text-sm text-slate-500">Manager/Admin only</span>}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'FULL', label: 'Full' },
                      { id: 'SEAT', label: 'By Seat' },
                      { id: 'AMOUNT', label: 'Amount' },
                    ].map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          if (option.id !== 'FULL' && !canSplitChecks) return;
                          setSplitMode(option.id as SplitMode);
                        }}
                        className={clsx(
                          'touch-target rounded-2xl border px-3 py-3 text-sm font-bold transition-all',
                          splitMode === option.id
                            ? 'border-amber-300/30 bg-amber-300 text-slate-950'
                            : 'border-white/10 bg-white/[0.03] text-slate-200',
                          option.id !== 'FULL' && !canSplitChecks && 'cursor-not-allowed opacity-50',
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </section>

                {canSplitChecks && splitMode === 'SEAT' && (
                  <section className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4">
                    <label className="label">Seat Selection</label>
                    {seatSplits.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/10 px-4 py-4 text-sm text-slate-500">
                        No seat assignments on this order.
                      </div>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-2">
                        {seatSplits.map((seat) => (
                          <button
                            key={seat.key}
                            type="button"
                            onClick={() => setSelectedSeatKey(seat.key)}
                            className={clsx(
                              'touch-target rounded-2xl border p-4 text-left transition-all',
                              (selectedSeatKey || seatSplits[0]?.key) === seat.key
                                ? 'border-amber-300/30 bg-amber-300 text-slate-950'
                                : 'border-white/10 bg-white/[0.03] text-slate-100',
                            )}
                          >
                            <div className="text-base font-black">{seat.label}</div>
                            <div className="mt-1 text-sm opacity-80">
                              {seat.count} item{seat.count === 1 ? '' : 's'} · ${seat.baseAmount.toFixed(2)}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {canSplitChecks && splitMode === 'AMOUNT' && (
                  <section className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4">
                    <label className="label">Amount to Charge</label>
                    <input
                      type="number"
                      value={customAmount}
                      onChange={(event) => setCustomAmount(event.target.value)}
                      placeholder={baseRemaining.toFixed(2)}
                      className="input w-full rounded-2xl text-xl font-black"
                      step="0.01"
                      min="0"
                      max={baseRemaining}
                    />
                  </section>
                )}

                <section className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4">
                  <label className="label">Payment Method</label>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {METHODS.map(({ id, label, Icon }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setMethod(id)}
                        className={clsx(
                          'touch-target flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-2xl border text-sm font-bold transition-all',
                          method === id
                            ? 'border-amber-300/30 bg-amber-300 text-slate-950'
                            : 'border-white/10 bg-white/[0.03] text-slate-100',
                        )}
                      >
                        <Icon className="h-6 w-6" />
                        {label}
                      </button>
                    ))}
                  </div>
                </section>

                {method === 'GIFT_CARD' && (
                  <section className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4">
                    <label className="label">Gift Card Code</label>
                    <input
                      type="text"
                      value={giftCardCode}
                      onChange={(event) => setGiftCardCode(event.target.value.toUpperCase())}
                      placeholder="GIFT-XXXX-XXXX"
                      className="input w-full rounded-2xl font-mono text-lg"
                    />
                  </section>
                )}

                {method === 'CASH' && (
                  <section className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4">
                    <label className="label">Cash Received</label>
                    <input
                      type="number"
                      value={cashReceived}
                      onChange={(event) => setCashReceived(event.target.value)}
                      placeholder={finalTotal.toFixed(2)}
                      className="input w-full rounded-2xl text-xl font-black"
                      step="0.01"
                    />
                    {cashChange > 0 && (
                      <p className="mt-3 text-lg font-black text-emerald-100">Change: ${cashChange.toFixed(2)}</p>
                    )}
                  </section>
                )}

                <section className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4">
                  <label className="label">Tip</label>
                  <div className="grid grid-cols-5 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTipPercent(null);
                        setCustomTip('');
                      }}
                      className={clsx(
                        'touch-target rounded-2xl border py-2 text-sm font-bold transition-all',
                        tipPercent === null && !customTip
                          ? 'border-amber-300/30 bg-amber-300 text-slate-950'
                          : 'border-white/10 bg-white/[0.03] text-slate-200',
                      )}
                    >
                      None
                    </button>
                    {TIP_PRESETS.map((percent) => (
                      <button
                        key={percent}
                        type="button"
                        onClick={() => {
                          setTipPercent(percent);
                          setCustomTip('');
                        }}
                        className={clsx(
                          'touch-target rounded-2xl border py-2 text-sm font-bold transition-all',
                          tipPercent === percent && !customTip
                            ? 'border-amber-300/30 bg-amber-300 text-slate-950'
                            : 'border-white/10 bg-white/[0.03] text-slate-200',
                        )}
                      >
                        {percent}%
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    value={customTip}
                    onChange={(event) => {
                      setCustomTip(event.target.value);
                      setTipPercent(null);
                    }}
                    placeholder="Custom tip"
                    className="input mt-3 w-full rounded-2xl text-base"
                    step="0.01"
                  />
                </section>
              </div>
            )}
          </div>

          <aside className="border-t border-white/10 bg-slate-950/45 p-5 xl:border-l xl:border-t-0">
            <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Payment Summary</p>
              <div className="mt-4 space-y-3 text-base">
                <div className="flex justify-between font-medium text-slate-300">
                  <span>Base</span>
                  <span>${selectedBaseAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-medium text-slate-300">
                  <span>Tip</span>
                  <span>${tipAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-white/10 pt-3 text-2xl font-black text-white">
                  <span>Total</span>
                  <span>${finalTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePay}
              disabled={
                paymentMutation.isPending ||
                finalTotal <= 0 ||
                (method === 'GIFT_CARD' && !giftCardCode) ||
                (splitMode === 'SEAT' && seatSplits.length === 0)
              }
              className="touch-target mt-4 flex w-full items-center justify-center rounded-2xl bg-emerald-400 py-4 text-lg font-black text-slate-950 transition hover:bg-emerald-300 disabled:opacity-50"
            >
              {paymentMutation.isPending ? 'Processing...' : `Charge $${finalTotal.toFixed(2)}`}
            </button>
          </aside>
        </div>
      </motion.div>
    </div>
  );
}
