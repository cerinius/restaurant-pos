'use client';

import { useQuery } from '@tanstack/react-query';

export function PosScreen() {
  const { data, isLoading } = useQuery({
    queryKey: ['pos-data'],
    queryFn: async () => {
      const res = await fetch('/api/example');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  if (isLoading) return <div>Loading...</div>;

  return <div>POS Screen</div>;
}