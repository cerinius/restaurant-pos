'use client';

import { useState } from 'react';
import {
  PlusIcon,
  ChartBarIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  BoltIcon,
  ClockIcon,
  CheckCircleIcon,
  PauseCircleIcon,
  XMarkIcon,
  SparklesIcon,
  UserGroupIcon,
  GiftIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';

// ─── Types ───────────────────────────────────────────────────────────────────

type CampaignStatus = 'active' | 'scheduled' | 'draft' | 'completed' | 'paused';
type CampaignChannel = 'sms' | 'email' | 'both';
type CampaignTrigger = 'manual' | 'birthday' | 'lapse' | 'loyalty_tier' | 'post_visit' | 'slow_period';

interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  channel: CampaignChannel;
  trigger: CampaignTrigger;
  segment: string;
  sentCount: number;
  openRate?: number;
  conversionRate?: number;
  revenue?: number;
  scheduledAt?: string;
  lastSent?: string;
  message: string;
  subject?: string;
}

// ─── Sample data ──────────────────────────────────────────────────────────────

const CAMPAIGNS: Campaign[] = [
  {
    id: '1',
    name: 'Tuesday Happy Hour Push',
    status: 'active',
    channel: 'sms',
    trigger: 'slow_period',
    segment: 'Guests visited in last 60 days',
    sentCount: 842,
    openRate: 94,
    conversionRate: 18,
    revenue: 3240,
    lastSent: '2026-04-01',
    message: 'Hey {{first_name}}! 🍹 Slow Tuesday? Not anymore. Happy hour at RestaurantOS — 2-for-1 cocktails 3–6pm. Reserve your spot: {{link}}',
  },
  {
    id: '2',
    name: 'VIP Birthday Reward',
    status: 'active',
    channel: 'email',
    trigger: 'birthday',
    segment: 'All guests with birthday on file',
    sentCount: 124,
    openRate: 88,
    conversionRate: 64,
    revenue: 9840,
    lastSent: '2026-04-04',
    subject: '🎂 Happy Birthday {{first_name}} — A special gift from us',
    message: 'Dear {{first_name}},\n\nBirthdays deserve to be celebrated properly. Enjoy a complimentary dessert and a free round of cocktails for your table on us.\n\nBook your birthday table: {{link}}\n\nYour friends at RestaurantOS',
  },
  {
    id: '3',
    name: 'Win-Back: 45-Day Lapsed Guests',
    status: 'active',
    channel: 'both',
    trigger: 'lapse',
    segment: 'Guests not visited in 45–90 days',
    sentCount: 318,
    openRate: 62,
    conversionRate: 12,
    revenue: 1820,
    lastSent: '2026-03-30',
    subject: 'We miss you, {{first_name}} — Here\'s a reason to come back',
    message: 'Hi {{first_name}}! It\'s been a while and we miss you. Come back this week and enjoy 20% off your next visit — just mention this message to your server. See you soon!',
  },
  {
    id: '4',
    name: 'Gold Tier Upgrade Celebration',
    status: 'active',
    channel: 'email',
    trigger: 'loyalty_tier',
    segment: 'Guests who reached Gold tier',
    sentCount: 47,
    openRate: 91,
    conversionRate: 78,
    revenue: 5240,
    lastSent: '2026-04-02',
    subject: '🏆 Congratulations — You\'ve reached Gold status!',
    message: 'You\'ve officially joined our Gold tier. Enjoy priority reservations, a $25 credit on your next visit, and early access to our new menu launch.',
  },
  {
    id: '5',
    name: 'Post-Visit Thank You',
    status: 'active',
    channel: 'sms',
    trigger: 'post_visit',
    segment: 'All guests after checkout',
    sentCount: 1840,
    openRate: 72,
    conversionRate: 8,
    revenue: 2180,
    lastSent: '2026-04-06',
    message: 'Thanks for dining with us, {{first_name}}! Loved having you. Leave us a quick review and earn 50 bonus loyalty points: {{link}} ⭐',
  },
  {
    id: '6',
    name: 'New Spring Menu Launch',
    status: 'scheduled',
    channel: 'both',
    trigger: 'manual',
    segment: 'All active guests (last 90 days)',
    sentCount: 0,
    scheduledAt: '2026-04-12T10:00:00',
    subject: '🌸 Our Spring Menu Is Here — First Look Inside',
    message: 'Fresh ingredients, bold new flavors. Our spring menu is live and we\'d love to share it with you first. Book your table this week for early access.',
  },
  {
    id: '7',
    name: 'Friday Night Exclusive — VIPs',
    status: 'draft',
    channel: 'sms',
    trigger: 'manual',
    segment: 'Platinum + Gold tier guests',
    sentCount: 0,
    message: '{{first_name}}, this Friday we\'re holding 4 exclusive rooftop tables for VIP members only. Reserve yours now before they\'re gone: {{link}}',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<CampaignStatus, { label: string; bg: string; text: string; dot: string }> = {
  active:    { label: 'Active',     bg: 'bg-emerald-400/15', text: 'text-emerald-300', dot: 'bg-emerald-400' },
  scheduled: { label: 'Scheduled',  bg: 'bg-blue-400/15',    text: 'text-blue-300',    dot: 'bg-blue-400' },
  draft:     { label: 'Draft',      bg: 'bg-slate-400/15',   text: 'text-slate-400',   dot: 'bg-slate-500' },
  completed: { label: 'Completed',  bg: 'bg-slate-400/15',   text: 'text-slate-400',   dot: 'bg-slate-500' },
  paused:    { label: 'Paused',     bg: 'bg-amber-400/15',   text: 'text-amber-300',   dot: 'bg-amber-400' },
};

const CHANNEL_ICONS: Record<CampaignChannel, string> = { sms: '💬', email: '✉️', both: '📡' };

const TRIGGER_LABELS: Record<CampaignTrigger, string> = {
  manual: 'Manual Send',
  birthday: 'Birthday Trigger',
  lapse: 'Lapse Trigger',
  loyalty_tier: 'Tier Upgrade',
  post_visit: 'Post-Visit',
  slow_period: 'Slow Period AI',
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

// ─── New Campaign Modal ───────────────────────────────────────────────────────

function NewCampaignModal({ onClose, onSave }: { onClose: () => void; onSave: (c: Partial<Campaign>) => void }) {
  const [form, setForm] = useState({
    name: '',
    channel: 'sms' as CampaignChannel,
    trigger: 'manual' as CampaignTrigger,
    segment: '',
    subject: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.message) {
      toast.error('Campaign name and message are required');
      return;
    }
    onSave({ ...form, status: 'draft', sentCount: 0, id: String(Date.now()) });
  };

  const SEGMENTS = [
    'All active guests (last 90 days)',
    'Guests visited in last 30 days',
    'Guests visited in last 60 days',
    'Platinum + Gold tier guests',
    'Guests with birthday this month',
    'Guests not visited in 45–90 days',
    'First-time guests (last 30 days)',
    'Guests who opted into SMS',
  ];

  const VARIABLE_TOKENS = ['{{first_name}}', '{{last_name}}', '{{points}}', '{{tier}}', '{{link}}'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl rounded-[28px] border border-white/10 bg-slate-900 p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Create Campaign</h2>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-white/8 hover:text-white">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-400">Campaign Name *</label>
            <input
              className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-400/40 focus:outline-none"
              placeholder="e.g. Tuesday Happy Hour Push"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-400">Channel</label>
              <select
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-2.5 text-sm text-white focus:border-cyan-400/40 focus:outline-none"
                value={form.channel}
                onChange={(e) => setForm({ ...form, channel: e.target.value as CampaignChannel })}
              >
                <option value="sms">💬 SMS</option>
                <option value="email">✉️ Email</option>
                <option value="both">📡 Both</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-400">Trigger</label>
              <select
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-2.5 text-sm text-white focus:border-cyan-400/40 focus:outline-none"
                value={form.trigger}
                onChange={(e) => setForm({ ...form, trigger: e.target.value as CampaignTrigger })}
              >
                {Object.entries(TRIGGER_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-400">Audience Segment</label>
            <select
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-2.5 text-sm text-white focus:border-cyan-400/40 focus:outline-none"
              value={form.segment}
              onChange={(e) => setForm({ ...form, segment: e.target.value })}
            >
              <option value="">Select segment...</option>
              {SEGMENTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {(form.channel === 'email' || form.channel === 'both') && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-400">Email Subject</label>
              <input
                className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-400/40 focus:outline-none"
                placeholder="Subject line..."
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
              />
            </div>
          )}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-400">Message *</label>
              <div className="flex gap-1">
                {VARIABLE_TOKENS.map((token) => (
                  <button
                    key={token}
                    type="button"
                    onClick={() => setForm({ ...form, message: form.message + token })}
                    className="rounded-lg bg-white/8 px-2 py-0.5 text-[10px] font-bold text-slate-300 hover:bg-white/14"
                  >
                    {token}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-400/40 focus:outline-none"
              rows={4}
              placeholder="Write your campaign message..."
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
            <p className="mt-1 text-right text-[10px] text-slate-600">{form.message.length} characters</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">Save as Draft</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Campaign Card ────────────────────────────────────────────────────────────

function CampaignCard({ campaign, onToggle }: { campaign: Campaign; onToggle: (id: string) => void }) {
  const sc = STATUS_CONFIG[campaign.status];
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className="rounded-[20px] border border-white/8 bg-white/4 p-5 transition-all hover:bg-white/6">
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPreview(false)} />
          <div className="relative w-full max-w-sm rounded-[24px] border border-white/10 bg-slate-900 p-6">
            <h3 className="mb-3 text-base font-bold text-white">{campaign.name}</h3>
            {campaign.subject && (
              <div className="mb-2 rounded-xl bg-white/6 px-3 py-2 text-xs font-semibold text-slate-300">
                Subject: {campaign.subject}
              </div>
            )}
            <div className="rounded-2xl border border-white/10 bg-white/4 p-4 text-sm leading-relaxed text-slate-200 whitespace-pre-wrap">
              {campaign.message}
            </div>
            <button onClick={() => setShowPreview(false)} className="btn-secondary mt-4 w-full">Close</button>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-xl">{CHANNEL_ICONS[campaign.channel]}</span>
          <div>
            <p className="text-sm font-bold text-white">{campaign.name}</p>
            <p className="text-xs text-slate-500">{campaign.segment || 'No segment defined'}</p>
          </div>
        </div>
        <span className={clsx('shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em]', sc.bg, sc.text)}>
          <span className={clsx('h-1.5 w-1.5 rounded-full', sc.dot)} />
          {sc.label}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-white/8 px-2.5 py-1 text-[10px] font-bold text-slate-400">
          ⚡ {TRIGGER_LABELS[campaign.trigger]}
        </span>
      </div>

      {campaign.sentCount > 0 && (
        <div className="mb-3 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-white/5 p-2 text-center">
            <p className="text-sm font-black text-white">{campaign.sentCount.toLocaleString()}</p>
            <p className="text-[10px] text-slate-500">Sent</p>
          </div>
          {campaign.openRate !== undefined && (
            <div className="rounded-xl bg-white/5 p-2 text-center">
              <p className="text-sm font-black text-emerald-300">{campaign.openRate}%</p>
              <p className="text-[10px] text-slate-500">Open Rate</p>
            </div>
          )}
          {campaign.revenue !== undefined && (
            <div className="rounded-xl bg-white/5 p-2 text-center">
              <p className="text-sm font-black text-cyan-300">{formatCurrency(campaign.revenue)}</p>
              <p className="text-[10px] text-slate-500">Revenue</p>
            </div>
          )}
        </div>
      )}

      {campaign.scheduledAt && (
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-blue-400/8 px-3 py-2">
          <ClockIcon className="h-3.5 w-3.5 text-blue-400" />
          <span className="text-xs text-blue-300">
            Scheduled: {new Date(campaign.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </span>
        </div>
      )}

      <div className="flex items-center gap-2 mt-auto">
        <button
          onClick={() => setShowPreview(true)}
          className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:bg-white/8 hover:text-white transition-colors"
        >
          Preview
        </button>
        {campaign.status === 'active' && (
          <button
            onClick={() => onToggle(campaign.id)}
            className="rounded-xl border border-amber-400/20 bg-amber-400/8 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-400/15 transition-colors"
          >
            Pause
          </button>
        )}
        {campaign.status === 'paused' && (
          <button
            onClick={() => onToggle(campaign.id)}
            className="rounded-xl border border-emerald-400/20 bg-emerald-400/8 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-400/15 transition-colors"
          >
            Resume
          </button>
        )}
        {campaign.status === 'draft' && (
          <button
            onClick={() => { toast.success(`Campaign "${campaign.name}" launched!`); onToggle(campaign.id); }}
            className="rounded-xl bg-cyan-300/10 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-300/20 transition-colors"
          >
            Launch →
          </button>
        )}
        <span className="ml-auto text-[10px] text-slate-600">
          {campaign.lastSent ? `Last sent ${new Date(campaign.lastSent).toLocaleDateString()}` : 'Never sent'}
        </span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MarketingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(CAMPAIGNS);
  const [showNew, setShowNew] = useState(false);
  const [filterStatus, setFilterStatus] = useState<CampaignStatus | 'all'>('all');

  const handleToggle = (id: string) => {
    setCampaigns((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        if (c.status === 'active') return { ...c, status: 'paused' as CampaignStatus };
        if (c.status === 'paused') return { ...c, status: 'active' as CampaignStatus };
        if (c.status === 'draft') return { ...c, status: 'active' as CampaignStatus };
        return c;
      })
    );
  };

  const handleSave = (partial: Partial<Campaign>) => {
    setCampaigns((prev) => [...prev, partial as Campaign]);
    setShowNew(false);
    toast.success('Campaign saved as draft');
  };

  const filtered = filterStatus === 'all'
    ? campaigns
    : campaigns.filter((c) => c.status === filterStatus);

  const totalRevenue = campaigns.reduce((s, c) => s + (c.revenue || 0), 0);
  const totalSent = campaigns.reduce((s, c) => s + c.sentCount, 0);
  const activeCampaigns = campaigns.filter((c) => c.status === 'active').length;
  const avgConversion = campaigns.filter((c) => c.conversionRate).reduce((s, c, _, arr) =>
    s + (c.conversionRate || 0) / arr.length, 0);

  const STATUS_TABS: { id: CampaignStatus | 'all'; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'active', label: '● Active' },
    { id: 'scheduled', label: 'Scheduled' },
    { id: 'draft', label: 'Draft' },
    { id: 'paused', label: 'Paused' },
    { id: 'completed', label: 'Completed' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {showNew && <NewCampaignModal onClose={() => setShowNew(false)} onSave={handleSave} />}

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-white">Marketing & Campaigns</h1>
          <p className="mt-0.5 text-sm text-slate-400">Automated SMS & email campaigns that drive revenue</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="btn-primary flex items-center gap-2 px-4 py-2.5 text-sm"
        >
          <PlusIcon className="h-4 w-4" /> New Campaign
        </button>
      </div>

      {/* ── KPI Row ─────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: 'Active Campaigns', value: activeCampaigns, icon: BoltIcon, color: 'text-cyan-300', glow: 'shadow-[0_0_20px_rgba(34,211,238,0.08)]' },
          { label: 'Total Sent', value: totalSent.toLocaleString(), icon: EnvelopeIcon, color: 'text-blue-300', glow: '' },
          { label: 'Avg Conversion', value: `${avgConversion.toFixed(1)}%`, icon: ArrowTrendingUpIcon, color: 'text-emerald-300', glow: '' },
          { label: 'Revenue Attributed', value: formatCurrency(totalRevenue), icon: ChartBarIcon, color: 'text-amber-300', glow: '' },
        ].map((kpi) => (
          <div key={kpi.label} className={clsx('rounded-[16px] border border-white/8 bg-white/4 p-4', kpi.glow)}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{kpi.label}</p>
              <kpi.icon className={clsx('h-4 w-4', kpi.color)} />
            </div>
            <p className={clsx('text-2xl font-black', kpi.color)}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* ── AI Suggestions ──────────────────────────────────── */}
      <div className="mb-6 rounded-[20px] border border-cyan-400/20 bg-cyan-400/5 p-5">
        <div className="flex items-center gap-2 mb-3">
          <SparklesIcon className="h-4 w-4 text-cyan-400" />
          <p className="text-sm font-bold text-cyan-300">PULSE AI™ Campaign Suggestions</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[
            { icon: '📉', title: 'Tuesday Lapse Recovery', body: '42 guests haven\'t visited in 30+ days who last came on a Tuesday. A targeted offer could recover ~8 tables.', action: 'Create Campaign' },
            { icon: '🎂', title: '7 Guest Birthdays This Week', body: '7 guests have birthdays this week with no active birthday campaign. Average birthday table spend is 2.4× normal.', action: 'Activate Birthday Campaign' },
            { icon: '⭐', title: '12 Guests Close to Gold Tier', body: '12 silver members are within 200 points of Gold. A targeted push could accelerate their upgrade and increase retention.', action: 'Create Tier Push' },
          ].map((s) => (
            <div key={s.title} className="flex items-start gap-3 rounded-[16px] bg-white/6 p-4">
              <span className="text-xl">{s.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white">{s.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">{s.body}</p>
                <button
                  onClick={() => { setShowNew(true); toast.success(`Campaign template loaded for: ${s.title}`); }}
                  className="mt-2 text-xs font-bold text-cyan-300 hover:text-cyan-200"
                >
                  {s.action} →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Status Filter Tabs ───────────────────────────────── */}
      <div className="mb-5 flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => {
          const count = tab.id === 'all' ? campaigns.length : campaigns.filter((c) => c.status === tab.id).length;
          return (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={clsx(
                'flex items-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-bold transition-all',
                filterStatus === tab.id
                  ? 'bg-cyan-300 text-slate-950'
                  : 'border border-white/10 text-slate-400 hover:text-white',
              )}
            >
              {tab.label}
              <span className={clsx(
                'rounded-full px-1.5 py-0.5 text-[10px] font-black',
                filterStatus === tab.id ? 'bg-slate-950/20 text-slate-950' : 'bg-white/10 text-slate-400',
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Campaign Grid ────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <EnvelopeIcon className="mb-4 h-10 w-10 text-slate-600" />
          <p className="text-base font-bold text-slate-400">No campaigns found</p>
          <p className="mt-1 text-sm text-slate-600">Create your first campaign to start driving revenue.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} onToggle={handleToggle} />
          ))}
        </div>
      )}
    </div>
  );
}
