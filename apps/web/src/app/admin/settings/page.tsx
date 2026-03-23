'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { LoadingNotice, SkeletonBlock } from '@/components/ui/LoadingState';
import api from '@/lib/api';
import { getRestaurantPublicPath } from '@/lib/paths';
import {
  RESTAURANT_SITE_DAYS,
  normalizeRestaurantSiteSettings,
  withRestaurantSiteSettings,
  type RestaurantSiteSettings,
} from '@/lib/restaurant-site';
import { useAuthStore } from '@/store';

const POS_SETTING_TOGGLES = [
  { key: 'requireTableForDineIn', label: 'Require table selection for dine-in orders' },
  { key: 'allowSplitBills', label: 'Allow split bill payments' },
  { key: 'kdsEnabled', label: 'Enable Kitchen Display System (KDS)' },
  { key: 'printerEnabled', label: 'Enable receipt and ticket printing' },
  { key: 'taxIncluded', label: 'Use tax-inclusive pricing' },
  { key: 'loyaltyEnabled', label: 'Enable loyalty program' },
];

function ToggleRow({
  active,
  label,
  onToggle,
}: {
  active: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <span className="text-sm text-slate-200">{label}</span>
      <button
        type="button"
        onClick={onToggle}
        className={`relative h-7 w-12 rounded-full transition ${
          active ? 'bg-cyan-300' : 'bg-slate-700'
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
            active ? 'left-6' : 'left-1'
          }`}
        />
      </button>
    </label>
  );
}

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [form, setForm] = useState<any>(null);
  const [settings, setSettings] = useState<any>({});
  const [siteSettings, setSiteSettings] = useState<RestaurantSiteSettings | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['restaurant', user?.restaurantId],
    queryFn: () => api.getRestaurant(user!.restaurantId),
    enabled: !!user?.restaurantId,
  });

  useEffect(() => {
    if (!data?.data) return;

    setForm(data.data);
    setSettings(data.data.settings || {});
    setSiteSettings(normalizeRestaurantSiteSettings(data.data.settings, data.data));
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (payload: any) => api.updateRestaurant(user!.restaurantId, payload),
    onSuccess: () => toast.success('Settings saved'),
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Save failed');
    },
  });

  if (isLoading && !form) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="border-b border-white/10 bg-slate-950/50 px-6 py-4">
          <SkeletonBlock className="h-8 w-64" />
          <SkeletonBlock className="mt-2 h-4 w-72" />
        </div>
        <div className="space-y-4 p-6">
          <LoadingNotice
            title="Loading restaurant settings"
            description="We are restoring branding, operational preferences, and the guest website configuration."
          />
          <div className="card space-y-4 p-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index}>
                <SkeletonBlock className="h-4 w-32" />
                <SkeletonBlock className="mt-2 h-11 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!form || !siteSettings) {
    return null;
  }

  const publicPath = user?.restaurantId ? getRestaurantPublicPath(user.restaurantId) : '#';
  const tier = String(settings?.saas?.tier || form?.settings?.saas?.tier || 'ADVANCED').toUpperCase();

  const updateFormField = (field: string, value: any) => {
    setForm((current: any) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateSettingField = (key: string, value: any) => {
    setSettings((current: any) => ({
      ...current,
      [key]: value,
    }));
  };

  const updateSiteField = (field: keyof RestaurantSiteSettings, value: any) => {
    setSiteSettings((current) => (current ? { ...current, [field]: value } : current));
  };

  const updateHighlight = (index: number, value: string) => {
    setSiteSettings((current) => {
      if (!current) return current;
      const highlights = [...current.highlights];
      highlights[index] = value;
      return { ...current, highlights };
    });
  };

  const updateHour = (day: string, field: 'open' | 'close' | 'closed', value: string | boolean) => {
    setSiteSettings((current) => {
      if (!current) return current;
      return {
        ...current,
        hours: current.hours.map((entry) =>
          entry.day === day ? { ...entry, [field]: value } : entry
        ),
      };
    });
  };

  const handleSave = () => {
    saveMutation.mutate({
      ...form,
      settings: withRestaurantSiteSettings(settings, siteSettings),
    });
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="border-b border-white/10 bg-slate-950/55 px-6 py-5 backdrop-blur">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="section-kicker">Owner controls</p>
            <h1 className="mt-2 text-3xl font-black text-white">Brand, operations, and guest experience</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
              Keep core restaurant settings, POS behavior, and the premium restaurant homepage in one place so the operational product and the guest-facing brand stay aligned.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="status-chip">{tier} tier</span>
            <Link href={publicPath} target="_blank" className="btn-secondary">
              Open public homepage
            </Link>
            <button
              type="button"
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="btn-primary"
            >
              {saveMutation.isPending ? 'Saving...' : 'Save all settings'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <section className="card p-6">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <p className="section-kicker">Restaurant identity</p>
                  <h2 className="mt-2 text-2xl font-black text-white">Basic information</h2>
                </div>
                <div className="soft-panel px-4 py-3 text-sm text-slate-300">
                  Public URL: <span className="font-semibold text-white">{publicPath}</span>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="label">Restaurant Name</label>
                  <input
                    value={form.name || ''}
                    onChange={(event) => updateFormField('name', event.target.value)}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input
                    value={form.phone || ''}
                    onChange={(event) => updateFormField('phone', event.target.value)}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    value={form.email || ''}
                    onChange={(event) => updateFormField('email', event.target.value)}
                    className="input w-full"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="label">Address</label>
                  <input
                    value={form.address || ''}
                    onChange={(event) => updateFormField('address', event.target.value)}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="label">Timezone</label>
                  <select
                    value={form.timezone || 'America/New_York'}
                    onChange={(event) => updateFormField('timezone', event.target.value)}
                    className="input w-full"
                  >
                    {[
                      'America/New_York',
                      'America/Chicago',
                      'America/Denver',
                      'America/Los_Angeles',
                      'America/Toronto',
                      'America/Vancouver',
                      'Europe/London',
                      'Europe/Paris',
                    ].map((timezone) => (
                      <option key={timezone} value={timezone}>
                        {timezone}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Currency</label>
                  <select
                    value={form.currency || 'USD'}
                    onChange={(event) => updateFormField('currency', event.target.value)}
                    className="input w-full"
                  >
                    {['USD', 'CAD', 'GBP', 'EUR', 'AUD'].map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Service Mode</label>
                  <select
                    value={form.serviceMode || 'FULL_SERVICE'}
                    onChange={(event) => updateFormField('serviceMode', event.target.value)}
                    className="input w-full"
                  >
                    {['FULL_SERVICE', 'QUICK_SERVICE', 'BAR', 'FOOD_TRUCK'].map((mode) => (
                      <option key={mode} value={mode}>
                        {mode.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Logo URL</label>
                  <input
                    value={form.logo || ''}
                    onChange={(event) => updateFormField('logo', event.target.value)}
                    className="input w-full"
                    placeholder="https://..."
                  />
                </div>
              </div>
            </section>

            <section className="card p-6">
              <div className="mb-6">
                <p className="section-kicker">Shift ergonomics</p>
                <h2 className="mt-2 text-2xl font-black text-white">POS configuration</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Keep high-speed service safe and predictable with the right guardrails turned on by default.
                </p>
              </div>

              <div className="grid gap-3">
                {POS_SETTING_TOGGLES.map((item) => (
                  <ToggleRow
                    key={item.key}
                    active={!!settings[item.key]}
                    label={item.label}
                    onToggle={() => updateSettingField(item.key, !settings[item.key])}
                  />
                ))}
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="label">Default Tip Percentages</label>
                  <div className="flex flex-wrap gap-2">
                    {[10, 15, 18, 20, 22, 25, 30].map((percent) => {
                      const currentTips: number[] = settings.defaultTipPercentages || [15, 18, 20, 25];
                      const active = currentTips.includes(percent);
                      return (
                        <button
                          key={percent}
                          type="button"
                          onClick={() =>
                            updateSettingField(
                              'defaultTipPercentages',
                              active
                                ? currentTips.filter((value: number) => value !== percent)
                                : [...currentTips, percent].sort((left, right) => left - right)
                            )
                          }
                          className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                            active
                              ? 'border-cyan-300/30 bg-cyan-300 text-slate-950'
                              : 'border-white/10 bg-white/5 text-slate-200'
                          }`}
                        >
                          {percent}%
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="label">Receipt Footer Message</label>
                  <input
                    value={settings.receiptFooter || ''}
                    onChange={(event) => updateSettingField('receiptFooter', event.target.value)}
                    className="input w-full"
                    placeholder="Thank you for dining with us."
                  />
                </div>
              </div>
            </section>

            <section className="card p-6">
              <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="section-kicker">Premium guest experience</p>
                  <h2 className="mt-2 text-2xl font-black text-white">Restaurant homepage</h2>
                  <p className="mt-2 text-sm text-slate-400">
                    This powers the branded guest-facing site at <span className="font-semibold text-slate-200">{publicPath}</span>. It is the perfect Pro-tier upgrade story: menu, hours, ordering, and reservations from the same platform that runs service.
                  </p>
                </div>
                <span className="status-chip">
                  {tier === 'PRO' ? 'Included in Pro' : 'Premium upsell ready'}
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <ToggleRow
                    active={siteSettings.enabled}
                    label="Enable the public restaurant homepage"
                    onToggle={() => updateSiteField('enabled', !siteSettings.enabled)}
                  />
                </div>
                <div>
                  <label className="label">Cuisine</label>
                  <input
                    value={siteSettings.cuisine}
                    onChange={(event) => updateSiteField('cuisine', event.target.value)}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="label">Price Range</label>
                  <input
                    value={siteSettings.priceRange}
                    onChange={(event) => updateSiteField('priceRange', event.target.value)}
                    className="input w-full"
                    placeholder="$$"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="label">Neighborhood</label>
                  <input
                    value={siteSettings.neighborhood}
                    onChange={(event) => updateSiteField('neighborhood', event.target.value)}
                    className="input w-full"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="label">Announcement Banner</label>
                  <input
                    value={siteSettings.announcement}
                    onChange={(event) => updateSiteField('announcement', event.target.value)}
                    className="input w-full"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="label">Hero Headline</label>
                  <input
                    value={siteSettings.heroHeadline}
                    onChange={(event) => updateSiteField('heroHeadline', event.target.value)}
                    className="input w-full"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="label">Hero Description</label>
                  <textarea
                    value={siteSettings.heroDescription}
                    onChange={(event) => updateSiteField('heroDescription', event.target.value)}
                    className="input min-h-[120px] w-full"
                  />
                </div>
                <div>
                  <label className="label">Online Ordering URL</label>
                  <input
                    value={siteSettings.orderUrl}
                    onChange={(event) => updateSiteField('orderUrl', event.target.value)}
                    className="input w-full"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="label">Reservation URL</label>
                  <input
                    value={siteSettings.reservationUrl}
                    onChange={(event) => updateSiteField('reservationUrl', event.target.value)}
                    className="input w-full"
                    placeholder="https://..."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="label">Theme Accent</label>
                  <div className="flex gap-3">
                    <input
                      type="color"
                      value={siteSettings.themeAccent}
                      onChange={(event) => updateSiteField('themeAccent', event.target.value)}
                      className="h-12 w-16 cursor-pointer rounded-2xl border border-white/10 bg-transparent"
                    />
                    <input
                      value={siteSettings.themeAccent}
                      onChange={(event) => updateSiteField('themeAccent', event.target.value)}
                      className="input flex-1"
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="label">Story Title</label>
                  <input
                    value={siteSettings.storyTitle}
                    onChange={(event) => updateSiteField('storyTitle', event.target.value)}
                    className="input w-full"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="label">Story Body</label>
                  <textarea
                    value={siteSettings.storyBody}
                    onChange={(event) => updateSiteField('storyBody', event.target.value)}
                    className="input min-h-[140px] w-full"
                  />
                </div>
              </div>

              <div className="mt-6">
                <p className="label">Homepage Highlights</p>
                <div className="grid gap-3 md:grid-cols-3">
                  {siteSettings.highlights.map((highlight, index) => (
                    <input
                      key={index}
                      value={highlight}
                      onChange={(event) => updateHighlight(index, event.target.value)}
                      className="input w-full"
                      placeholder={`Highlight ${index + 1}`}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <p className="label">Hours of Operation</p>
                <div className="space-y-3">
                  {RESTAURANT_SITE_DAYS.map((day) => {
                    const entry = siteSettings.hours.find((hour) => hour.day === day);
                    if (!entry) return null;

                    return (
                      <div
                        key={day}
                        className="grid gap-3 rounded-[22px] border border-white/10 bg-white/5 px-4 py-4 md:grid-cols-[140px_1fr_1fr_120px]"
                      >
                        <div className="flex items-center text-sm font-semibold text-slate-100">
                          {day}
                        </div>
                        <input
                          value={entry.open}
                          onChange={(event) => updateHour(day, 'open', event.target.value)}
                          className="input w-full"
                          disabled={entry.closed}
                          placeholder="11:00 AM"
                        />
                        <input
                          value={entry.close}
                          onChange={(event) => updateHour(day, 'close', event.target.value)}
                          className="input w-full"
                          disabled={entry.closed}
                          placeholder="09:00 PM"
                        />
                        <button
                          type="button"
                          onClick={() => updateHour(day, 'closed', !entry.closed)}
                          className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                            entry.closed
                              ? 'bg-slate-200 text-slate-900'
                              : 'border border-white/10 bg-white/5 text-slate-200'
                          }`}
                        >
                          {entry.closed ? 'Closed' : 'Open'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-4">
            <section className="glass-panel p-5">
              <p className="section-kicker">Live preview shortcuts</p>
              <h3 className="mt-2 text-xl font-black text-white">What guests will see</h3>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="soft-panel p-4">
                  Homepage URL
                  <p className="mt-2 font-semibold text-white">{publicPath}</p>
                </div>
                <div className="soft-panel p-4">
                  Headline
                  <p className="mt-2 font-semibold text-white">{siteSettings.heroHeadline}</p>
                </div>
                <div className="soft-panel p-4">
                  Primary CTA
                  <p className="mt-2 font-semibold text-white">
                    {siteSettings.orderUrl.trim() ? 'Order online' : 'Call to order'}
                  </p>
                </div>
              </div>
            </section>

            <section className="card p-5">
              <p className="section-kicker">Pitch this in the demo</p>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="soft-panel p-4">One source of truth for menu, pricing, and guest-facing content.</div>
                <div className="soft-panel p-4">Premium upgrade path for restaurants that want a branded web presence.</div>
                <div className="soft-panel p-4">Operations team and guest website stay in sync without duplicate admin work.</div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
