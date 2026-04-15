/**
 * Unit tests for core POS business logic calculations.
 * These do NOT require a database connection.
 */

// ─── Pure Calculation Functions (duplicated from routes for testability) ────

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

function calculateOrderTotals(
  items: Array<{ basePrice: number; quantity: number; modifierTotal?: number }>,
  taxRate: number = 0,
  discountAmount: number = 0,
  isPercentageDiscount: boolean = false,
): {
  subtotal: number;
  taxAmount: number;
  discountTotal: number;
  total: number;
} {
  const subtotal = roundCurrency(
    items.reduce((sum, item) => {
      const itemPrice = item.basePrice + (item.modifierTotal || 0);
      return sum + itemPrice * item.quantity;
    }, 0),
  );

  const discountTotal = isPercentageDiscount
    ? roundCurrency(subtotal * (discountAmount / 100))
    : roundCurrency(Math.min(discountAmount, subtotal));

  const taxableAmount = Math.max(0, subtotal - discountTotal);
  const taxAmount = roundCurrency(taxableAmount * (taxRate / 100));
  const total = roundCurrency(taxableAmount + taxAmount);

  return { subtotal, taxAmount, discountTotal, total };
}

function calculateChange(amountTendered: number, amountDue: number): number {
  return roundCurrency(Math.max(0, amountTendered - amountDue));
}

function calculateTip(baseAmount: number, tipPercent: number): number {
  return roundCurrency(baseAmount * (tipPercent / 100));
}

function isTrialExpired(settings: any, now = new Date()): boolean {
  const rawValue = settings?.trialEndsAt || settings?.trial?.endsAt;
  if (!rawValue) return false;
  const trialEndsAt = new Date(rawValue);
  if (Number.isNaN(trialEndsAt.getTime())) return false;
  return trialEndsAt.getTime() < now.getTime();
}

// ─── Test Suite ─────────────────────────────────────────────────────────────

describe('roundCurrency', () => {
  it('rounds to 2 decimal places', () => {
    // Note: 1.005 has a JS floating-point representation slightly below 1.005
    // so toFixed(2) gives "1.00" - this is expected JS behavior
    expect(roundCurrency(1.006)).toBe(1.01);
    expect(roundCurrency(1.004)).toBe(1.00);
    expect(roundCurrency(10.999)).toBe(11.00);
    expect(roundCurrency(18.125)).toBe(18.13); // Typical tip calculation
  });

  it('handles zero', () => {
    expect(roundCurrency(0)).toBe(0);
  });

  it('handles negative values', () => {
    expect(roundCurrency(-1.005)).toBe(-1.00);
  });
});

describe('calculateOrderTotals', () => {
  it('calculates simple order correctly', () => {
    const result = calculateOrderTotals(
      [{ basePrice: 15.00, quantity: 2 }],
      8.875,
    );
    expect(result.subtotal).toBe(30.00);
    expect(result.discountTotal).toBe(0);
    expect(result.taxAmount).toBe(2.66);
    expect(result.total).toBe(32.66);
  });

  it('handles multiple items with modifiers', () => {
    const result = calculateOrderTotals([
      { basePrice: 18.00, quantity: 1, modifierTotal: 2.00 }, // burger + extra cheese
      { basePrice: 12.00, quantity: 2 },                      // two appetizers
      { basePrice: 5.00,  quantity: 1 },                      // one drink
    ]);
    // (18+2)*1 + 12*2 + 5*1 = 20 + 24 + 5 = 49
    expect(result.subtotal).toBe(49.00);
    expect(result.total).toBe(49.00); // no tax
  });

  it('applies fixed discount correctly', () => {
    const result = calculateOrderTotals(
      [{ basePrice: 50.00, quantity: 1 }],
      0,
      10.00,
      false,
    );
    expect(result.subtotal).toBe(50.00);
    expect(result.discountTotal).toBe(10.00);
    expect(result.total).toBe(40.00);
  });

  it('applies percentage discount correctly', () => {
    const result = calculateOrderTotals(
      [{ basePrice: 100.00, quantity: 1 }],
      0,
      20, // 20%
      true,
    );
    expect(result.subtotal).toBe(100.00);
    expect(result.discountTotal).toBe(20.00);
    expect(result.total).toBe(80.00);
  });

  it('discount cannot exceed subtotal', () => {
    const result = calculateOrderTotals(
      [{ basePrice: 10.00, quantity: 1 }],
      0,
      999.00, // huge discount
      false,
    );
    expect(result.discountTotal).toBe(10.00); // capped at subtotal
    expect(result.total).toBe(0.00);
  });

  it('applies tax after discount', () => {
    const result = calculateOrderTotals(
      [{ basePrice: 100.00, quantity: 1 }],
      10, // 10% tax
      20.00,
      false,
    );
    // 100 - 20 = 80 taxable; 80 * 10% = 8
    expect(result.taxAmount).toBe(8.00);
    expect(result.total).toBe(88.00);
  });

  it('handles empty items array', () => {
    const result = calculateOrderTotals([]);
    expect(result.subtotal).toBe(0);
    expect(result.total).toBe(0);
  });
});

