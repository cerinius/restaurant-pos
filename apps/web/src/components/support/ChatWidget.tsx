'use client';

/**
 * Customer-facing live chat widget.
 * Drop <ChatWidget restaurantId="..." /> anywhere in the POS customer UI or public site.
 * Connects to the support ticket API and polls for new messages every 5 s.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  ArrowPathIcon,
  MinusIcon,
} from '@heroicons/react/24/outline';

// ── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  senderType: 'CUSTOMER' | 'AGENT' | 'SYSTEM';
  body: string;
  createdAt: string;
}

type WidgetState = 'closed' | 'intro' | 'chatting';

// ── Config ───────────────────────────────────────────────────────────────────

const POLL_INTERVAL = 5000;

// ── Widget ───────────────────────────────────────────────────────────────────

interface ChatWidgetProps {
  restaurantId: string;
  /** Override the accent color (Tailwind class, e.g. 'indigo') */
  accentColor?: string;
  /** Display name shown in the widget header */
  restaurantName?: string;
}

export default function ChatWidget({
  restaurantId,
  restaurantName = 'Support',
}: ChatWidgetProps) {
  const [state, setState] = useState<WidgetState>('closed');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [initialMsg, setInitialMsg] = useState('');
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const [minimised, setMinimised] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const lastMsgCount = useRef(0);

  // Auto-scroll
  useEffect(() => {
    if (!minimised) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, minimised]);

  // Polling for new messages
  const fetchMessages = useCallback(async () => {
    if (!ticketId) return;
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}/messages`);
      const data = await res.json();
      if (data.success) {
        const msgs: Message[] = data.data || [];
        if (msgs.length > lastMsgCount.current) {
          const newCount = msgs.length - lastMsgCount.current;
          if (minimised || state !== 'chatting') setUnread((u) => u + newCount);
        }
        lastMsgCount.current = msgs.length;
        setMessages(msgs);
      }
    } catch {
      // Silently fail — polling will retry
    }
  }, [ticketId, minimised, state]);

  useEffect(() => {
    if (ticketId && state === 'chatting') {
      fetchMessages();
      pollRef.current = setInterval(fetchMessages, POLL_INTERVAL);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [ticketId, state, fetchMessages]);

  // Clear unread when opened
  useEffect(() => {
    if (!minimised && state === 'chatting') setUnread(0);
  }, [minimised, state]);

  const startConversation = async () => {
    if (!name.trim() || !subject.trim() || !initialMsg.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId,
          subject: subject.trim(),
          channel: 'CHAT',
          customerName: name.trim(),
          customerEmail: email.trim() || undefined,
          body: initialMsg.trim(),
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to start chat');
      const ticket = data.data;
      setTicketId(ticket.id);
      setConversationId(ticket.conversation?.id || null);
      const initialMessages: Message[] = ticket.conversation?.messages || [];
      setMessages(initialMessages);
      lastMsgCount.current = initialMessages.length;
      setState('chatting');
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !ticketId) return;
    const body = message.trim();
    setMessage('');
    setIsSending(true);
    // Optimistic update
    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      senderType: 'CUSTOMER',
      body,
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    lastMsgCount.current += 1;
    try {
      await fetch(`/api/support/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body, senderType: 'CUSTOMER', clientMessageId: optimistic.id }),
      });
      // Will be reconciled on next poll
    } catch {
      // Keep optimistic — don't remove, it'll show on next poll
    } finally {
      setIsSending(false);
    }
  };

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col items-end gap-3">
      {/* Main window */}
      <AnimatePresence>
        {state !== 'closed' && (
          <motion.div
            key="window"
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="w-80 bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col"
            style={{ maxHeight: minimised ? 56 : 520 }}
          >
            {/* Header */}
            <div className="bg-indigo-600 px-4 py-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <ChatBubbleLeftRightIcon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm leading-none">{restaurantName}</p>
                  <p className="text-indigo-200 text-xs">Support Chat</p>
                </div>
                <span className="ml-2 w-2 h-2 bg-green-400 rounded-full" />
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setMinimised((m) => !m)}
                  className="p-1 rounded hover:bg-white/20 text-white transition-colors"
                >
                  <MinusIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setState('closed'); setMinimised(false); }}
                  className="p-1 rounded hover:bg-white/20 text-white transition-colors"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {!minimised && (
              <>
                {/* Intro form */}
                {state === 'intro' && (
                  <div className="p-4 flex flex-col gap-3 overflow-y-auto flex-1">
                    <p className="text-sm text-gray-600">
                      Hi there! Fill in your details below and we'll connect you with an agent.
                    </p>

                    {error && (
                      <div className="bg-red-50 text-red-700 text-xs p-2 rounded-lg">{error}</div>
                    )}

                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name *"
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      placeholder="Email (optional)"
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="How can we help? *"
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <textarea
                      value={initialMsg}
                      onChange={(e) => setInitialMsg(e.target.value)}
                      rows={3}
                      placeholder="Tell us more… *"
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    />
                    <button
                      onClick={startConversation}
                      disabled={isLoading}
                      className="py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <ArrowPathIcon className="w-4 h-4 animate-spin" />
                          Starting…
                        </>
                      ) : (
                        'Start Chat'
                      )}
                    </button>
                  </div>
                )}

                {/* Chat view */}
                {state === 'chatting' && (
                  <>
                    <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-2">
                      {messages.map((msg) => {
                        const isCustomer = msg.senderType === 'CUSTOMER';
                        const isSystem = msg.senderType === 'SYSTEM';
                        if (isSystem) {
                          return (
                            <div key={msg.id} className="flex justify-center">
                              <span className="text-xs text-gray-400 bg-white px-3 py-1 rounded-full border border-gray-100">
                                {msg.body}
                              </span>
                            </div>
                          );
                        }
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}
                          >
                            {!isCustomer && (
                              <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                                <span className="text-xs font-bold text-indigo-600">A</span>
                              </div>
                            )}
                            <div
                              className={`max-w-[200px] px-3 py-2 rounded-2xl text-sm shadow-sm ${
                                isCustomer
                                  ? 'bg-indigo-600 text-white rounded-br-sm'
                                  : 'bg-white text-gray-900 border border-gray-100 rounded-bl-sm'
                              }`}
                            >
                              <p>{msg.body}</p>
                              <p
                                className={`text-xs mt-1 ${
                                  isCustomer ? 'text-indigo-200' : 'text-gray-400'
                                }`}
                              >
                                {timeAgo(msg.createdAt)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Composer */}
                    <div className="p-3 bg-white border-t border-gray-100 flex items-center gap-2">
                      <input
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                        placeholder="Type a message…"
                        className="flex-1 text-sm bg-gray-50 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 border border-transparent"
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!message.trim() || isSending}
                        className="p-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-40 transition-colors"
                      >
                        <PaperAirplaneIcon className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          if (state === 'closed') {
            setState('intro');
            setMinimised(false);
          } else {
            setMinimised((m) => !m);
            setUnread(0);
          }
        }}
        className="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 rounded-full shadow-xl flex items-center justify-center transition-colors relative"
      >
        <AnimatePresence mode="wait">
          {state === 'closed' || minimised ? (
            <motion.div key="open" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <ChatBubbleLeftRightIcon className="w-6 h-6 text-white" />
            </motion.div>
          ) : (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <XMarkIcon className="w-6 h-6 text-white" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Unread badge */}
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
            >
              {unread > 9 ? '9+' : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
