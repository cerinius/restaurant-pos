const DEFAULT_BASE_URL = process.env.APP_BASE_URL || process.env.WEB_BASE_URL || 'http://localhost:3000';

const PLAN_DEFAULTS: Record<string, any> = {
  BASIC: {
    tier: 'BASIC',
    label: 'Basic',
    billingStatus: 'active',
    monthlyPrice: 149,
    serverLimit: 10,
    managerLimit: 2,
    supportLevel: 'Email support',
    onboarding: 'Self-serve onboarding',
    addOns: ['Core POS', 'KDS', 'Floor plan'],
  },
  ADVANCED: {
    tier: 'ADVANCED',
    label: 'Advanced',
    billingStatus: 'active',
    monthlyPrice: 279,
    serverLimit: 25,
    managerLimit: 5,
    supportLevel: 'Priority support',
    onboarding: 'Guided onboarding',
    addOns: ['Inventory', 'Audit log', 'Workflow controls', 'Customer success reviews'],
  },
  PRO: {
    tier: 'PRO',
    label: 'Pro',
    billingStatus: 'active',
    monthlyPrice: 499,
    serverLimit: 75,
    managerLimit: 12,
    supportLevel: 'Dedicated success manager',
    onboarding: 'White-glove rollout',
    addOns: ['Multi-unit controls', 'Custom pricing', 'Migration planning', 'Priority launch support'],
  },
};

function normalizeTier(value: any) {
  const tier = String(value || 'ADVANCED').toUpperCase();
  return PLAN_DEFAULTS[tier] ? tier : 'ADVANCED';
}

export function getRestaurantUrls(restaurantId: string, baseUrl = DEFAULT_BASE_URL) {
  const normalizedBaseUrl = String(baseUrl).replace(/\/$/, '');
  return {
    login: `${normalizedBaseUrl}/${restaurantId}/login`,
    pos: `${normalizedBaseUrl}/${restaurantId}/pos`,
    admin: `${normalizedBaseUrl}/${restaurantId}/admin`,
    kds: `${normalizedBaseUrl}/${restaurantId}/kds`,
  };
}

export function normalizeRestaurantSaasSettings(settings: any) {
  const rawSaas = settings?.saas || {};
  const tier = normalizeTier(rawSaas.tier || rawSaas.plan);
  const defaults = PLAN_DEFAULTS[tier];
  const trialEndsAt = settings?.trialEndsAt || settings?.trial?.endsAt || rawSaas.trialEndsAt || null;

  return {
    ...defaults,
    ...rawSaas,
    tier,
    demoMode: Boolean(settings?.demoMode || rawSaas.demoMode),
    trialEndsAt,
  };
}

export function mergeRestaurantSaasSettings(settings: any, updates: any) {
  const current = normalizeRestaurantSaasSettings(settings);
  const nextTier = normalizeTier(updates?.tier || updates?.plan || current.tier);
  const defaults = PLAN_DEFAULTS[nextTier];

  return {
    ...(settings || {}),
    saas: {
      ...defaults,
      ...current,
      ...(updates || {}),
      tier: nextTier,
    },
  };
}
