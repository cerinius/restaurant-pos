import crypto from 'crypto';

export interface DemoSignupPayload {
  contactName: string;
  restaurantName: string;
  locationName: string;
  email: string;
  phone: string;
  password: string;
  seats: number;
  locationsPlanned: number;
  serviceMode: 'FULL_SERVICE' | 'QUICK_SERVICE' | 'BAR' | 'FOOD_TRUCK';
}

interface PendingDemoSignup extends DemoSignupPayload {
  verificationId: string;
  code: string;
  expiresAt: number;
}

const OTP_TTL_MS = 10 * 60 * 1000;
const pendingDemoSignups = new Map<string, PendingDemoSignup>();

function generateOtp() {
  return String(crypto.randomInt(100000, 999999));
}

export function slugifyRestaurantName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'restaurantos-demo';
}

function cleanupExpiredRequests() {
  const now = Date.now();

  pendingDemoSignups.forEach((request, verificationId) => {
    if (request.expiresAt <= now) {
      pendingDemoSignups.delete(verificationId);
    }
  });
}

export function createPendingDemoSignup(payload: DemoSignupPayload) {
  cleanupExpiredRequests();

  const verificationId = crypto.randomUUID();
  const request: PendingDemoSignup = {
    ...payload,
    verificationId,
    code: generateOtp(),
    expiresAt: Date.now() + OTP_TTL_MS,
  };

  pendingDemoSignups.set(verificationId, request);
  return request;
}

export function getPendingDemoSignup(verificationId: string) {
  cleanupExpiredRequests();
  return pendingDemoSignups.get(verificationId) || null;
}

export function consumePendingDemoSignup(verificationId: string, code: string) {
  cleanupExpiredRequests();
  const request = pendingDemoSignups.get(verificationId);

  if (!request || request.code !== code.trim()) {
    return null;
  }

  pendingDemoSignups.delete(verificationId);
  return request;
}
