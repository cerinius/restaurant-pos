'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import api from '@/lib/api';

const INITIAL_FORM = {
  name: '',
  email: '',
  phone: '',
  restaurantName: '',
  locations: 1,
  goals: '',
};

export function ContactSalesForm() {
  const [form, setForm] = useState(INITIAL_FORM);

  const contactSalesMutation = useMutation({
    mutationFn: (payload: typeof INITIAL_FORM) => api.contactSales(payload),
    onSuccess: () => {
      toast.success('Sales request sent');
      setForm(INITIAL_FORM);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Could not send sales request');
    },
  });

  const updateField = (field: keyof typeof INITIAL_FORM, value: string | number) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  return (
    <div className="rounded-[32px] border border-slate-700 bg-slate-900/75 p-6 shadow-2xl shadow-black/30">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">Contact sales</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-50">Talk through rollout, pricing, and multi-location fit</h2>
        <p className="mt-2 text-sm text-slate-400">
          Tell us how you run service today and what you want to improve. We will shape the right deployment and pricing package around it.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="label">Name</label>
          <input value={form.name} onChange={(event) => updateField('name', event.target.value)} className="input w-full" />
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} className="input w-full" />
        </div>
        <div>
          <label className="label">Phone</label>
          <input value={form.phone} onChange={(event) => updateField('phone', event.target.value)} className="input w-full" />
        </div>
        <div>
          <label className="label">Restaurant Group</label>
          <input value={form.restaurantName} onChange={(event) => updateField('restaurantName', event.target.value)} className="input w-full" />
        </div>
        <div>
          <label className="label">Locations</label>
          <input type="number" min="1" value={form.locations} onChange={(event) => updateField('locations', Number(event.target.value))} className="input w-full" />
        </div>
        <div className="md:col-span-2">
          <label className="label">What matters most?</label>
          <textarea
            value={form.goals}
            onChange={(event) => updateField('goals', event.target.value)}
            className="input min-h-[140px] w-full"
            placeholder="Tell us about service bottlenecks, hardware, rollout timing, multi-location needs, or integrations."
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={() => contactSalesMutation.mutate(form)}
          disabled={contactSalesMutation.isPending}
          className="rounded-2xl bg-amber-300 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-200 disabled:opacity-50"
        >
          {contactSalesMutation.isPending ? 'Sending...' : 'Contact sales'}
        </button>
      </div>
    </div>
  );
}
