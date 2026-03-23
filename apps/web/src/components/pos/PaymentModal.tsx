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

import api from '@/lib/api';
import { useAuthStore, useOrderStore } from '@/store';
import toast from 'react-hot-toast';

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
  const capturedTips = capturedPayments.reduce(
    (sum: number, payment: any) => sum + Number(payment.tipAmount || 0),
    0,
  );
  const capturedTendered = capturedPayments.reduce(
    (sum: number, payment: any) => sum + Number(payment.amount || 0),
    0,
  );
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

    const entries = Array.from(grouped.entries()).map(([key, value]) => ({
      key,
      ...value,
    }));

    if (!entries.length || subtotalValue <= 0) {
      return [];
    }

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
    if (splitMode === 'SEAT') {
      return Math.min(baseRemaining, Number(selectedSeat?.baseAmount || 0));
    }

    if (splitMode === 'AMOUNT') {
      return Math.min(baseRemaining, Number(customAmount || 0));
    }

    return baseRemaining;
  }, [baseRemaining, customAmount, selectedSeat?.baseAmount, splitMode]);

  const tipAmount = customTip
    ? Number(customTip) || 0
    : tipPercent !== null
      ? roundCurrency(selectedBaseAmount * (tipPercent / 100))
      : 0;

  const finalTotal = roundCurrency(selectedBaseAmount + tipAmount);
  const cashChange =
    method === 'CASH' && cashReceived ? roundCurrency(Number(cashReceived) - finalTotal) : 0;

  const paymentMutation = useMutation({
    mutationFn: (payload: any) => api.processPayment(payload),
    onSuccess: async (data) => {
      if (data.data.order) {
        setOrder(data.data.order);
      }

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
      toast.success(
        `Partial payment saved. $${data.data.remaining.toFixed(2)} still due.`,
      );
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
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="card mx-4 flex w-full max-w-sm flex-col items-center p-10 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
          >
            <CheckCircleIcon className="mb-4 h-20 w-20 text-emerald-400" />
          </motion.div>
          <h2 className="mb-2 text-2xl font-bold text-slate-100">Payment Complete</h2>
          <p className="mb-4 text-sm text-slate-400">Tendered: ${finalTotal.toFixed(2)}</p>
          {changeAmount > 0 && (
            <div className="mb-4 rounded-xl border border-emerald-600/50 bg-emerald-900/40 px-6 py-3">
              <p className="text-xl font-bold text-emerald-300">
                Change: ${changeAmount.toFixed(2)}
              </p>
            </div>
          )}
          <p className="text-xs text-slate-500">Closing order...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="card flex max-h-[90vh] w-full max-w-lg flex-col shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-700 p-5">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Checkout</h2>
            <p className="text-sm text-slate-400">Order #{orderId.slice(-6).toUpperCase()}</p>
          </div>
          <button onClick={onClose} className="touch-target rounded-xl text-slate-400 hover:text-slate-200">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {isLoading ? (
            <div className="space-y-3">
              <div className="h-14 animate-pulse rounded-2xl bg-slate-800" />
              <div className="h-32 animate-pulse rounded-2xl bg-slate-800" />
              <div className="h-24 animate-pulse rounded-2xl bg-slate-800" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 rounded-2xl border border-slate-700 bg-slate-900/60 p-4 text-center">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Paid</p>
                  <p className="mt-1 text-lg font-bold text-emerald-300">
                    ${capturedTendered.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Base Due</p>
                  <p className="mt-1 text-lg font-bold text-slate-100">
                    ${baseRemaining.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Tips</p>
                  <p className="mt-1 text-lg font-bold text-amber-300">
                    ${capturedTips.toFixed(2)}
                  </p>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="label">Split Check</label>
                  {!canSplitChecks && (
                    <span className="text-xs font-medium text-slate-500">Manager/Admin only</span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'FULL', label: 'Full Check' },
                    { id: 'SEAT', label: 'By Seat' },
                    { id: 'AMOUNT', label: 'By Amount' },
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => {
                        if (option.id !== 'FULL' && !canSplitChecks) return;
                        setSplitMode(option.id as SplitMode);
                      }}
                      className={clsx(
                        'touch-target rounded-2xl border text-sm font-medium transition-all',
                        splitMode === option.id
                          ? 'border-blue-500 bg-blue-600 text-white'
                          : 'border-slate-600 bg-slate-700 text-slate-300',
                        option.id !== 'FULL' && !canSplitChecks && 'cursor-not-allowed opacity-50',
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {canSplitChecks && splitMode === 'SEAT' && (
                <div>
                  <label className="label">Seat Selection</label>
                  {seatSplits.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-700 px-4 py-3 text-sm text-slate-500">
                      No seat assignments are set on this order yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {seatSplits.map((seat) => (
                        <button
                          key={seat.key}
                          onClick={() => setSelectedSeatKey(seat.key)}
                          className={clsx(
                            'touch-target rounded-2xl border px-4 text-left transition-all',
                            (selectedSeatKey || seatSplits[0]?.key) === seat.key
                              ? 'border-blue-500 bg-blue-600 text-white'
                              : 'border-slate-600 bg-slate-700 text-slate-300',
                          )}
                        >
                          <div className="text-sm font-semibold">{seat.label}</div>
                          <div className="text-xs opacity-80">
                            {seat.count} item{seat.count === 1 ? '' : 's'} · ${seat.baseAmount.toFixed(2)}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {canSplitChecks && splitMode === 'AMOUNT' && (
                <div>
                  <label className="label">Amount to Charge Before Tip</label>
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(event) => setCustomAmount(event.target.value)}
                    placeholder={baseRemaining.toFixed(2)}
                    className="input w-full text-lg font-bold"
                    step="0.01"
                    min="0"
                    max={baseRemaining}
                  />
                </div>
              )}

              <div>
                <label className="label">Payment Method</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {METHODS.map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      onClick={() => setMethod(id)}
                      className={clsx(
                        'touch-target flex flex-col items-center gap-1.5 rounded-2xl border py-3 text-xs font-medium transition-all',
                        method === id
                          ? 'border-blue-500 bg-blue-600 text-white'
                          : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-blue-500',
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {method === 'GIFT_CARD' && (
                <div>
                  <label className="label">Gift Card Code</label>
                  <input
                    type="text"
                    value={giftCardCode}
                    onChange={(event) => setGiftCardCode(event.target.value.toUpperCase())}
                    placeholder="GIFT-0001"
                    className="input w-full font-mono"
                  />
                </div>
              )}

              {method === 'CASH' && (
                <div>
                  <label className="label">Cash Received</label>
                  <input
                    type="number"
                    value={cashReceived}
                    onChange={(event) => setCashReceived(event.target.value)}
                    placeholder={finalTotal.toFixed(2)}
                    className="input w-full text-lg font-bold"
                    step="0.01"
                  />
                  {cashChange > 0 && (
                    <p className="mt-2 text-center text-lg font-bold text-emerald-400">
                      Change: ${cashChange.toFixed(2)}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="label">Tip</label>
                <div className="grid grid-cols-5 gap-1.5">
                  <button
                    onClick={() => {
                      setTipPercent(null);
                      setCustomTip('');
                    }}
                    className={clsx(
                      'touch-target rounded-2xl border text-xs font-medium transition-all',
                      tipPercent === null && !customTip
                        ? 'border-blue-500 bg-blue-600 text-white'
                        : 'border-slate-600 bg-slate-700 text-slate-300',
                    )}
                  >
                    No Tip
                  </button>
                  {TIP_PRESETS.map((percent) => (
                    <button
                      key={percent}
                      onClick={() => {
                        setTipPercent(percent);
                        setCustomTip('');
                      }}
                      className={clsx(
                        'touch-target rounded-2xl border text-xs font-medium transition-all',
                        tipPercent === percent && !customTip
                          ? 'border-blue-500 bg-blue-600 text-white'
                          : 'border-slate-600 bg-slate-700 text-slate-300',
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
                  placeholder="Custom tip amount"
                  className="input mt-2 w-full text-sm"
                  step="0.01"
                />
              </div>
            </>
          )}
        </div>

        <div className="space-y-3 border-t border-slate-700 p-5">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-slate-400">
              <span>Charge Base</span>
              <span>${selectedBaseAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Tip</span>
              <span>${tipAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-700 pt-2 text-lg font-bold text-slate-100">
              <span>Total to Tender</span>
              <span>${finalTotal.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={handlePay}
            disabled={
              paymentMutation.isPending ||
              finalTotal <= 0 ||
              (method === 'GIFT_CARD' && !giftCardCode) ||
              (splitMode === 'SEAT' && seatSplits.length === 0)
            }
            className="touch-target btn-success w-full text-lg font-bold"
          >
            {paymentMutation.isPending ? 'Processing...' : `Charge $${finalTotal.toFixed(2)}`}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
