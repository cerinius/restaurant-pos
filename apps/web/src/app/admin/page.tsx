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

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-400">{sub}</p>
    </div>
  );
}

export default function SaasAdminPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!getSaasAdminToken()) {
      router.replace('/admin/login');
    }
  }, [router]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['saas-restaurants'],
    queryFn: () => api.getSaasRestaurants(),
  });

  const restaurants = data?.data || [];

  useEffect(() => {
    if (!restaurants.length) return;

    setDrafts((current) => {
      const next = { ...current };

      restaurants.forEach((restaurant: any) => {
        next[restaurant.id] = next[restaurant.id] || {
          isActive: restaurant.isActive,
          tier: restaurant.saas?.tier || 'ADVANCED',
          billingStatus: restaurant.saas?.billingStatus || 'active',
          monthlyPrice: restaurant.saas?.monthlyPrice ?? 279,
          serverLimit: restaurant.saas?.serverLimit ?? 25,
          managerLimit: restaurant.saas?.managerLimit ?? 5,
          supportLevel: restaurant.saas?.supportLevel || 'Priority support',
          onboarding: restaurant.saas?.onboarding || 'Guided onboarding',
          notes: restaurant.saas?.notes || '',
          blockedReason: restaurant.saas?.blockedReason || '',
        };
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
      toast.success('Restaurant account updated');
      await queryClient.invalidateQueries({ queryKey: ['saas-restaurants'] });
    },
    onError: (mutationError: any) => {
      toast.error(mutationError?.response?.data?.error || 'Could not update restaurant');
    },
  });

  const stats = useMemo(() => {
    const activeCount = restaurants.filter((restaurant: any) => restaurant.isActive).length;
    const demoCount = restaurants.filter((restaurant: any) => restaurant.saas?.demoMode).length;
    const blockedCount = restaurants.filter(
      (restaurant: any) => restaurant.saas?.billingStatus === 'blocked' || !restaurant.isActive,
    ).length;
    const monthlyRevenue = restaurants.reduce(
      (sum: number, restaurant: any) =>
        sum + Number(restaurant.saas?.billingStatus === 'active' ? restaurant.saas?.monthlyPrice || 0 : 0),
      0,
    );

    return {
      activeCount,
      demoCount,
      blockedCount,
      monthlyRevenue,
    };
  }, [restaurants]);

  const handleDraftChange = (restaurantId: string, field: string, value: string | number | boolean) => {
    setDrafts((current) => ({
      ...current,
      [restaurantId]: {
        ...current[restaurantId],
        [field]: value,
      },
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
        Loading SaaS control plane...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_28%),linear-gradient(180deg,#020617_0%,#0f172a_50%,#020617_100%)] px-6 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">
              SaaS admin
            </p>
            <h1 className="mt-3 text-4xl font-black text-white">RestaurantOS control plane</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              Manage demos, active restaurants, pricing overrides, tier limits, support levels,
              and the exact tenant URLs every restaurant should use for POS, KDS, and admin.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200"
            >
              Marketing site
            </Link>
            <button
              onClick={() => {
                clearSaasAdminSession();
                router.replace('/admin/login');
              }}
              className="rounded-full bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/20"
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Restaurants" value={String(restaurants.length)} sub="Total onboarded accounts" />
          <StatCard label="Active" value={String(stats.activeCount)} sub="Accounts currently enabled" />
          <StatCard label="Demo / Trial" value={String(stats.demoCount)} sub="Trial environments in the field" />
          <StatCard
            label="Estimated MRR"
            value={`$${stats.monthlyRevenue.toFixed(0)}`}
            sub="Active plan revenue using current overrides"
          />
        </div>

        <div className="mt-8 rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
                Default tier strategy
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">Basic, Advanced, and Pro</h2>
              <p className="mt-2 text-sm text-slate-400">
                The marketing site is now aligned to user-count based tiers. Per-restaurant pricing
                below can still override these defaults whenever sales needs flexibility.
              </p>
            </div>
            <div className="text-sm text-slate-400">
              Added-value levers: onboarding, customer success, migration help, and premium support.
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6">
          {restaurants.map((restaurant: any) => {
            const draft = drafts[restaurant.id];
            if (!draft) return null;

            return (
              <section
                key={restaurant.id}
                className="rounded-[32px] border border-white/10 bg-slate-950/70 p-6 shadow-[0_30px_100px_rgba(2,6,23,0.45)]"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="max-w-3xl">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-black text-white">{restaurant.name}</h2>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                        {restaurant.saas?.demoMode ? 'Demo' : 'Customer'}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                          restaurant.isActive
                            ? 'bg-emerald-500/10 text-emerald-200'
                            : 'bg-red-500/10 text-red-200'
                        }`}
                      >
                        {restaurant.isActive ? 'Active' : 'Blocked'}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-400">
                      Tenant ID: <span className="font-mono text-slate-200">{restaurant.id}</span>
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      Owner: {restaurant.owner?.name || 'Unassigned'} | {restaurant.owner?.email || 'No email'}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      {restaurant.counts.locations} locations | {restaurant.counts.users} users |{' '}
                      {restaurant.counts.orders} orders
                    </p>
                  </div>

                  <div className="grid gap-2 text-sm text-slate-300">
                    <a href={restaurant.urls.admin} className="rounded-2xl border border-slate-800 px-4 py-3 hover:bg-slate-900">
                      Admin: {restaurant.urls.admin}
                    </a>
                    <a href={restaurant.urls.pos} className="rounded-2xl border border-slate-800 px-4 py-3 hover:bg-slate-900">
                      POS: {restaurant.urls.pos}
                    </a>
                    <a href={restaurant.urls.kds} className="rounded-2xl border border-slate-800 px-4 py-3 hover:bg-slate-900">
                      KDS: {restaurant.urls.kds}
                    </a>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <label className="label">Tier</label>
                    <select
                      value={draft.tier}
                      onChange={(event) => handleDraftChange(restaurant.id, 'tier', event.target.value)}
                      className="input w-full"
                    >
                      {TIERS.map((tier) => (
                        <option key={tier} value={tier}>
                          {tier}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Billing Status</label>
                    <select
                      value={draft.billingStatus}
                      onChange={(event) =>
                        handleDraftChange(restaurant.id, 'billingStatus', event.target.value)
                      }
                      className="input w-full"
                    >
                      {BILLING_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Monthly Price</label>
                    <input
                      type="number"
                      value={draft.monthlyPrice}
                      onChange={(event) =>
                        handleDraftChange(restaurant.id, 'monthlyPrice', Number(event.target.value))
                      }
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="label">Account Status</label>
                    <button
                      type="button"
                      onClick={() => handleDraftChange(restaurant.id, 'isActive', !draft.isActive)}
                      className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold ${
                        draft.isActive
                          ? 'bg-emerald-500/15 text-emerald-100'
                          : 'bg-red-500/15 text-red-100'
                      }`}
                    >
                      {draft.isActive ? 'Enabled' : 'Blocked'}
                    </button>
                  </div>
                  <div>
                    <label className="label">Server Limit</label>
                    <input
                      type="number"
                      value={draft.serverLimit}
                      onChange={(event) =>
                        handleDraftChange(restaurant.id, 'serverLimit', Number(event.target.value))
                      }
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="label">Manager Limit</label>
                    <input
                      type="number"
                      value={draft.managerLimit}
                      onChange={(event) =>
                        handleDraftChange(restaurant.id, 'managerLimit', Number(event.target.value))
                      }
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="label">Support Level</label>
                    <input
                      value={draft.supportLevel}
                      onChange={(event) =>
                        handleDraftChange(restaurant.id, 'supportLevel', event.target.value)
                      }
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="label">Onboarding</label>
                    <input
                      value={draft.onboarding}
                      onChange={(event) =>
                        handleDraftChange(restaurant.id, 'onboarding', event.target.value)
                      }
                      className="input w-full"
                    />
                  </div>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  <div>
                    <label className="label">Blocked Reason / Collections Note</label>
                    <textarea
                      value={draft.blockedReason}
                      onChange={(event) =>
                        handleDraftChange(restaurant.id, 'blockedReason', event.target.value)
                      }
                      className="input min-h-[120px] w-full"
                    />
                  </div>
                  <div>
                    <label className="label">Internal SaaS Notes</label>
                    <textarea
                      value={draft.notes}
                      onChange={(event) => handleDraftChange(restaurant.id, 'notes', event.target.value)}
                      className="input min-h-[120px] w-full"
                    />
                  </div>
                </div>

                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleSave(restaurant.id)}
                    disabled={updateMutation.isPending}
                    className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
                  >
                    {updateMutation.isPending ? 'Saving...' : 'Save account controls'}
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
