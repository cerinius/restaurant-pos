'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import api from '@/lib/api';
import { getSaasAdminToken, setSaasAdminSession } from '@/lib/saas-auth';

export default function SaasAdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getSaasAdminToken()) {
      router.replace('/admin');
    }
  }, [router]);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const result = await api.saasAdminLogin(email, password);
      setSaasAdminSession(result.data.accessToken);
      toast.success('SaaS admin session ready');
      router.replace('/admin');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Could not sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_28%),linear-gradient(180deg,#020617_0%,#0f172a_50%,#020617_100%)] px-6 py-8 text-slate-100">
      <div className="w-full max-w-md rounded-[32px] border border-white/10 bg-slate-950/80 p-8 shadow-[0_30px_100px_rgba(2,6,23,0.55)]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">SaaS owner access</p>
        <h1 className="mt-3 text-3xl font-black text-white">Sign into the control plane</h1>
        <p className="mt-3 text-sm leading-7 text-slate-400">
          This login is separate from restaurant ownership. It is only for the platform operator
          managing all restaurants in the SaaS.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Configure `SAAS_ADMIN_EMAIL` and `SAAS_ADMIN_PASSWORD` on the API before using this in
          production.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="label">Email</label>
            <input value={email} onChange={(event) => setEmail(event.target.value)} className="input w-full" />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="input w-full"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handleLogin();
                }
              }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogin}
          disabled={loading}
          className="mt-6 w-full rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Enter SaaS admin'}
        </button>

        <div className="mt-5 flex items-center justify-between text-sm text-slate-500">
          <Link href="/" className="hover:text-slate-300">
            Back to site
          </Link>
          <Link href="/login" className="hover:text-slate-300">
            Restaurant owner login
          </Link>
        </div>
      </div>
    </main>
  );
}
