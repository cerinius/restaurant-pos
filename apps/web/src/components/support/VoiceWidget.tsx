'use client';

/**
 * Browser softphone widget powered by @twilio/voice-sdk.
 * Place <VoiceWidget /> in the agent dashboard to enable browser calling.
 *
 * Requires:
 *   - TWILIO_ACCOUNT_SID, TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET, TWILIO_TWIML_APP_SID
 *     configured in the API env.
 *   - npm install @twilio/voice-sdk  (in apps/web)
 *
 * The component lazy-imports the SDK so it doesn't break SSR.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PhoneIcon,
  PhoneArrowDownLeftIcon,
  PhoneArrowUpRightIcon,
  XMarkIcon,
  MicrophoneIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  SignalIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '@/store';

// ── Types ─────────────────────────────────────────────────────────────────────

type SoftphoneState =
  | 'loading'
  | 'ready'
  | 'incoming'
  | 'connecting'
  | 'active'
  | 'ended'
  | 'error';

type DeviceState = 'registering' | 'registered' | 'unregistered' | 'error';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtSecs(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// ── Widget ────────────────────────────────────────────────────────────────────

interface VoiceWidgetProps {
  /** If provided, auto-fills the dial target */
  defaultTo?: string;
  /** Called when a call is connected so parent can log ticket association */
  onCallStarted?: (callSid: string, to: string) => void;
  /** Called when a call ends */
  onCallEnded?: (duration: number) => void;
}

