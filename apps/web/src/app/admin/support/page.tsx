'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  UserCircleIcon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  PhoneArrowUpRightIcon,
  PhoneArrowDownLeftIcon,
  XMarkIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  SignalIcon,
  MicrophoneIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import { useAuthStore } from '@/store';

// ── Types ─────────────────────────────────────────────────────────────────────

type TicketChannel = 'CHAT' | 'CALL' | 'EMAIL';
type TicketStatus = 'OPEN' | 'PENDING' | 'RESOLVED' | 'CLOSED';
type TicketPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
type MessageSenderType = 'CUSTOMER' | 'AGENT' | 'SYSTEM';
type AgentPresence = 'ONLINE' | 'AWAY' | 'OFFLINE';

interface SupportCustomer {
  id: string;
  displayName: string;
  email?: string;
  phone?: string;
}

interface SupportAgent {
  id: string;
  fullName: string;
  email: string;
  presence: AgentPresence;
  isAvailable: boolean;
}

interface SupportMessage {
  id: string;
  senderType: MessageSenderType;
  senderId: string;
  body: string;
  createdAt: string;
  deliveredAt?: string;
  readAt?: string;
}

interface SupportConversation {
  id: string;
  status: string;
  messages: SupportMessage[];
}

interface SupportTicket {
  id: string;
  subject: string;
  channel: TicketChannel;
  status: TicketStatus;
  priority: TicketPriority;
  customer?: SupportCustomer;
  assignedAgent?: SupportAgent;
  conversation?: SupportConversation;
  createdAt: string;
  updatedAt: string;
}

interface SupportStats {
  openTickets: number;
  pendingTickets: number;
  resolvedToday: number;
  avgQueueWaitSeconds: number;
  onlineAgents: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const CHANNEL_ICONS: Record<TicketChannel, typeof PhoneIcon> = {
  CHAT: ChatBubbleLeftRightIcon,
  CALL: PhoneIcon,
  EMAIL: EnvelopeIcon,
};

const STATUS_COLORS: Record<TicketStatus, string> = {
  OPEN: 'bg-green-100 text-green-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  RESOLVED: 'bg-blue-100 text-blue-800',
  CLOSED: 'bg-gray-100 text-gray-600',
};

const PRIORITY_COLORS: Record<TicketPriority, string> = {
  LOW: 'text-gray-400',
  NORMAL: 'text-blue-500',
  HIGH: 'text-orange-500',
  URGENT: 'text-red-600',
};

const PRESENCE_COLORS: Record<AgentPresence, string> = {
  ONLINE: 'bg-green-400',
  AWAY: 'bg-yellow-400',
  OFFLINE: 'bg-gray-400',
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function fmtSeconds(s: number) {
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: typeof PhoneIcon;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-start gap-3">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs font-medium text-gray-500">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function PresenceDot({ presence }: { presence: AgentPresence }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${PRESENCE_COLORS[presence]}`} />
  );
}

function MessageBubble({ msg, agentId }: { msg: SupportMessage; agentId?: string }) {
  const isAgent = msg.senderType === 'AGENT';
  const isSystem = msg.senderType === 'SYSTEM';

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{msg.body}</span>
      </div>
    );
  }

  return (
    <div className={`flex ${isAgent ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`max-w-xs lg:max-w-sm px-4 py-2 rounded-2xl text-sm shadow-sm ${
          isAgent
            ? 'bg-indigo-600 text-white rounded-br-sm'
            : 'bg-white text-gray-900 border border-gray-100 rounded-bl-sm'
        }`}
      >
        <p className="leading-relaxed">{msg.body}</p>
        <p className={`text-xs mt-1 ${isAgent ? 'text-indigo-200' : 'text-gray-400'}`}>
          {timeAgo(msg.createdAt)}
          {isAgent && msg.readAt && ' · Read'}
        </p>
      </div>
    </div>
  );
}

// ── Voice Widget ──────────────────────────────────────────────────────────────

function VoiceWidget({ ticket, onClose }: { ticket: SupportTicket; onClose: () => void }) {
  const [callState, setCallState] = useState<'idle' | 'connecting' | 'active' | 'ended'>('idle');
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speakerOff, setSpeakerOff] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startCall = useCallback(() => {
    setCallState('connecting');
    // In production: use @twilio/voice-sdk Device.connect()
    setTimeout(() => {
      setCallState('active');
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    }, 1500);
  }, []);

  const endCall = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCallState('ended');
    setTimeout(onClose, 2000);
  }, [onClose]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className="absolute bottom-4 right-4 w-72 bg-gray-900 rounded-2xl shadow-2xl overflow-hidden z-50"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-700 to-indigo-500 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PhoneIcon className="w-4 h-4 text-white" />
          <span className="text-white text-sm font-semibold">Voice Call</span>
        </div>
        <button onClick={onClose} className="text-indigo-200 hover:text-white">
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="p-5 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center mx-auto mb-3">
          <UserCircleIcon className="w-10 h-10 text-gray-400" />
        </div>
        <p className="text-white font-semibold">{ticket.customer?.displayName || 'Unknown'}</p>
        <p className="text-gray-400 text-sm">{ticket.customer?.phone || 'No phone'}</p>

