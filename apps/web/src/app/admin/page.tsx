'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import api from '@/lib/api';
import { clearSaasAdminSession, getSaasAdminToken } from '@/lib/saas-auth';

const TIERS = ['BASIC', 'ADVANCED', 'PRO'];
const BILLING_STATUSES = ['demo', 'trialing', 'active', 'past_due', 'blocked', 'cancelled'];

type Restaurant = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  owner: { name: string; email: string } | null;
  counts: { locations: number; users: number; orders: number };
  saas: {
    tier: string;
    billingStatus: string;
    monthlyPrice: number;
    serverLimit: number;
    managerLimit: number;
    supportLevel: string;
    onboarding: string;
    demoMode: boolean;
    trialEndsAt: string | null;
    notes?: string;
    blockedReason?: string;
  };
  urls: { login: string; pos: string; admin: string; kds: string };
};

function StatCard({ label, value, sub, color = 'white' }: { label: string; value: string; sub: string; color?: string }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className={`mt-3 text-3xl font-black text-${color}`}>{value}</p>
      <p className="mt-2 text-sm text-slate-400">{sub}</p>
    </div>
  );
}

function TrialStatus({ trialEndsAt }: { trialEndsAt: string | null }) {
  if (!trialEndsAt) return <span className="text-slate-500 text-xs">No trial</span>;
  const end = new Date(trialEndsAt);
  const now = new Date();
  const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const expired = daysLeft <= 0;
  const urgent = !expired && daysLeft <= 2;

  return (
    <span className={`text-xs font-semibold ${expired ? 'text-red-400' : urgent ? 'text-amber-400' : 'text-emerald-400'}`}>
      {expired ? `Expired ${Math.abs(daysLeft)}d ago` : `${daysLeft}d left`}
    </span>
  );
}