export default function VoiceWidget({ defaultTo, onCallStarted, onCallEnded }: VoiceWidgetProps) {
  const { accessToken: token } = useAuthStore();
  const [deviceState, setDeviceState] = useState<DeviceState>('unregistered');
  const [callState, setCallState] = useState<SoftphoneState>('loading');
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speakerOff, setSpeakerOff] = useState(false);
  const [dialTarget, setDialTarget] = useState(defaultTo || '');
  const [incomingFrom, setIncomingFrom] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const deviceRef = useRef<any>(null);
  const callRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startTimer = useCallback(() => {
    setDuration(0);
    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  // ── Bootstrap Twilio Device ───────────────────────────────────────────────

  const initDevice = useCallback(async () => {
    if (!token) return;
    setCallState('loading');
    setErrorMsg(null);

    try {
      // Fetch token from our API
      const res = await fetch('/api/support/twilio/voice-token', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to get voice token');

      // Lazy import — avoids SSR issues. @twilio/voice-sdk is an optional peer dep;
      // run `npm install @twilio/voice-sdk` in apps/web to enable voice calls.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const twilioSDK: any = await (import('@twilio/voice-sdk' as any) as Promise<any>).catch(() => {
        throw new Error('@twilio/voice-sdk not installed. Run: npm install @twilio/voice-sdk in apps/web');
      });
      const { Device } = twilioSDK;

      const device = new Device(data.data.token, {
        logLevel: 1,
        codecPreferences: ['opus', 'pcmu'] as any,
      });

      device.on('registered', () => {
        setDeviceState('registered');
        setCallState('ready');
      });

      device.on('error', (err: any) => {
        setDeviceState('error');
        setCallState('error');
        setErrorMsg(err.message || 'Device error');
      });

      device.on('incoming', (call: any) => {
        callRef.current = call;
        setIncomingFrom(call.parameters.From || 'Unknown');
        setCallState('incoming');

        call.on('accept', () => {
          setCallState('active');
          startTimer();
          onCallStarted?.(call.parameters.CallSid, call.parameters.From);
        });

        call.on('disconnect', () => {
          const dur = timerRef.current ? duration : 0;
          stopTimer();
          setCallState('ended');
          onCallEnded?.(dur);
          setTimeout(() => setCallState('ready'), 3000);
        });

        call.on('cancel', () => {
          setCallState('ready');
          setIncomingFrom(null);
        });
      });

      await device.register();
      deviceRef.current = device;
    } catch (err: any) {
      setDeviceState('error');
      setCallState('error');
      setErrorMsg(err.message || 'Failed to initialise voice');
    }
  }, [token, startTimer, stopTimer, onCallStarted, onCallEnded, duration]);

  useEffect(() => {
    if (token) initDevice();
    return () => {
      stopTimer();
      deviceRef.current?.destroy();
    };
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Call actions ──────────────────────────────────────────────────────────

  const makeCall = useCallback(async () => {
    if (!deviceRef.current || !dialTarget.trim()) return;
    setCallState('connecting');
    try {
      const call = await deviceRef.current.connect({
        params: { To: dialTarget.trim() },
      });
      callRef.current = call;

      call.on('accept', () => {
        setCallState('active');
        startTimer();
        onCallStarted?.(call.parameters.CallSid || '', dialTarget);
      });

      call.on('disconnect', () => {
        const dur = duration;
        stopTimer();
        setCallState('ended');
        onCallEnded?.(dur);
        setTimeout(() => setCallState('ready'), 3000);
      });

      call.on('error', (err: any) => {
        stopTimer();
        setCallState('error');
        setErrorMsg(err.message);
      });
    } catch (err: any) {
      setCallState('error');
      setErrorMsg(err.message || 'Failed to connect call');
    }
  }, [dialTarget, startTimer, stopTimer, onCallStarted, onCallEnded, duration]);

  const acceptCall = useCallback(() => {
    callRef.current?.accept();
  }, []);

  const rejectCall = useCallback(() => {
    callRef.current?.reject();
    setCallState('ready');
    setIncomingFrom(null);
  }, []);

  const hangUp = useCallback(() => {
    callRef.current?.disconnect();
    deviceRef.current?.disconnectAll();
    stopTimer();
    const dur = duration;
    setCallState('ended');
    onCallEnded?.(dur);
    setTimeout(() => setCallState('ready'), 3000);
  }, [stopTimer, onCallEnded, duration]);

  const toggleMute = useCallback(() => {
    if (!callRef.current) return;
    const next = !muted;
    callRef.current.mute(next);
    setMuted(next);
  }, [muted]);

  // ── Device status indicator ────────────────────────────────────────────────

  const statusDot =
    deviceState === 'registered'
      ? 'bg-green-400'
      : deviceState === 'registering'
      ? 'bg-yellow-400 animate-pulse'
      : 'bg-red-400';

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="relative">
      {/* Compact toggle button */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm ${
          callState === 'active'
            ? 'bg-green-600 text-white'
            : callState === 'incoming'
            ? 'bg-yellow-500 text-white animate-pulse'
            : 'bg-white border border-gray-200 text-gray-700 hover:border-indigo-300'
        }`}
      >
        <span className={`w-2 h-2 rounded-full ${statusDot}`} />
        <PhoneIcon className="w-4 h-4" />
        <span>
          {callState === 'active'
            ? fmtSecs(duration)
            : callState === 'incoming'
            ? 'Incoming…'
            : callState === 'loading'
            ? 'Loading…'
            : callState === 'error'
            ? 'Error'
            : 'Softphone'}
        </span>
      </button>

      {/* Expanded panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className="absolute top-12 right-0 w-72 bg-gray-900 rounded-2xl shadow-2xl overflow-hidden z-50"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-700 to-indigo-500 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PhoneIcon className="w-4 h-4 text-white" />
                <span className="text-white text-sm font-semibold">Softphone</span>
                <span className={`w-2 h-2 rounded-full ${statusDot}`} />
              </div>
              <button onClick={() => setExpanded(false)} className="text-indigo-200 hover:text-white">
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4">
              {/* Error state */}
              {callState === 'error' && (
                <div className="bg-red-900/30 border border-red-700 rounded-xl p-3 mb-3 flex items-start gap-2">
                  <ExclamationCircleIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-300 text-xs font-semibold">Voice Error</p>
                    <p className="text-red-400 text-xs mt-0.5">{errorMsg}</p>
                    <button
                      onClick={initDevice}
                      className="mt-2 text-xs text-indigo-300 hover:text-indigo-200 underline"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}

              {/* Loading */}
              {callState === 'loading' && (
                <div className="flex flex-col items-center py-6 gap-3">
                  <SignalIcon className="w-8 h-8 text-indigo-400 animate-pulse" />
                  <p className="text-gray-400 text-sm">Initialising device…</p>
                </div>
              )}

              {/* Dial pad (ready state) */}
              {(callState === 'ready' || callState === 'connecting') && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 bg-gray-800 rounded-xl px-3 py-2">
                    <PhoneArrowUpRightIcon className="w-4 h-4 text-gray-500" />
                    <input
                      value={dialTarget}
                      onChange={(e) => setDialTarget(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && makeCall()}
                      placeholder="+1 555 000 0000"
                      className="flex-1 bg-transparent text-white text-sm outline-none placeholder-gray-500 font-mono"
                    />
                    {dialTarget && (
                      <button onClick={() => setDialTarget('')} className="text-gray-500 hover:text-gray-300">
                        <XMarkIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Digit grid */}
                  <div className="grid grid-cols-3 gap-2">
                    {['1','2','3','4','5','6','7','8','9','*','0','#'].map((d) => (
                      <button
                        key={d}
                        onClick={() => setDialTarget((t) => t + d)}
                        className="py-2.5 bg-gray-800 hover:bg-gray-700 text-white text-sm font-semibold rounded-xl transition-colors"
                      >
                        {d}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={makeCall}
                    disabled={!dialTarget.trim() || callState === 'connecting'}
                    className="w-full py-3 bg-green-500 hover:bg-green-600 disabled:opacity-40 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg"
                  >
                    {callState === 'connecting' ? (
                      <>
                        <SignalIcon className="w-4 h-4 animate-pulse" />
                        Connecting…
                      </>
                    ) : (
                      <>
                        <PhoneIcon className="w-4 h-4" />
                        Call
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Incoming call */}
              {callState === 'incoming' && (
                <div className="flex flex-col items-center py-4 gap-4">
                  <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center animate-pulse">
                    <PhoneArrowDownLeftIcon className="w-8 h-8 text-yellow-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-white font-semibold">Incoming Call</p>
                    <p className="text-gray-400 text-sm font-mono">{incomingFrom}</p>
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={rejectCall}
                      className="w-14 h-14 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center transition-colors shadow-lg"
                    >
                      <PhoneIcon className="w-6 h-6 text-white rotate-[135deg]" />
                    </button>
                    <button
                      onClick={acceptCall}
                      className="w-14 h-14 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center transition-colors shadow-lg"
                    >
                      <PhoneIcon className="w-6 h-6 text-white" />
                    </button>
                  </div>
                </div>
              )}

              {/* Active call */}
              {callState === 'active' && (
                <div className="flex flex-col items-center py-4 gap-4">
                  <div className="relative w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center">
                    <PhoneIcon className="w-8 h-8 text-green-400" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-ping opacity-75" />
                  </div>
                  <div className="text-center">
                    <p className="text-green-400 font-mono text-xl font-bold">{fmtSecs(duration)}</p>
                    <p className="text-gray-400 text-xs mt-1">{dialTarget || incomingFrom || 'Connected'}</p>
                  </div>

                  <div className="flex items-center gap-4">
                    <button
                      onClick={toggleMute}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                        muted ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                      title={muted ? 'Unmute' : 'Mute'}
                    >
                      <MicrophoneIcon className="w-5 h-5 text-white" />
                    </button>
                    <button
                      onClick={hangUp}
                      className="w-14 h-14 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center transition-colors shadow-lg"
                    >
                      <PhoneIcon className="w-6 h-6 text-white rotate-[135deg]" />
                    </button>
                    <button
                      onClick={() => setSpeakerOff((s) => !s)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                        speakerOff ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                      title={speakerOff ? 'Speaker on' : 'Speaker off'}
                    >
                      {speakerOff ? (
                        <SpeakerXMarkIcon className="w-5 h-5 text-white" />
                      ) : (
                        <SpeakerWaveIcon className="w-5 h-5 text-white" />
                      )}
                    </button>
                  </div>

                  {muted && (
                    <p className="text-red-400 text-xs">Muted — caller cannot hear you</p>
                  )}
                </div>
              )}

              {/* Call ended */}
              {callState === 'ended' && (
                <div className="flex flex-col items-center py-6 gap-2">
                  <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center">
                    <PhoneIcon className="w-6 h-6 text-gray-400 rotate-[135deg]" />
                  </div>
                  <p className="text-gray-300 font-semibold">Call ended</p>
                  <p className="text-gray-500 text-sm font-mono">{fmtSecs(duration)}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
