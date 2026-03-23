'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import api from '@/lib/api';
import { resolveRestaurantHomePath } from '@/lib/paths';
import { useAuthStore } from '@/store';

export default function OwnerLoginPage() {
  const router = useRouter();
  const { user, isAuthenticated, setAuth } = useAuthStore();
  const [form, setForm] = useState({
    slug: 'demo-restaurant',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user?.restaurantId) {
      router.replace(resolveRestaurantHomePath(user));
    }
  }, [isAuthenticated, router, user]);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const result = await api.login(form.email, form.password, form.slug);
      setAuth(result.data.user, result.data.accessToken, result.data.refreshToken);
      toast.success(`Welcome back, ${result.data.user.name}`);
      router.replace(resolveRestaurantHomePath(result.data.user));
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Could not sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="flex min-h-screen items-center justify-center px-6 py-8 text-slate-50"
      style={{
        background:
          'radial-gradient(circle at top left, rgba(34,211,238,0.16), transparent 28%), radial-gradient(circle at top right, rgba(245,158,11,0.12), transparent 22%), linear-gradient(180deg, #07111f 0%, #0c1728 52%, #020617 100%)',
      }}
    >
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="glass-panel p-8">
          <p className="section-kicker">Owner and manager login</p>
          <h1 className="mt-3 text-4xl font-black text-white">Sign into your restaurant workspace</h1>
          <p className="mt-4 text-base leading-8 text-slate-300">
            Owners enter from the root, then land inside their tenant-scoped admin experience automatically. That keeps the SaaS clean while making the first step simple.
          </p>

          <div className="mt-6 space-y-3">
            {[
              'Root login for owners and managers',
              'Automatic redirect to the restaurant-scoped admin URL',
              'Works cleanly with multi-restaurant SaaS growth',
            ].map((item) => (
              <div key={item} className="soft-panel p-4 text-sm text-slate-200">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="card p-8">
          <div className="mb-6">
            <p className="section-kicker">Secure access</p>
            <h2 className="mt-2 text-3xl font-black text-white">Go to restaurant admin</h2>
            <p className="mt-2 text-sm leading-7 text-slate-400">
              Use your restaurant slug, email, and password to jump into the owner dashboard, pricing controls, floor setup, and website settings.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label">Restaurant slug</label>
              <input
                value={form.slug}
                onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
                className="input w-full"
                placeholder="demo-restaurant"
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                className="input w-full"
              />
            </div>
            <div>
              <label className="label">Password or PIN</label>
              <input
                type="password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
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
            className="btn-primary mt-6 w-full"
          >
            {loading ? 'Signing in...' : 'Go to restaurant admin'}
          </button>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
            <Link href="/" className="hover:text-slate-200">
              Back to homepage
            </Link>
            <Link href="/staff" className="hover:text-slate-200">
              Staff access
            </Link>
            <Link href="/demo" className="hover:text-slate-200">
              Start live demo
            </Link>
            <Link href="/admin/login" className="hover:text-slate-200">
              SaaS admin
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