export default function SaasAdminPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, any>>({});
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [extendDays, setExtendDays] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!getSaasAdminToken()) {
      router.replace('/admin/login');
    }
  }, [router]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['saas-restaurants'],
    queryFn: () => api.getSaasRestaurants(),
    refetchInterval: 60_000,
  });

  const { data: statsData } = useQuery({
    queryKey: ['saas-stats'],
    queryFn: () => api.getSaasStats(),
    refetchInterval: 120_000,
  });

  const restaurants: Restaurant[] = data?.data || [];

  useEffect(() => {
    if (!restaurants.length) return;
    setDrafts((current) => {
      const next = { ...current };
      restaurants.forEach((r) => {
        next[r.id] = next[r.id] || {
          isActive: r.isActive,
          tier: r.saas?.tier || 'ADVANCED',
          billingStatus: r.saas?.billingStatus || 'active',
          monthlyPrice: r.saas?.monthlyPrice ?? 279,
          serverLimit: r.saas?.serverLimit ?? 25,
          managerLimit: r.saas?.managerLimit ?? 5,
          supportLevel: r.saas?.supportLevel || 'Priority support',
          onboarding: r.saas?.onboarding || 'Guided onboarding',
          notes: r.saas?.notes || '',
          blockedReason: r.saas?.blockedReason || '',
        };
        setExtendDays((prev) => ({ ...prev, [r.id]: prev[r.id] ?? 7 }));
      });
      return next;
    });
  }, [restaurants]);

  useEffect(() => {
    const status = (error as any)?.response?.status;
    if (status === 401) {
      clearSaasAdminSession();
      router.replace('/admin/login');
    }
  }, [error, router]);

  const updateMutation = useMutation({
    mutationFn: ({ restaurantId, payload }: { restaurantId: string; payload: any }) =>
      api.updateSaasRestaurant(restaurantId, payload),
    onSuccess: async () => {
      toast.success('Account updated');
      await queryClient.invalidateQueries({ queryKey: ['saas-restaurants'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Update failed'),
  });

  const extendTrialMutation = useMutation({
    mutationFn: ({ restaurantId, days }: { restaurantId: string; days: number }) =>
      api.extendSaasTrial(restaurantId, days, 'Admin panel extension'),
    onSuccess: async (_, vars) => {
      toast.success(`Trial extended by ${vars.days} days`);
      await queryClient.invalidateQueries({ queryKey: ['saas-restaurants'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Could not extend trial'),
  });

  const expireTrialMutation = useMutation({
    mutationFn: (restaurantId: string) => api.expireSaasTrial(restaurantId),
    onSuccess: async () => {
      toast.success('Trial expired');
      await queryClient.invalidateQueries({ queryKey: ['saas-restaurants'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed'),
  });

  const stats = useMemo(() => {
    const activeCount = restaurants.filter((r) => r.isActive).length;
    const demoCount = restaurants.filter((r) => r.saas?.demoMode).length;
    const paidCount = restaurants.filter((r) => r.saas?.billingStatus === 'active' && !r.saas?.demoMode).length;
    const expiredTrials = restaurants.filter((r) => {
      if (!r.saas?.trialEndsAt) return false;
      return new Date(r.saas.trialEndsAt) < new Date();
    }).length;
    const monthlyRevenue = restaurants.reduce(
      (sum, r) => sum + (r.saas?.billingStatus === 'active' ? r.saas?.monthlyPrice || 0 : 0),
      0,
    );
    return { activeCount, demoCount, paidCount, expiredTrials, monthlyRevenue };
  }, [restaurants]);

  const filteredRestaurants = useMemo(() => {
    return restaurants.filter((r) => {
      const matchSearch =
        !search ||
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.owner?.email?.toLowerCase().includes(search.toLowerCase()) ||
        r.slug.toLowerCase().includes(search.toLowerCase());

      const matchStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active' && r.isActive && r.saas?.billingStatus === 'active') ||
        (filterStatus === 'demo' && r.saas?.demoMode) ||
        (filterStatus === 'inactive' && !r.isActive) ||
        (filterStatus === 'expired' && r.saas?.trialEndsAt && new Date(r.saas.trialEndsAt) < new Date()) ||
        (filterStatus === 'past_due' && r.saas?.billingStatus === 'past_due');

      return matchSearch && matchStatus;
    });
  }, [restaurants, search, filterStatus]);

  const handleDraftChange = (restaurantId: string, field: string, value: any) => {
    setDrafts((current) => ({
      ...current,
      [restaurantId]: { ...current[restaurantId], [field]: value },
    }));
  };

  const handleSave = (restaurantId: string) => {
    const draft = drafts[restaurantId];
    if (!draft) return;
    updateMutation.mutate({
      restaurantId,
      payload: {
        isActive: draft.isActive,
        saas: {
          tier: draft.tier,
          billingStatus: draft.billingStatus,
          monthlyPrice: Number(draft.monthlyPrice || 0),
          serverLimit: Number(draft.serverLimit || 0),
          managerLimit: Number(draft.managerLimit || 0),
          supportLevel: draft.supportLevel,
          onboarding: draft.onboarding,
          notes: draft.notes,
          blockedReason: draft.blockedReason,
        },
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent mx-auto" />
          <p>Loading control plane...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_28%),linear-gradient(180deg,#020617_0%,#0f172a_50%,#020617_100%)] px-6 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">SaaS control plane</p>
            <h1 className="mt-3 text-4xl font-black text-white">RestaurantOS Admin</h1>
            <p className="mt-2 text-sm text-slate-400">
              {filteredRestaurants.length} of {restaurants.length} accounts shown
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/" className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200">
              Marketing site
            </Link>
            <button
              onClick={() => { clearSaasAdminSession(); router.replace('/admin/login'); }}
              className="rounded-full bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/20"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Total" value={String(restaurants.length)} sub="All accounts" />
          <StatCard label="Active" value={String(stats.activeCount)} sub="Accounts enabled" color="emerald-400" />
          <StatCard label="Demo / Trial" value={String(stats.demoCount)} sub="Trial accounts" color="cyan-400" />
          <StatCard label="Paid" value={String(stats.paidCount)} sub="Paying customers" color="green-400" />
          <StatCard label="Expired Trials" value={String(stats.expiredTrials)} sub="Need follow-up" color="amber-400" />
          <StatCard
            label="Est. MRR"
            value={`$${stats.monthlyRevenue.toLocaleString()}`}
            sub="Active plan revenue"
            color="white"
          />
        </div>

        {/* Platform Stats from API */}
        {statsData?.data && (
          <div className="mt-4 rounded-2xl border border-white/5 bg-white/3 p-4">
            <p className="text-xs text-slate-500">
              Platform totals: {statsData.data.users.total} users · {statsData.data.orders.total.toLocaleString()} orders total ·{' '}
              {statsData.data.orders.last30Days} orders last 30 days ·{' '}
              {statsData.data.restaurants.newThisWeek} new accounts this week
            </p>
          </div>
        )}

        {/* Search + Filter */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or slug..."
            className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-100 focus:outline-none"
          >
            <option value="all">All accounts</option>
            <option value="active">Active (paid)</option>
            <option value="demo">Demo / Trial</option>
            <option value="expired">Expired trials</option>
            <option value="past_due">Past due</option>
            <option value="inactive">Blocked</option>
          </select>
        </div>

        {filteredRestaurants.length === 0 && (
          <div className="mt-12 text-center text-slate-500">
            <p className="text-lg">No accounts match your filters.</p>
          </div>
        )}

        {/* Restaurant Cards */}
        <div className="mt-6 grid gap-6">
          {filteredRestaurants.map((restaurant) => {
            const draft = drafts[restaurant.id];
            if (!draft) return null;
            const isExpanded = expandedId === restaurant.id;

            return (
              <section
                key={restaurant.id}
                className="rounded-[32px] border border-white/10 bg-slate-950/70 p-6 shadow-[0_30px_100px_rgba(2,6,23,0.45)]"
              >
                {/* Summary Row */}
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="max-w-2xl">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-black text-white">{restaurant.name}</h2>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${restaurant.saas?.demoMode ? 'bg-cyan-500/10 text-cyan-200' : 'bg-purple-500/10 text-purple-200'}`}>
                        {restaurant.saas?.demoMode ? 'Trial' : 'Customer'}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${restaurant.isActive ? 'bg-emerald-500/10 text-emerald-200' : 'bg-red-500/10 text-red-200'}`}>
                        {restaurant.isActive ? 'Active' : 'Blocked'}
                      </span>
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-300">
                        {restaurant.saas?.tier}
                      </span>
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-300">
                        {restaurant.saas?.billingStatus}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      <span className="font-mono">{restaurant.id}</span> · slug: <span className="font-mono">{restaurant.slug}</span>
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      {restaurant.owner?.name || 'No owner'} · {restaurant.owner?.email || 'No email'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {restaurant.counts.locations} locations · {restaurant.counts.users} users · {restaurant.counts.orders} orders
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Trial: <TrialStatus trialEndsAt={restaurant.saas?.trialEndsAt || null} />
                      {' · '}
                      Created: {new Date(restaurant.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 text-xs">
                    <a href={restaurant.urls.admin} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-800 px-3 py-2 text-slate-300 hover:bg-slate-900">
                      Admin ↗
                    </a>
                    <a href={restaurant.urls.pos} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-800 px-3 py-2 text-slate-300 hover:bg-slate-900">
                      POS ↗
                    </a>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : restaurant.id)}
                      className="rounded-xl border border-cyan-500/30 px-3 py-2 text-cyan-300 hover:bg-cyan-500/10"
                    >
                      {isExpanded ? 'Collapse ▲' : 'Manage ▼'}
                    </button>
                  </div>
                </div>

                {/* Expanded Management Panel */}
                {isExpanded && (
                  <div className="mt-6 border-t border-white/5 pt-6">
                    {/* Trial Extension */}
                    {restaurant.saas?.demoMode && (
                      <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                        <p className="mb-3 text-sm font-semibold text-amber-300">Trial Management</p>
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-slate-400">Extend by:</label>
                            <input
                              type="number"
                              min={1}
                              max={90}
                              value={extendDays[restaurant.id] ?? 7}
                              onChange={(e) => setExtendDays((prev) => ({ ...prev, [restaurant.id]: Number(e.target.value) }))}
                              className="w-20 rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-sm text-white"
                            />
                            <span className="text-xs text-slate-400">days</span>
                          </div>
                          <button
                            onClick={() => extendTrialMutation.mutate({ restaurantId: restaurant.id, days: extendDays[restaurant.id] ?? 7 })}
                            disabled={extendTrialMutation.isPending}
                            className="rounded-lg bg-amber-500/20 px-4 py-1.5 text-sm font-semibold text-amber-200 hover:bg-amber-500/30 disabled:opacity-50"
                          >
                            Extend Trial
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Force-expire this trial?')) {
                                expireTrialMutation.mutate(restaurant.id);
                              }
                            }}
                            disabled={expireTrialMutation.isPending}
                            className="rounded-lg bg-red-500/10 px-4 py-1.5 text-sm font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                          >
                            Force Expire
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Main Fields */}
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <label className="label">Tier</label>
                        <select value={draft.tier} onChange={(e) => handleDraftChange(restaurant.id, 'tier', e.target.value)} className="input w-full">
                          {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label">Billing Status</label>
                        <select value={draft.billingStatus} onChange={(e) => handleDraftChange(restaurant.id, 'billingStatus', e.target.value)} className="input w-full">
                          {BILLING_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label">Monthly Price ($)</label>
                        <input type="number" value={draft.monthlyPrice} onChange={(e) => handleDraftChange(restaurant.id, 'monthlyPrice', Number(e.target.value))} className="input w-full" />
                      </div>
                      <div>
                        <label className="label">Account Status</label>
                        <button
                          type="button"
                          onClick={() => handleDraftChange(restaurant.id, 'isActive', !draft.isActive)}
                          className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold ${draft.isActive ? 'bg-emerald-500/15 text-emerald-100' : 'bg-red-500/15 text-red-100'}`}
                        >
                          {draft.isActive ? '✓ Enabled' : '✗ Blocked'}
                        </button>
                      </div>
                      <div>
                        <label className="label">Server Limit</label>
                        <input type="number" value={draft.serverLimit} onChange={(e) => handleDraftChange(restaurant.id, 'serverLimit', Number(e.target.value))} className="input w-full" />
                      </div>
                      <div>
                        <label className="label">Manager Limit</label>
                        <input type="number" value={draft.managerLimit} onChange={(e) => handleDraftChange(restaurant.id, 'managerLimit', Number(e.target.value))} className="input w-full" />
                      </div>
                      <div>
                        <label className="label">Support Level</label>
                        <input value={draft.supportLevel} onChange={(e) => handleDraftChange(restaurant.id, 'supportLevel', e.target.value)} className="input w-full" />
                      </div>
                      <div>
                        <label className="label">Onboarding</label>
                        <input value={draft.onboarding} onChange={(e) => handleDraftChange(restaurant.id, 'onboarding', e.target.value)} className="input w-full" />
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 xl:grid-cols-2">
                      <div>
                        <label className="label">Block Reason / Collections Note</label>
                        <textarea value={draft.blockedReason} onChange={(e) => handleDraftChange(restaurant.id, 'blockedReason', e.target.value)} className="input min-h-[100px] w-full" />
                      </div>
                      <div>
                        <label className="label">Internal SaaS Notes</label>
                        <textarea value={draft.notes} onChange={(e) => handleDraftChange(restaurant.id, 'notes', e.target.value)} className="input min-h-[100px] w-full" />
                      </div>
                    </div>

                    <div className="mt-5 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setExpandedId(null)}
                        className="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSave(restaurant.id)}
                        disabled={updateMutation.isPending}
                        className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
                      >
                        {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