        {callState === 'idle' && (
          <p className="text-gray-500 text-xs mt-2">Ready to call</p>
        )}
        {callState === 'connecting' && (
          <p className="text-yellow-400 text-xs mt-2 animate-pulse">Connecting…</p>
        )}
        {callState === 'active' && (
          <p className="text-green-400 text-xs mt-2 font-mono">{fmtSeconds(duration)}</p>
        )}
        {callState === 'ended' && (
          <p className="text-gray-400 text-xs mt-2">Call ended · {fmtSeconds(duration)}</p>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 mt-5">
          {callState === 'active' && (
            <>
              <button
                onClick={() => setMuted((m) => !m)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  muted ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                <MicrophoneIcon className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={endCall}
                className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-colors shadow-lg"
              >
                <PhoneIcon className="w-6 h-6 text-white rotate-[135deg]" />
              </button>
              <button
                onClick={() => setSpeakerOff((s) => !s)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  speakerOff ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                {speakerOff ? (
                  <SpeakerXMarkIcon className="w-5 h-5 text-white" />
                ) : (
                  <SpeakerWaveIcon className="w-5 h-5 text-white" />
                )}
              </button>
            </>
          )}
          {callState === 'idle' && (
            <button
              onClick={startCall}
              className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition-colors shadow-lg"
            >
              <PhoneIcon className="w-6 h-6 text-white" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Chat Panel ────────────────────────────────────────────────────────────────

function ChatPanel({
  ticket,
  onStatusChange,
}: {
  ticket: SupportTicket;
  onStatusChange: (status: TicketStatus) => void;
}) {
  const { accessToken: token } = useAuthStore();
  const [message, setMessage] = useState('');
  const [showVoice, setShowVoice] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: messagesData, isLoading } = useQuery({
    queryKey: ['support-messages', ticket.id],
    queryFn: async () => {
      const res = await fetch(`/api/support/tickets/${ticket.id}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: async (body: string) => {
      const res = await fetch(`/api/support/tickets/${ticket.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ body, senderType: 'AGENT' }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-messages', ticket.id] });
      setMessage('');
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (status: TicketStatus) => {
      const res = await fetch(`/api/support/tickets/${ticket.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      return res.json();
    },
    onSuccess: (_, status) => {
      onStatusChange(status);
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
    },
  });

  const messages: SupportMessage[] = messagesData?.data || ticket.conversation?.messages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = () => {
    if (!message.trim()) return;
    sendMutation.mutate(message.trim());
  };

  const ChannelIcon = CHANNEL_ICONS[ticket.channel];

  return (
    <div className="flex flex-col h-full relative">
      {/* Chat header */}
      <div className="px-4 py-3 border-b border-gray-100 bg-white flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <ChannelIcon className="w-5 h-5 text-indigo-500" />
          <div>
            <p className="font-semibold text-gray-900 text-sm">{ticket.subject}</p>
            <p className="text-xs text-gray-500">
              {ticket.customer?.displayName || 'Unknown customer'} · #{ticket.id.slice(-8)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[ticket.status]}`}>
            {ticket.status}
          </span>
          {ticket.channel !== 'EMAIL' && (
            <button
              onClick={() => setShowVoice((v) => !v)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-indigo-600 transition-colors"
              title="Voice call"
            >
              <PhoneIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-1">
        {isLoading ? (
          <div className="flex justify-center pt-8">
            <ArrowPathIcon className="w-6 h-6 text-gray-300 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <ChatBubbleLeftRightIcon className="w-12 h-12 mb-2 opacity-30" />
            <p className="text-sm">No messages yet</p>
          </div>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick replies */}
      <div className="px-3 py-2 border-t border-gray-100 bg-white flex gap-2 overflow-x-auto flex-shrink-0">
        {['Thanks for reaching out!', 'Let me check on that.', 'Issue resolved!'].map((r) => (
          <button
            key={r}
            onClick={() => setMessage(r)}
            className="whitespace-nowrap text-xs px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors flex-shrink-0"
          >
            {r}
          </button>
        ))}
      </div>

      {/* Composer */}
      <div className="px-3 py-2 bg-white border-t border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Type a reply…"
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || sendMutation.isPending}
            className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 transition-colors"
          >
            <PaperAirplaneIcon className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Action bar */}
      <div className="px-3 py-2 bg-white border-t border-gray-100 flex gap-2 flex-shrink-0">
        {ticket.status === 'OPEN' && (
          <button
            onClick={() => statusMutation.mutate('PENDING')}
            disabled={statusMutation.isPending}
            className="flex-1 text-xs py-1.5 rounded-lg bg-yellow-50 text-yellow-700 hover:bg-yellow-100 font-medium transition-colors"
          >
            Set Pending
          </button>
        )}
        {ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED' && (
          <button
            onClick={() => statusMutation.mutate('RESOLVED')}
            disabled={statusMutation.isPending}
            className="flex-1 text-xs py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 font-medium transition-colors flex items-center justify-center gap-1"
          >
            <CheckCircleIcon className="w-3.5 h-3.5" />
            Resolve
          </button>
        )}
        {ticket.status === 'RESOLVED' && (
          <button
            onClick={() => statusMutation.mutate('CLOSED')}
            disabled={statusMutation.isPending}
            className="flex-1 text-xs py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium transition-colors"
          >
            Close Ticket
          </button>
        )}
      </div>

      {/* Voice overlay */}
      <AnimatePresence>
        {showVoice && (
          <VoiceWidget ticket={ticket} onClose={() => setShowVoice(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Customer Info Panel ───────────────────────────────────────────────────────

function CustomerPanel({ ticket }: { ticket: SupportTicket }) {
  const customer = ticket.customer;

  return (
    <div className="p-4 space-y-5 overflow-y-auto h-full">
      {/* Avatar */}
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mb-2">
          <UserCircleIcon className="w-10 h-10 text-indigo-400" />
        </div>
        <p className="font-semibold text-gray-900">{customer?.displayName || 'Unknown'}</p>
        {customer?.email && <p className="text-xs text-gray-500">{customer.email}</p>}
        {customer?.phone && <p className="text-xs text-gray-500">{customer.phone}</p>}
      </div>

      {/* Ticket info */}
      <div className="bg-gray-50 rounded-xl p-3 space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-500">Ticket ID</span>
          <span className="font-mono text-gray-700">#{ticket.id.slice(-8).toUpperCase()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Channel</span>
          <span className="font-medium text-gray-700">{ticket.channel}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Priority</span>
          <span className={`font-semibold ${PRIORITY_COLORS[ticket.priority]}`}>{ticket.priority}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Opened</span>
          <span className="text-gray-700">{timeAgo(ticket.createdAt)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Updated</span>
          <span className="text-gray-700">{timeAgo(ticket.updatedAt)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Assigned</span>
          <span className="text-gray-700">{ticket.assignedAgent?.fullName || '—'}</span>
        </div>
      </div>

      {/* Quick actions */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Quick Actions</p>
        <button className="w-full flex items-center gap-2 text-left px-3 py-2 rounded-lg bg-white border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 text-sm text-gray-700 transition-colors">
          <PhoneArrowUpRightIcon className="w-4 h-4 text-indigo-400" />
          Call customer
        </button>
        <button className="w-full flex items-center gap-2 text-left px-3 py-2 rounded-lg bg-white border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 text-sm text-gray-700 transition-colors">
          <EnvelopeIcon className="w-4 h-4 text-indigo-400" />
          Send email
        </button>
        <button className="w-full flex items-center gap-2 text-left px-3 py-2 rounded-lg bg-white border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 text-sm text-gray-700 transition-colors">
          <PhoneArrowDownLeftIcon className="w-4 h-4 text-indigo-400" />
          View call logs
        </button>
      </div>
    </div>
  );
}

// ── New Ticket Modal ──────────────────────────────────────────────────────────

function NewTicketModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (ticket: SupportTicket) => void;
}) {
  const { accessToken: token } = useAuthStore();
  const [form, setForm] = useState({
    subject: '',
    channel: 'CHAT' as TicketChannel,
    priority: 'NORMAL' as TicketPriority,
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    body: '',
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        onCreated(data.data);
        onClose();
      }
    },
  });

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">New Support Ticket</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Subject *</label>
            <input
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="What's the issue?"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Channel</label>
              <select
                value={form.channel}
                onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value as TicketChannel }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="CHAT">Chat</option>
                <option value="CALL">Phone</option>
                <option value="EMAIL">Email</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as TicketPriority }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Customer Name</label>
            <input
              value={form.customerName}
              onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Full name"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input
                value={form.customerEmail}
                onChange={(e) => setForm((f) => ({ ...f, customerEmail: e.target.value }))}
                type="email"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
              <input
                value={form.customerPhone}
                onChange={(e) => setForm((f) => ({ ...f, customerPhone: e.target.value }))}
                type="tel"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="+1 555 000 0000"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Initial Message</label>
            <textarea
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Describe the issue…"
            />
          </div>
        </div>

        <div className="p-5 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!form.subject.trim() || mutation.isPending}
            className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {mutation.isPending ? 'Creating…' : 'Create Ticket'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SupportPage() {
  const { accessToken: token } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'ALL'>('ALL');
  const [showNewTicket, setShowNewTicket] = useState(false);

  // Poll for tickets
  const { data: ticketsData, isLoading } = useQuery({
    queryKey: ['support-tickets', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      const res = await fetch(`/api/support/tickets?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    refetchInterval: 10000,
  });

  const { data: statsData } = useQuery({
    queryKey: ['support-stats'],
    queryFn: async () => {
      const res = await fetch('/api/support/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    refetchInterval: 15000,
  });

  const { data: agentsData } = useQuery({
    queryKey: ['support-agents'],
    queryFn: async () => {
      const res = await fetch('/api/support/agents', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
  });

  const tickets: SupportTicket[] = (ticketsData?.data || []).filter((t: SupportTicket) =>
    search
      ? t.subject.toLowerCase().includes(search.toLowerCase()) ||
        t.customer?.displayName.toLowerCase().includes(search.toLowerCase()) ||
        t.customer?.email?.toLowerCase().includes(search.toLowerCase())
      : true,
  );

  const stats: SupportStats | undefined = statsData?.data;
  const agents: SupportAgent[] = agentsData?.data || [];

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-xl">
            <ChatBubbleLeftRightIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Support Center</h1>
            <p className="text-xs text-gray-500">Live chat · Voice · Email</p>
          </div>
          <div className="flex items-center gap-1 ml-4 px-2 py-0.5 bg-green-50 rounded-full">
            <SignalIcon className="w-3 h-3 text-green-600" />
            <span className="text-xs font-medium text-green-700">Live</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Agent avatars */}
          <div className="flex items-center gap-1">
            {agents.slice(0, 4).map((agent) => (
              <div key={agent.id} className="relative" title={`${agent.fullName} · ${agent.presence}`}>
                <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                  {agent.fullName.charAt(0)}
                </div>
                <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${PRESENCE_COLORS[agent.presence]}`} />
              </div>
            ))}
            {agents.length > 4 && (
              <span className="text-xs text-gray-500 ml-1">+{agents.length - 4}</span>
            )}
          </div>

          <button
            onClick={() => setShowNewTicket(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            + New Ticket
          </button>
        </div>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="px-6 py-3 grid grid-cols-5 gap-3 flex-shrink-0">
          <StatCard label="Open Tickets" value={stats.openTickets} icon={ExclamationTriangleIcon} color="bg-red-500" />
          <StatCard label="Pending" value={stats.pendingTickets} icon={ClockIcon} color="bg-yellow-500" />
          <StatCard label="Resolved Today" value={stats.resolvedToday} icon={CheckCircleSolid} color="bg-green-500" />
          <StatCard
            label="Avg Wait"
            value={fmtSeconds(stats.avgQueueWaitSeconds)}
            icon={SignalIcon}
            color="bg-blue-500"
          />
          <StatCard label="Online Agents" value={stats.onlineAgents} icon={UserCircleIcon} color="bg-indigo-500" />
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 min-h-0 gap-0">
        {/* Left: Ticket Queue */}
        <div className="w-80 bg-white border-r border-gray-100 flex flex-col flex-shrink-0">
          {/* Search + filters */}
          <div className="p-3 border-b border-gray-100 space-y-2">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tickets…"
                className="w-full pl-9 pr-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-500 border border-transparent focus:border-indigo-300"
              />
            </div>
            <div className="flex gap-1 overflow-x-auto">
              {(['ALL', 'OPEN', 'PENDING', 'RESOLVED', 'CLOSED'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    statusFilter === s
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Ticket list */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center pt-10">
                <ArrowPathIcon className="w-6 h-6 text-gray-300 animate-spin" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 px-6">
                <CheckCircleIcon className="w-12 h-12 mb-2 opacity-30" />
                <p className="text-sm text-center">No tickets match your filters</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {tickets.map((ticket) => {
                  const ChannelIcon = CHANNEL_ICONS[ticket.channel];
                  const isSelected = selectedTicket?.id === ticket.id;
                  return (
                    <button
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                        isSelected ? 'bg-indigo-50 border-r-2 border-indigo-600' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`p-1.5 rounded-lg mt-0.5 flex-shrink-0 ${isSelected ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                          <ChannelIcon className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-600' : 'text-gray-500'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{ticket.subject}</p>
                            <span className={`text-xs font-semibold flex-shrink-0 ${PRIORITY_COLORS[ticket.priority]}`}>
                              {ticket.priority === 'URGENT' ? '!!!' : ticket.priority === 'HIGH' ? '!' : ''}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 truncate">
                            {ticket.customer?.displayName || 'Unknown customer'}
                          </p>
                          <div className="flex items-center justify-between mt-1">
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[ticket.status]}`}>
                              {ticket.status}
                            </span>
                            <span className="text-xs text-gray-400">{timeAgo(ticket.updatedAt)}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Center: Chat */}
        <div className="flex-1 flex flex-col min-w-0">
          <AnimatePresence mode="wait">
            {selectedTicket ? (
              <motion.div
                key={selectedTicket.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col min-h-0"
              >
                <ChatPanel
                  ticket={selectedTicket}
                  onStatusChange={(status) => {
                    setSelectedTicket((t) => (t ? { ...t, status } : t));
                    queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
                  }}
                />
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 flex flex-col items-center justify-center text-gray-400"
              >
                <ChatBubbleLeftRightIcon className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-lg font-medium text-gray-500">Select a ticket to start</p>
                <p className="text-sm">Choose from the queue on the left</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Customer Info */}
        {selectedTicket && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-64 bg-white border-l border-gray-100 flex-shrink-0"
          >
            <CustomerPanel ticket={selectedTicket} />
          </motion.div>
        )}
      </div>

      {/* New Ticket Modal */}
      <AnimatePresence>
        {showNewTicket && (
          <NewTicketModal
            onClose={() => setShowNewTicket(false)}
            onCreated={(ticket) => {
              setSelectedTicket(ticket);
              queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
              queryClient.invalidateQueries({ queryKey: ['support-stats'] });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
