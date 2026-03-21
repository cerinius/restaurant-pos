
'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { XMarkIcon, CreditCardIcon, BanknotesIcon, GiftIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useOrderStore } from '@/store';
import clsx from 'clsx';

interface Props {
  orderId: string;
  onClose: () => void;
  onPaid: () => void;
}

const TIP_PRESETS = [15, 18, 20, 25];
const METHODS = [
  { id: 'CASH',        label: 'Cash',       Icon: BanknotesIcon },
  { id: 'CREDIT_CARD', label: 'Credit',     Icon: CreditCardIcon },
  { id: 'DEBIT_CARD',  label: 'Debit',      Icon: CreditCardIcon },
  { id: 'GIFT_CARD',   label: 'Gift Card',  Icon: GiftIcon },
];

export function PaymentModal({ orderId, onClose, onPaid }: Props) {
  const { total, subtotal } = useOrderStore();
  const [method, setMethod] = useState('CREDIT_CARD');
  const [tipPercent, setTipPercent] = useState<number | null>(18);
  const [customTip, setCustomTip] = useState('');
  const [cashReceived, setCashReceived] = useState('');
  const [giftCardCode, setGiftCardCode] = useState('');
  const [splitCount, setSplitCount] = useState(1);
  const [paid, setPaid] = useState(false);
  const [changeAmount, setChangeAmount] = useState(0);

  const tipAmount = customTip
    ? parseFloat(customTip) || 0
    : tipPercent !== null
    ? subtotal * (tipPercent / 100)
    : 0;

  const finalTotal = total + tipAmount;
  const cashChange = method === 'CASH' && cashReceived
    ? parseFloat(cashReceived) - finalTotal
    : 0;

  const { data: orderData } = useQuery({
    queryKey: ['order-payment', orderId],
    queryFn: () => api.getOrder(orderId),
  });

  const paymentMutation = useMutation({
    mutationFn: (payload: any) => api.processPayment(payload),
    onSuccess: (data) => {
      if (data.data.isPaid) {
        setPaid(true);
        setChangeAmount(data.data.change || 0);
        setTimeout(() => onPaid(), 2000);
      } else {
        toast.success(`Partial payment: $${data.data.totalPaid.toFixed(2)} paid, $${data.data.remaining.toFixed(2)} remaining`);
      }
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Payment failed'),
  });

  const handlePay = () => {
    paymentMutation.mutate({
      orderId,
      method,
      amount: finalTotal,
      tipAmount,
      giftCardCode: method === 'GIFT_CARD' ? giftCardCode : undefined,
    });
  };

  if (paid) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="card p-10 flex flex-col items-center text-center max-w-sm w-full mx-4"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
          >
            <CheckCircleIcon className="w-20 h-20 text-emerald-400 mb-4" />
          </motion.div>
          <h2 className="text-2xl font-bold text-slate-100 mb-2">Payment Complete!</h2>
          <p className="text-slate-400 text-sm mb-4">Total: ${finalTotal.toFixed(2)}</p>
          {changeAmount > 0 && (
            <div className="bg-emerald-900/40 border border-emerald-600/50 rounded-xl px-6 py-3 mb-4">
              <p className="text-emerald-300 font-bold text-xl">Change: ${changeAmount.toFixed(2)}</p>
            </div>
          )}
          <p className="text-xs text-slate-500">Closing order...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="card w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Payment</h2>
            <p className="text-sm text-slate-400">Order #{orderId.slice(-6).toUpperCase()}</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Payment Method */}
          <div>
            <label className="label">Payment Method</label>
            <div className="grid grid-cols-4 gap-2">
              {METHODS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => setMethod(id)}
                  className={clsx(
                    'flex flex-col items-center gap-1.5 py-3 rounded-xl border font-medium text-xs transition-all',
                    method === id
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-blue-500'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Gift Card code input */}
          {method === 'GIFT_CARD' && (
            <div>
              <label className="label">Gift Card Code</label>
              <input
                type="text"
                value={giftCardCode}
                onChange={(e) => setGiftCardCode(e.target.value.toUpperCase())}
                placeholder="GIFT-0001"
                className="input w-full font-mono"
              />
            </div>
          )}

          {/* Cash received */}
          {method === 'CASH' && (
            <div>
              <label className="label">Cash Received</label>
              <input
                type="number"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                placeholder={finalTotal.toFixed(2)}
                className="input w-full text-lg font-bold"
                step="0.01"
              />
              {cashChange > 0 && (
                <p className="text-emerald-400 font-bold mt-2 text-center text-lg">
                  Change: ${cashChange.toFixed(2)}
                </p>
              )}
              {/* Quick cash amounts */}
              <div className="grid grid-cols-4 gap-1.5 mt-2">
                {[20, 50, 100, Math.ceil(finalTotal / 5) * 5].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setCashReceived(amt.toString())}
                    className="py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-medium text-slate-300 transition-all"
                  >
                    ${amt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tip */}
          <div>
            <label className="label">Tip</label>
            <div className="grid grid-cols-5 gap-1.5">
              <button
                onClick={() => { setTipPercent(null); setCustomTip(''); }}
                className={clsx('py-2 rounded-xl text-xs font-medium border transition-all',
                  tipPercent === null && !customTip
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-slate-700 border-slate-600 text-slate-300'
                )}
              >
                No Tip
              </button>
              {TIP_PRESETS.map((pct) => (
                <button
                  key={pct}
                  onClick={() => { setTipPercent(pct); setCustomTip(''); }}
                  className={clsx('py-2 rounded-xl text-xs font-medium border transition-all',
                    tipPercent === pct && !customTip
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-slate-700 border-slate-600 text-slate-300'
                  )}
                >
                  {pct}%
                </button>
              ))}
            </div>
            <input
              type="number"
              value={customTip}
              onChange={(e) => { setCustomTip(e.target.value); setTipPercent(null); }}
              placeholder="Custom tip amount"
              className="input w-full mt-2 text-sm"
              step="0.01"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-700 space-y-3 shrink-0">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal</span><span>${total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Tip ({tipPercent !== null && !customTip ? `${tipPercent}%` : 'custom'})</span>
              <span>${tipAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-100 font-bold text-lg border-t border-slate-700 pt-1">
              <span>Total</span><span>${finalTotal.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={handlePay}
            disabled={paymentMutation.isPending || (method === 'GIFT_CARD' && !giftCardCode)}
            className="btn-success w-full h-14 text-lg font-bold"
          >
            {paymentMutation.isPending ? 'Processing...' : `Charge $${finalTotal.toFixed(2)}`}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
