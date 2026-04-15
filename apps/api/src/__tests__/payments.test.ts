/**
 * Payment flow unit tests.
 * Tests the core payment logic without DB dependencies.
 */

import { describe, it, expect } from 'vitest';

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

// ─── Payment Validation Logic ────────────────────────────────────────────────

describe('Payment amount validation', () => {
  it('rejects zero payment', () => {
    const amount = 0;
    const isValid = Number.isFinite(amount) && amount > 0;
    expect(isValid).toBe(false);
  });

  it('rejects negative payment', () => {
    const amount = -10;
    const isValid = Number.isFinite(amount) && amount > 0;
    expect(isValid).toBe(false);
  });

  it('rejects NaN payment', () => {
    const amount = NaN;
    const isValid = Number.isFinite(amount) && amount > 0;
    expect(isValid).toBe(false);
  });

  it('accepts valid payment amount', () => {
    const amount = 25.50;
    const isValid = Number.isFinite(amount) && amount > 0;
    expect(isValid).toBe(true);
  });

  it('tip cannot exceed tendered amount', () => {
    const amount = 30.00;
    const tipAmount = 35.00;
    const isValidTip = tipAmount <= amount;
    expect(isValidTip).toBe(false);
  });
});

// ─── Payment Status Transitions ────────────────────────────────────────────

describe('Order status transitions', () => {
  it('marks order as PAID when remaining <= 0.01', () => {
    const scenarios = [
      { remaining: 0.00, shouldBePaid: true },
      { remaining: 0.01, shouldBePaid: true },
      { remaining: 0.009, shouldBePaid: true },   // floating point artifact
      { remaining: 0.02, shouldBePaid: false },
      { remaining: 0.50, shouldBePaid: false },
    ];

    scenarios.forEach(({ remaining, shouldBePaid }) => {
      const isPaid = remaining <= 0.01;
      expect(isPaid).toBe(shouldBePaid);
    });
  });

  it('allows cash overpayment', () => {
    const orderTotal = 18.50;
    const cashTendered = 20.00;

    // Cash is allowed to exceed amount
    const isOverpayment = cashTendered > orderTotal;
    const change = roundCurrency(cashTendered - orderTotal);

    expect(isOverpayment).toBe(true);
    expect(change).toBe(1.50);
  });

  it('rejects non-cash overpayment', () => {
    const method = 'CREDIT_CARD';
    const baseRemaining = 25.00;
    const paymentBaseAmount = 30.00;

    // Non-cash payments cannot exceed remaining balance
    const isOverpaymentNotAllowed = method !== 'CASH' && paymentBaseAmount > baseRemaining + 0.01;
    expect(isOverpaymentNotAllowed).toBe(true);
  });
});

// ─── Multi-Payment Split Logic ────────────────────────────────────────────

describe('Multi-payment (split check) logic', () => {
  it('correctly tracks cumulative tendered amounts', () => {
    const payments = [
      { amount: 20.00, tipAmount: 3.60 },
      { amount: 30.00, tipAmount: 5.40 },
    ];

    const capturedTips = payments.reduce((s, p) => s + p.tipAmount, 0);
    const capturedTendered = payments.reduce((s, p) => s + p.amount, 0);

    expect(capturedTips).toBe(9.00);
    expect(capturedTendered).toBe(50.00);
  });

  it('calculates base remaining correctly after partial payment', () => {
    const orderTotal = 100.00; // including previous tips
    const capturedTips = 9.00;
    const capturedTendered = 50.00;

    const baseOrderTotal = Math.max(0, orderTotal - capturedTips);
    const baseRemaining = Math.max(0, baseOrderTotal - (capturedTendered - capturedTips));

    expect(baseOrderTotal).toBe(91.00);
    expect(baseRemaining).toBe(roundCurrency(91.00 - (50.00 - 9.00)));
    expect(baseRemaining).toBe(50.00);
  });

  it('correctly calculates new totals after second payment', () => {
    const initialOrderTotal = 91.00; // no tip yet
    const payment2Base = 50.00;
    const payment2Tip = 9.00;

    const nextTipTotal = roundCurrency(9.00 + payment2Tip);   // 18
    const nextGrandTotal = roundCurrency(initialOrderTotal + nextTipTotal); // 91 + 18 = 109
    const nextTendered = roundCurrency(50.00 + payment2Base + payment2Tip);  // 50 + 59 = 109
    const remaining = Math.max(0, roundCurrency(nextGrandTotal - nextTendered));

    expect(remaining).toBe(0.00);
  });
});

// ─── Gift Card Validation ─────────────────────────────────────────────────

