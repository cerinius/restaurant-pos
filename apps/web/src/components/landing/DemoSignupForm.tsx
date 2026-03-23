'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import api from '@/lib/api';
import { resolveRestaurantHomePath } from '@/lib/paths';
import { useAuthStore } from '@/store';

const INITIAL_FORM = {
  contactName: '',
  restaurantName: '',
  locationName: '',
  email: '',
  phone: '',
  password: '',
  seats: 40,
  locationsPlanned: 1,
  serviceMode: 'FULL_SERVICE',
};

const SERVICE_MODES = [
  { id: 'FULL_SERVICE', label: 'Full service' },
  { id: 'QUICK_SERVICE', label: 'Quick service' },
  { id: 'BAR', label: 'Bar' },
  { id: 'FOOD_TRUCK', label: 'Food truck' },
];

export function DemoSignupForm() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState(INITIAL_FORM);
  const [verificationId, setVerificationId] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpPreview, setOtpPreview] = useState<string | null>(null);

  const requestOtpMutation = useMutation({
    mutationFn: (payload: typeof INITIAL_FORM) => api.requestDemoOtp(payload),
    onSuccess: (result) => {
      setVerificationId(result.data.verificationId);
      setOtpPreview(result.data.otpPreview || null);
      toast.success('Verification code sent');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Could not send verification code');
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: () => api.verifyDemoOtp({ verificationId, code: otpCode }),
    onSuccess: (result) => {
      setAuth(result.data.user, result.data.accessToken, result.data.refreshToken);
      toast.success('Demo environment is ready');
      router.push(resolveRestaurantHomePath(result.data.user));
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Verification failed');
    },
  });

  const updateField = (field: keyof typeof INITIAL_FORM, value: string | number) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  return (
    <div className="glass-panel p-7 shadow-2xl shadow-black/20">
      {!verificationId ? (
        <>
          <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="section-kicker">Step 1 of 2</p>
              <h2 className="mt-2 text-2xl font-black text-slate-50">Create your live trial</h2>
              <p className="mt-2 text-sm leading-7 text-slate-400">
                We will create a real owner account, tenant-scoped URLs, seeded sample data, and a working environment you can explore immediately.
              </p>
            </div>
            <div className="status-chip">OTP verified</div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label">Your name</label>
              <input value={form.contactName} onChange={(event) => updateField('contactName', event.target.value)} className="input w-full" />
            </div>
            <div>
              <label className="label">Restaurant name</label>
              <input value={form.restaurantName} onChange={(event) => updateField('restaurantName', event.target.value)} className="input w-full" />
            </div>
            <div>
              <label className="label">Primary location</label>
              <input value={form.locationName} onChange={(event) => updateField('locationName', event.target.value)} className="input w-full" />
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
              <label className="label">Password or PIN</label>
              <input type="password" value={form.password} onChange={(event) => updateField('password', event.target.value)} className="input w-full" />
            </div>
            <div>
              <label className="label">Seat count</label>
              <input type="number" min="1" value={form.seats} onChange={(event) => updateField('seats', Number(event.target.value))} className="input w-full" />
            </div>
            <div>
              <label className="label">Locations planned</label>
              <input type="number" min="1" value={form.locationsPlanned} onChange={(event) => updateField('locationsPlanned', Number(event.target.value))} className="input w-full" />
            </div>
          </div>

          <div className="mt-6">
            <label className="label">Service model</label>
            <div className="grid gap-2 sm:grid-cols-4">
              {SERVICE_MODES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => updateField('serviceMode', option.id)}
                  className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                    form.serviceMode === option.id
                      ? 'border-cyan-300/30 bg-cyan-300 text-slate-950'
                      : 'border-white/10 bg-white/5 text-slate-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-xs leading-6 text-slate-500">
              We verify email and phone first to reduce fake signups and keep the live demo environment clean.
            </p>
            <button
              type="button"
              onClick={() => requestOtpMutation.mutate(form)}
              disabled={requestOtpMutation.isPending}
              className="btn-primary px-5"
            >
              {requestOtpMutation.isPending ? 'Sending code...' : 'Send verification code'}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="section-kicker">Step 2 of 2</p>
              <h2 className="mt-2 text-2xl font-black text-slate-50">Verify ownership</h2>
              <p className="mt-2 text-sm leading-7 text-slate-400">
                As soon as the code is confirmed, we create your restaurant and sign you directly into the owner workspace.
              </p>
            </div>
            <div className="status-chip">Live tenant provisioning</div>
          </div>

          <div>
            <label className="label">Verification code</label>
            <input
              value={otpCode}
              onChange={(event) => setOtpCode(event.target.value)}
              className="input w-full text-center text-2xl tracking-[0.4em]"
              placeholder="123456"
              maxLength={6}
            />
          </div>

          {otpPreview && (
            <div className="mt-4 rounded-[22px] border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
              Local preview code: <span className="font-black">{otpPreview}</span>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => setVerificationId('')} className="btn-secondary flex-1">
              Back
            </button>
            <button
              type="button"
              onClick={() => verifyOtpMutation.mutate()}
              disabled={verifyOtpMutation.isPending || otpCode.trim().length < 6}
              className="btn-primary flex-1"
            >
              {verifyOtpMutation.isPending ? 'Creating demo...' : 'Create my live demo'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
