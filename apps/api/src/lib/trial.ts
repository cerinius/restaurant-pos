export function getTrialEndsAt(settings: any) {
  const rawValue = settings?.trialEndsAt || settings?.trial?.endsAt;
  if (!rawValue) return null;

  const trialEndsAt = new Date(rawValue);
  return Number.isNaN(trialEndsAt.getTime()) ? null : trialEndsAt;
}

export function isTrialExpired(settings: any, now = new Date()) {
  const trialEndsAt = getTrialEndsAt(settings);
  if (!trialEndsAt) return false;
  return trialEndsAt.getTime() < now.getTime();
}

export function getTrialDaysRemaining(settings: any, now = new Date()) {
  const trialEndsAt = getTrialEndsAt(settings);
  if (!trialEndsAt) return null;

  const msRemaining = trialEndsAt.getTime() - now.getTime();
  return Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
}
