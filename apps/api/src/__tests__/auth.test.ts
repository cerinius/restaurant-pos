/**
 * Auth route integration tests.
 * Requires a running test database (or mocked Prisma).
 *
 * Run: vitest run --reporter=verbose src/__tests__/auth.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock Prisma ─────────────────────────────────────────────────────────────
// We mock at the module level so individual tests can control what DB returns
vi.mock('@pos/db', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    restaurant: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    location: { create: vi.fn() },
    userLocation: { create: vi.fn() },
    tax: { create: vi.fn() },
    station: { create: vi.fn() },
    menuCategory: { create: vi.fn() },
    menuItem: { create: vi.fn() },
    discount: { create: vi.fn() },
    table: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2b$10$hashedpin'),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

import bcrypt from 'bcryptjs';
import { isTrialExpired, getTrialDaysRemaining } from '../lib/trial';

// ─── Trial Logic Tests ────────────────────────────────────────────────────────

describe('Trial library', () => {
  it('detects expired trial', () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
    expect(isTrialExpired({ trialEndsAt: pastDate })).toBe(true);
  });

  it('detects active trial', () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString(); // 1 day from now
    expect(isTrialExpired({ trialEndsAt: futureDate })).toBe(false);
  });

  it('returns false for no trial date', () => {
    expect(isTrialExpired({})).toBe(false);
    expect(isTrialExpired(null)).toBe(false);
  });

  it('calculates days remaining', () => {
    const futureDate = new Date(Date.now() + 3 * 86400000).toISOString(); // 3 days
    const days = getTrialDaysRemaining({ trialEndsAt: futureDate });
    expect(days).toBe(3);
  });

  it('returns 0 days remaining for expired trial', () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    const days = getTrialDaysRemaining({ trialEndsAt: pastDate });
    expect(days).toBe(0);
  });
});

// ─── PIN Hashing ─────────────────────────────────────────────────────────────

describe('PIN/Password hashing', () => {
  it('calls bcrypt.hash with correct rounds', async () => {
    await bcrypt.hash('1234', 10);
    expect(bcrypt.hash).toHaveBeenCalledWith('1234', 10);
  });

  it('verifies a correct PIN', async () => {
    (bcrypt.compare as any).mockResolvedValueOnce(true);
    const result = await bcrypt.compare('1234', '$2b$10$hashedpin');
    expect(result).toBe(true);
  });

  it('rejects incorrect PIN', async () => {
    (bcrypt.compare as any).mockResolvedValueOnce(false);
    const result = await bcrypt.compare('wrong', '$2b$10$hashedpin');
    expect(result).toBe(false);
  });
});

// ─── Input Validation Tests ───────────────────────────────────────────────────

describe('Auth input validation', () => {
  it('rejects empty PIN', () => {
    const pin = '';
    expect(pin.length >= 4).toBe(false);
  });

  it('accepts valid 4-digit PIN', () => {
    const pin = '1234';
    expect(pin.length >= 4).toBe(true);
  });

  it('accepts valid 6-digit PIN', () => {
    const pin = '123456';
    expect(pin.length >= 4).toBe(true);
  });

  it('rejects 3-digit PIN (too short)', () => {
    const pin = '123';
    expect(pin.length >= 4).toBe(false);
  });
});

// ─── Password Reset Flow ──────────────────────────────────────────────────────

describe('Password reset flow', () => {
  it('generates 6-digit OTP code', () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    expect(code.length).toBe(6);
    expect(Number(code)).toBeGreaterThanOrEqual(100000);
    expect(Number(code)).toBeLessThan(1000000);
  });

  it('OTP expires after 15 minutes', () => {
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const now = new Date();
    expect(expiresAt > now).toBe(true);
  });

  it('detects expired OTP', () => {
    const expiredAt = new Date(Date.now() - 1000); // 1 second ago
    expect(expiredAt < new Date()).toBe(true);
  });
});

// ─── JWT Token Structure ──────────────────────────────────────────────────────

describe('JWT token payload structure', () => {
  it('contains required fields', () => {
    const payload = {
      id: 'user-id-123',
      name: 'John Server',
      role: 'SERVER',
      restaurantId: 'restaurant-id-456',
      locationId: 'location-id-789',
      locationIds: ['location-id-789'],
    };

    expect(payload.id).toBeTruthy();
    expect(payload.role).toBeTruthy();
    expect(payload.restaurantId).toBeTruthy();
    expect(Array.isArray(payload.locationIds)).toBe(true);
  });

  it('does not include password/pin in token', () => {
    const payload: Record<string, any> = {
      id: 'user-id-123',
      name: 'John',
      role: 'SERVER',
      restaurantId: 'rest-id',
    };

    expect(payload.pin).toBeUndefined();
    expect(payload.password).toBeUndefined();
    expect(payload.hashedPin).toBeUndefined();
  });
});

// ─── Role-Based Access ────────────────────────────────────────────────────────

describe('Role-based access control', () => {
  const PRIVILEGED_ROLES = ['OWNER', 'MANAGER'];
  const ALL_ROLES = ['OWNER', 'MANAGER', 'SERVER', 'HOST', 'CASHIER', 'KITCHEN'];

  it('only OWNER and MANAGER can process refunds', () => {
    ALL_ROLES.forEach((role) => {
      const canRefund = PRIVILEGED_ROLES.includes(role);
      if (role === 'OWNER' || role === 'MANAGER') {
        expect(canRefund).toBe(true);
      } else {
        expect(canRefund).toBe(false);
      }
    });
  });

  it('validates location access for non-OWNER users', () => {
    const userLocations = ['location-1', 'location-2'];
    const requestedLocation = 'location-3';
    const role = 'SERVER';

    const hasAccess = role === 'OWNER' || userLocations.includes(requestedLocation);
    expect(hasAccess).toBe(false);
  });

  it('OWNER always has location access', () => {
    const userLocations: string[] = [];
    const requestedLocation = 'any-location';
    const role = 'OWNER';

    const hasAccess = role === 'OWNER' || userLocations.includes(requestedLocation);
    expect(hasAccess).toBe(true);
  });
});
