export const OPERATIONS_INTELLIGENCE_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_OPERATIONS_INTELLIGENCE === 'true';

export const IS_INTERNAL_ENVIRONMENT = process.env.NODE_ENV !== 'production';
