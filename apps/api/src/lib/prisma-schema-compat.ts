export function isPrismaSchemaMissingError(
  error: unknown,
  options?: {
    code?: 'P2021' | 'P2022';
    table?: string;
    column?: string;
  },
) {
  if (!error || typeof error !== 'object') return false;

  const record = error as {
    code?: string;
    meta?: {
      table?: string;
      column?: string;
    };
  };

  if (options?.code && record.code !== options.code) return false;
  if (options?.table && record.meta?.table !== options.table) return false;
  if (options?.column && record.meta?.column !== options.column) return false;

  return record.code === 'P2021' || record.code === 'P2022';
}