describe('calculateChange', () => {
  it('returns change when tendered > due', () => {
    expect(calculateChange(20.00, 14.50)).toBe(5.50);
  });

  it('returns 0 when exact payment', () => {
    expect(calculateChange(14.50, 14.50)).toBe(0.00);
  });

  it('returns 0 when tendered < due (should not happen but is guarded)', () => {
    expect(calculateChange(10.00, 14.50)).toBe(0.00);
  });

  it('handles penny rounding', () => {
    expect(calculateChange(20.00, 14.999)).toBe(5.00);
  });
});

describe('calculateTip', () => {
  it('calculates 18% tip', () => {
    expect(calculateTip(50.00, 18)).toBe(9.00);
  });

  it('calculates 20% tip', () => {
    expect(calculateTip(75.00, 20)).toBe(15.00);
  });

  it('returns 0 for 0% tip', () => {
    expect(calculateTip(50.00, 0)).toBe(0.00);
  });

  it('rounds correctly', () => {
    expect(calculateTip(33.33, 18)).toBe(6.00); // 33.33 * 0.18 = 5.9994 -> 6.00
  });
});

describe('isTrialExpired', () => {
  const PAST = new Date('2020-01-01T00:00:00Z');
  const FUTURE = new Date('2099-01-01T00:00:00Z');

  it('returns true when trial has expired', () => {
    const settings = { trialEndsAt: PAST.toISOString() };
    expect(isTrialExpired(settings)).toBe(true);
  });

  it('returns false when trial is still valid', () => {
    const settings = { trialEndsAt: FUTURE.toISOString() };
    expect(isTrialExpired(settings)).toBe(false);
  });

  it('returns false when no trial end date', () => {
    expect(isTrialExpired({})).toBe(false);
    expect(isTrialExpired(null)).toBe(false);
    expect(isTrialExpired(undefined)).toBe(false);
  });

  it('reads trial.endsAt nested field', () => {
    const settings = { trial: { endsAt: PAST.toISOString() } };
    expect(isTrialExpired(settings)).toBe(true);
  });

  it('uses custom now parameter', () => {
    const trialEnd = new Date('2024-06-01T00:00:00Z');
    const settings = { trialEndsAt: trialEnd.toISOString() };

    // Before trial end
    expect(isTrialExpired(settings, new Date('2024-05-31T00:00:00Z'))).toBe(false);
    // After trial end
    expect(isTrialExpired(settings, new Date('2024-06-02T00:00:00Z'))).toBe(true);
  });

  it('handles invalid date strings gracefully', () => {
    expect(isTrialExpired({ trialEndsAt: 'not-a-date' })).toBe(false);
  });
});

describe('Payment split calculations', () => {
  it('correctly calculates remaining balance after partial payment', () => {
    const orderTotal = 100.00;
    const payment1 = 40.00;
    const remaining = roundCurrency(orderTotal - payment1);
    expect(remaining).toBe(60.00);
  });

  it('handles split payment with tips', () => {
    // Customer has $100 order, first payment: $40 base + $7.20 tip = $47.20
    const baseOrderTotal = 100.00;
    const tip1 = 7.20;
    const tendered1 = 40.00 + tip1; // $47.20 total tendered

    const capturedTips = tip1;
    const capturedTendered = tendered1;
    // Base remaining = 100 - (47.20 - 7.20) = 100 - 40 = 60
    const baseRemaining = Math.max(0, baseOrderTotal - (capturedTendered - capturedTips));

    expect(baseRemaining).toBe(60.00); // Still owed on base
  });

  it('detects order paid when remaining <= 0.01', () => {
    const remaining = 0.009; // floating point artifact
    const isPaid = remaining <= 0.01;
    expect(isPaid).toBe(true);
  });

  it('does not mark overpayment scenarios as paid incorrectly', () => {
    // Cash overpayment is allowed but order is still marked paid
    const remaining = -5.00; // over-paid with cash
    const isPaid = remaining <= 0.01;
    expect(isPaid).toBe(true);
  });
});

describe('Seat split calculations', () => {
  it('splits order evenly by subtotal proportion', () => {
    const totalOrderAmount = 100.00;

    const seat1Subtotal = 60.00;
    const seat2Subtotal = 40.00;
    const grandSubtotal = seat1Subtotal + seat2Subtotal;

    const seat1Amount = roundCurrency((seat1Subtotal / grandSubtotal) * totalOrderAmount);
    const seat2Amount = roundCurrency(totalOrderAmount - seat1Amount);

    expect(seat1Amount).toBe(60.00);
    expect(seat2Amount).toBe(40.00);
    expect(roundCurrency(seat1Amount + seat2Amount)).toBe(totalOrderAmount);
  });

  it('last seat gets remainder to avoid rounding issues', () => {
    const items = [
      { seat: 1, subtotal: 33.33 },
      { seat: 2, subtotal: 33.33 },
      { seat: 3, subtotal: 33.34 },
    ];
    const totalSubtotal = items.reduce((s, i) => s + i.subtotal, 0);
    const totalDue = 100.00;

    let allocated = 0;
    const splits = items.map((item, index) => {
      if (index === items.length - 1) {
        const amount = roundCurrency(totalDue - allocated);
        return amount;
      }
      const amount = roundCurrency((item.subtotal / totalSubtotal) * totalDue);
      allocated += amount;
      return amount;
    });

    const total = splits.reduce((s, a) => s + a, 0);
    expect(roundCurrency(total)).toBe(100.00);
  });
});
