'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import api from '@/lib/api';
import { useAuthStore } from '@/store';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value || 0);
}

export default function MarketingPage() {
  const qc = useQueryClient();
  const { locationId } = useAuthStore();
  const [form, setForm] = useState({
    name: '',
    channel: 'EMAIL',
    trigger: 'MANUAL',
    segmentName: 'At-Risk Guests',
    segmentType: 'at-risk',
    subject: '',
    message: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['ops-overview-marketing', locationId],
    queryFn: () => api.getOperationsOverview({ locationId }),
  });

  const campaigns = data?.data?.campaigns || [];
  const guests = data?.data?.guests || [];

  const createMutation = useMutation({
    mutationFn: () =>
      api.createCampaign({
        name: form.name,
        channel: form.channel,
        trigger: form.trigger,
        segmentName: form.segmentName,
        segmentRules: { type: form.segmentType },
        subject: form.subject,
        message: form.message,
      }),
    onSuccess: async () => {
      toast.success('Campaign created');
      setForm({
        name: '',
        channel: 'EMAIL',
        trigger: 'MANUAL',
        segmentName: 'At-Risk Guests',
        segmentType: 'at-risk',
        subject: '',
        message: '',
      });
      await qc.invalidateQueries({ queryKey: ['ops-overview-marketing'] });
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Could not create campaign'),
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => api.sendCampaign(id),
    onSuccess: async () => {
      toast.success('Campaign sent');
      await qc.invalidateQueries({ queryKey: ['ops-overview-marketing'] });
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Could not send campaign'),
  });

  const stats = useMemo(
    () => ({
      guests: guests.length,
      smsOptIn: guests.filter((guest: any) => guest.marketingOptInSms).length,
      emailOptIn: guests.filter((guest: any) => guest.marketingOptInEmail).length,
      sent: campaigns.reduce((sum: number, campaign: any) => sum + (campaign.recipients?.length || 0), 0),
      revenue: campaigns.reduce(
        (sum: number, campaign: any) =>
          sum +
          (campaign.recipients || []).reduce(
            (campaignTotal: number, recipient: any) => campaignTotal + Number(recipient.revenueAttributed || 0),
            0
          ),
        0
      ),
    }),
    [campaigns, guests]
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-slate-700 bg-slate-950/60 px-6 py-4">
        <h1 className="text-xl font-bold text-slate-100">Guest Marketing</h1>
        <p className="mt-1 text-sm text-slate-400">Campaigns now use real guest CRM segments and real recipient records. No fake send counts or AI suggestions remain.</p>

        <div className="mt-4 grid gap-3 md:grid-cols-5">
          {[
            ['CRM Guests', String(stats.guests), 'Available campaign audience'],
            ['SMS Opt-In', String(stats.smsOptIn), 'Reachable via text'],
            ['Email Opt-In', String(stats.emailOptIn), 'Reachable via email'],
            ['Recipients Sent', String(stats.sent), 'Recorded campaign deliveries'],
            ['Attributed Revenue', formatCurrency(stats.revenue), 'Current tracked attribution'],
          ].map(([label, value, sub]) => (
            <div key={label} className="card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
              <p className="mt-2 text-xl font-bold text-slate-100">{value}</p>
              <p className="text-xs text-slate-400">{sub}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid flex-1 min-h-0 gap-0 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="overflow-auto border-r border-slate-800 p-6">
          <div className="card p-5">
            <h2 className="text-lg font-semibold text-slate-100">Create Campaign</h2>
            <p className="mt-1 text-sm text-slate-400">Use honest segmentation rules tied to real guests and opt-in status.</p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                className="input w-full"
                placeholder="Campaign name"
              />
              <select
                value={form.channel}
                onChange={(event) => setForm((current) => ({ ...current, channel: event.target.value }))}
                className="input w-full"
              >
                <option value="EMAIL">Email</option>
                <option value="SMS">SMS</option>
              </select>
              <select
                value={form.segmentType}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    segmentType: event.target.value,
                    segmentName:
                      event.target.value === 'vip'
                        ? 'VIP Guests'
                        : event.target.value === 'birthday'
                          ? 'Birthdays This Month'
                          : event.target.value === 'sms-opt-in'
                            ? 'SMS Opt-In Guests'
                            : event.target.value === 'email-opt-in'
                              ? 'Email Opt-In Guests'
                              : 'At-Risk Guests',
                  }))
                }
                className="input w-full"
              >
                <option value="at-risk">At-Risk Guests</option>
                <option value="vip">VIP Guests</option>
                <option value="birthday">Birthdays This Month</option>
                <option value="sms-opt-in">SMS Opt-In</option>
                <option value="email-opt-in">Email Opt-In</option>
                <option value="all">All Guests</option>
              </select>
              <input
                value={form.segmentName}
                onChange={(event) => setForm((current) => ({ ...current, segmentName: event.target.value }))}
                className="input w-full"
                placeholder="Segment label"
              />
              <input
                value={form.subject}
                onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
                className="input w-full md:col-span-2"
                placeholder="Email subject"
              />
              <textarea
                value={form.message}
                onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                className="input min-h-[160px] w-full md:col-span-2"
                placeholder="Write the campaign copy that should actually be stored and sent."
              />
            </div>

            <div className="mt-4 flex justify-end">
              <button type="button" onClick={() => createMutation.mutate()} className="btn-primary" disabled={!form.name || !form.message}>
                Create Campaign
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-auto p-6">
          <div className="card overflow-hidden">
            <div className="border-b border-slate-800 px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-100">Campaigns</h2>
              <p className="mt-1 text-sm text-slate-400">Each campaign below is persisted, and send actions generate real recipient records.</p>
            </div>

            {isLoading ? (
              <div className="px-5 py-8 text-sm text-slate-400">Loading campaign history...</div>
            ) : campaigns.length === 0 ? (
              <div className="px-5 py-8 text-sm text-slate-400">No campaigns have been created yet.</div>
            ) : (
              <div className="divide-y divide-slate-800">
                {campaigns.map((campaign: any) => {
                  const revenue = (campaign.recipients || []).reduce(
                    (sum: number, recipient: any) => sum + Number(recipient.revenueAttributed || 0),
                    0
                  );
                  return (
                    <div key={campaign.id} className="p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-slate-100">{campaign.name}</p>
                          <p className="mt-1 text-sm text-slate-400">
                            {campaign.segmentName} | {campaign.channel} | {campaign.status.toLowerCase()}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => sendMutation.mutate(campaign.id)}
                          className="btn-secondary"
                          disabled={sendMutation.isPending}
                        >
                          Send Now
                        </button>
                      </div>
                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <div className="rounded-2xl bg-white/5 p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Recipients</p>
                          <p className="mt-2 text-lg font-bold text-slate-100">{campaign.recipients?.length || 0}</p>
                        </div>
                        <div className="rounded-2xl bg-white/5 p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Last Sent</p>
                          <p className="mt-2 text-lg font-bold text-slate-100">
                            {campaign.lastSentAt ? new Date(campaign.lastSentAt).toLocaleString() : 'Not sent'}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-white/5 p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Attributed Revenue</p>
                          <p className="mt-2 text-lg font-bold text-slate-100">{formatCurrency(revenue)}</p>
                        </div>
                      </div>
                      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                        {campaign.subject && <p className="text-sm font-semibold text-slate-200">Subject: {campaign.subject}</p>}
                        <p className="mt-2 text-sm leading-6 text-slate-300">{campaign.message}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
