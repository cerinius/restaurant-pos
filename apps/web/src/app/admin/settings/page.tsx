
'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/store';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [form, setForm] = useState<any>(null);
  const [settings, setSettings] = useState<any>({});

  const { data } = useQuery({
    queryKey: ['restaurant', user?.restaurantId],
    queryFn: () => api.getRestaurant(user!.restaurantId),
    enabled: !!user?.restaurantId,
  });

  useEffect(() => {
    if (data?.data) {
      setForm(data.data);
      setSettings(data.data.settings || {});
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (payload: any) => api.updateRestaurant(user!.restaurantId, payload),
    onSuccess: () => toast.success('Settings saved!'),
    onError: () => toast.error('Save failed'),
  });

  if (!form) return <div className="flex-1 flex items-center justify-center text-slate-400">Loading...</div>;

  const handleSave = () => {
    saveMutation.mutate({ ...form, settings });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-700 bg-slate-950/50 shrink-0">
        <h1 className="text-xl font-bold text-slate-100">Restaurant Settings</h1>
        <p className="text-sm text-slate-400">Configure your restaurant preferences</p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl space-y-8">

          {/* Basic Info */}
          <section className="card p-6 space-y-4">
            <h2 className="font-bold text-slate-100 text-lg border-b border-slate-700 pb-3">Basic Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Restaurant Name</label>
                <input value={form.name || ''} onChange={(e) => setForm({...form, name: e.target.value})} className="input w-full" />
              </div>
              <div>
                <label className="label">Phone</label>
                <input value={form.phone || ''} onChange={(e) => setForm({...form, phone: e.target.value})} className="input w-full" />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" value={form.email || ''} onChange={(e) => setForm({...form, email: e.target.value})} className="input w-full" />
              </div>
              <div className="col-span-2">
                <label className="label">Address</label>
                <input value={form.address || ''} onChange={(e) => setForm({...form, address: e.target.value})} className="input w-full" />
              </div>
              <div>
                <label className="label">Timezone</label>
                <select value={form.timezone || 'America/New_York'} onChange={(e) => setForm({...form, timezone: e.target.value})} className="input w-full">
                  {['America/New_York','America/Chicago','America/Denver','America/Los_Angeles','America/Toronto','America/Vancouver','Europe/London','Europe/Paris'].map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Currency</label>
                <select value={form.currency || 'USD'} onChange={(e) => setForm({...form, currency: e.target.value})} className="input w-full">
                  {['USD','CAD','GBP','EUR','AUD'].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Service Mode</label>
                <select value={form.serviceMode || 'FULL_SERVICE'} onChange={(e) => setForm({...form, serviceMode: e.target.value})} className="input w-full">
                  {['FULL_SERVICE','QUICK_SERVICE','BAR','FOOD_TRUCK'].map((m) => (
                    <option key={m} value={m}>{m.replace('_',' ')}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* POS Settings */}
          <section className="card p-6 space-y-4">
            <h2 className="font-bold text-slate-100 text-lg border-b border-slate-700 pb-3">POS Configuration</h2>
            <div className="space-y-3">
              {[
                { key: 'requireTableForDineIn', label: 'Require table selection for dine-in orders' },
                { key: 'allowSplitBills',       label: 'Allow split bill payments' },
                { key: 'kdsEnabled',            label: 'Enable Kitchen Display System (KDS)' },
                { key: 'printerEnabled',        label: 'Enable receipt/ticket printing' },
                { key: 'taxIncluded',           label: 'Prices include tax (tax-inclusive pricing)' },
                { key: 'loyaltyEnabled',        label: 'Enable loyalty program' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center justify-between gap-4 cursor-pointer group">
                  <span className="text-sm text-slate-300 group-hover:text-slate-200 transition-colors">{label}</span>
                  <div
                    onClick={() => setSettings({...settings, [key]: !settings[key]})}
                    className={`w-11 h-6 rounded-full transition-all cursor-pointer shrink-0 ${
                      settings[key] ? 'bg-blue-600' : 'bg-slate-600'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform m-0.5 ${
                      settings[key] ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </div>
                </label>
              ))}
            </div>

            {/* Tip Percentages */}
            <div>
              <label className="label">Default Tip Percentages</label>
              <div className="flex gap-2 flex-wrap">
                {[10, 15, 18, 20, 22, 25, 30].map((pct) => {
                  const tips: number[] = settings.defaultTipPercentages || [15,18,20,25];
                  const active = tips.includes(pct);
                  return (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setSettings({
                        ...settings,
                        defaultTipPercentages: active
                          ? tips.filter((t: number) => t !== pct)
                          : [...tips, pct].sort((a,b) => a-b),
                      })}
                      className={`px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all ${
                        active ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-300'
                      }`}
                    >
                      {pct}%
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Receipt Footer */}
            <div>
              <label className="label">Receipt Footer Message</label>
              <input
                value={settings.receiptFooter || ''}
                onChange={(e) => setSettings({...settings, receiptFooter: e.target.value})}
                className="input w-full"
                placeholder="Thank you for dining with us!"
              />
            </div>
          </section>

          {/* Save Button */}
          <div className="flex justify-end">
            <button onClick={handleSave} disabled={saveMutation.isPending} className="btn-primary px-8 py-3 text-base">
              {saveMutation.isPending ? 'Saving...' : 'Save All Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