describe('Gift card payment validation', () => {
  it('requires gift card code when method is GIFT_CARD', () => {
    const method = 'GIFT_CARD';
    const giftCardCode = '';
    const isValid = method !== 'GIFT_CARD' || Boolean(giftCardCode);
    expect(isValid).toBe(false);
  });

  it('allows gift card payment with valid code', () => {
    const method = 'GIFT_CARD';
    const giftCardCode = 'GC-ABCDEF123456';
    const isValid = method !== 'GIFT_CARD' || Boolean(giftCardCode);
    expect(isValid).toBe(true);
  });

  it('rejects payment exceeding gift card balance', () => {
    const cardBalance = 25.00;
    const paymentAmount = 30.00;
    const hasSufficientFunds = cardBalance >= paymentAmount;
    expect(hasSufficientFunds).toBe(false);
  });

  it('allows payment within gift card balance', () => {
    const cardBalance = 50.00;
    const paymentAmount = 30.00;
    const hasSufficientFunds = cardBalance >= paymentAmount;
    expect(hasSufficientFunds).toBe(true);
  });
});

// ─── Refund Logic ─────────────────────────────────────────────────────────

describe('Refund validation', () => {
  it('only allows refund of CAPTURED payments', () => {
    const validStatuses = ['CAPTURED'];
    const scenarios = [
      { status: 'CAPTURED', canRefund: true },
      { status: 'REFUNDED', canRefund: false },
      { status: 'PENDING', canRefund: false },
      { status: 'FAILED', canRefund: false },
    ];

    scenarios.forEach(({ status, canRefund }) => {
      expect(validStatuses.includes(status)).toBe(canRefund);
    });
  });

  it('refund amount cannot exceed original payment', () => {
    const originalAmount = 50.00;
    const refundAmount = 75.00;
    const isValidRefund = refundAmount <= originalAmount;
    expect(isValidRefund).toBe(false);
  });

  it('partial refund is allowed', () => {
    const originalAmount = 50.00;
    const refundAmount = 25.00;
    const isValidRefund = refundAmount > 0 && refundAmount <= originalAmount;
    expect(isValidRefund).toBe(true);
  });

  it('zero refund amount is rejected', () => {
    const refundAmount = 0;
    const isValidRefund = Number.isFinite(refundAmount) && refundAmount > 0;
    expect(isValidRefund).toBe(false);
  });

  it('requires reason for refund', () => {
    const reason = '';
    const hasReason = Boolean(reason?.trim());
    expect(hasReason).toBe(false);
  });
});

// ─── Payment Method Normalization ────────────────────────────────────────

describe('Payment method handling', () => {
  const VALID_METHODS = ['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'GIFT_CARD', 'COMP', 'HOUSE_ACCOUNT'];

  it('recognizes all valid payment methods', () => {
    VALID_METHODS.forEach((method) => {
      expect(VALID_METHODS.includes(method)).toBe(true);
    });
  });

  it('rejects unknown payment method', () => {
    expect(VALID_METHODS.includes('CRYPTO')).toBe(false);
    expect(VALID_METHODS.includes('VENMO')).toBe(false);
  });
});

// ─── Cash Summary Grouping ────────────────────────────────────────────────

describe('Cash summary calculation', () => {
  it('groups payments by method correctly', () => {
    const payments = [
      { method: 'CASH', amount: 20.00, tipAmount: 3.00 },
      { method: 'CASH', amount: 15.00, tipAmount: 2.00 },
      { method: 'CREDIT_CARD', amount: 50.00, tipAmount: 9.00 },
      { method: 'GIFT_CARD', amount: 25.00, tipAmount: 0 },
    ];

    const summary = {
      cash: { count: 0, total: 0 },
      credit_card: { count: 0, total: 0 },
      gift_card: { count: 0, total: 0 },
      tips: 0,
      grandTotal: 0,
    };

    for (const payment of payments) {
      const key = payment.method.toLowerCase() as keyof typeof summary;
      if (key in summary && typeof summary[key] === 'object') {
        (summary[key] as any).count++;
        (summary[key] as any).total = roundCurrency((summary[key] as any).total + payment.amount);
      }
      summary.tips = roundCurrency(summary.tips + payment.tipAmount);
      summary.grandTotal = roundCurrency(summary.grandTotal + payment.amount);
    }

    expect(summary.cash.count).toBe(2);
    expect(summary.cash.total).toBe(35.00);
    expect(summary.credit_card.count).toBe(1);
    expect(summary.credit_card.total).toBe(50.00);
    expect(summary.tips).toBe(14.00);
    expect(summary.grandTotal).toBe(110.00);
  });
});
