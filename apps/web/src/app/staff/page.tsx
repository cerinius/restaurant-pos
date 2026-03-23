'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';

import api from '@/lib/api';
import { getRestaurantLoginPath } from '@/lib/paths';
import {
  clearRememberedRestaurantId,
  getRememberedRestaurantId,
  setRememberedRestaurantId,
} from '@/lib/remembered-restaurant';

export default function StaffAccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [restaurantId, setRestaurantId] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedRestaurantId, setSavedRestaurantIdState] = useState<string | null>(null);

  useEffect(() => {
    const rememberedId = getRememberedRestaurantId();
    if (!rememberedId) return;

    setSavedRestaurantIdState(rememberedId);
    setRestaurantId(rememberedId);
    if (searchParams.get('change') !== '1') {
      router.replace(getRestaurantLoginPath(rememberedId));
    }
  }, [router, searchParams]);

  const handleContinue = async (nextRestaurantId?: string) => {
    const candidateId = String(nextRestaurantId || restaurantId).trim();
    if (!candidateId) {
      toast.error('Enter your restaurant ID first');
      return;
    }

    setLoading(true);
    try {
      await api.getPublicRestaurant(candidateId);
      setRememberedRestaurantId(candidateId);
      setSavedRestaurantIdState(candidateId);
      router.push(getRestaurantLoginPath(candidateId));
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'We could not find that restaurant ID');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="flex min-h-screen items-center justify-center px-6 py-8 text-slate-50"
      style={{
        background:
          'radial-gradient(circle at top left, rgba(34,211,238,0.18), transparent 28%), radial-gradient(circle at top right, rgba(245,158,11,0.14), transparent 24%), linear-gradient(180deg, #07111f 0%, #0c1728 52%, #020617 100%)',
      }}
    >
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="glass-panel p-8">
          <p className="section-kicker">Staff access</p>
          <h1 className="mt-3 text-4xl font-black text-white">Find your restaurant login in one step</h1>
          <p className="mt-4 text-base leading-8 text-slate-300">
            Servers, bartenders, hosts, and kitchen staff can start here. Enter the restaurant ID once and we remember it on this device so the team does not need to retype it every shift.
          </p>

          <div className="mt-6 space-y-3">
            {[
              'Restaurant ID is saved in both cookie storage and local storage',
              'If the ID is already known, the page can redirect straight to staff login',
              'Teams can switch restaurants at any time from the change flow',
            ].map((item) => (
              <div key={item} className="soft-panel p-4 text-sm text-slate-200">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="card p-8">
          <p className="section-kicker">Restaurant ID lookup</p>
          <h2 className="mt-2 text-3xl font-black text-white">Go to the correct staff sign-in</h2>
          <p className="mt-2 text-sm leading-7 text-slate-400">
            The restaurant ID is the tenant ID the owner sees in their dashboard. Once you enter it here, the device can keep bringing you back to the same restaurant.
          </p>

          <div className="mt-6 rounded-[28px] border border-white/10 bg-white/5 p-5">
            <label className="label">Restaurant ID</label>
            <input
              value={restaurantId}
              onChange={(event) => setRestaurantId(event.target.value)}
              className="input w-full font-mono"
              placeholder="ckxyz123restaurant"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handleContinue();
                }
              }}
            />
            <button
              type="button"
              onClick={() => handleContinue()}
              disabled={loading}
              className="btn-primary mt-5 w-full"
            >
              {loading ? 'Finding restaurant...' : 'Go to staff login'}
            </button>
          </div>

          {savedRestaurantId && (
            <div className="mt-5 rounded-[24px] border border-emerald-300/20 bg-emerald-400/10 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-100">
                Saved on this device
              </p>
              <p className="mt-2 break-all text-sm font-semibold text-white">{savedRestaurantId}</p>
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => handleContinue(savedRestaurantId)}
                  className="btn-success flex-1"
                >
                  Open saved login
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearRememberedRestaurantId();
                    setSavedRestaurantIdState(null);
                    setRestaurantId('');
                  }}
                  className="btn-secondary"
                >
                  Forget ID
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
            <Link href="/" className="hover:text-slate-200">
              Homepage
            </Link>
            <Link href="/login" className="hover:text-slate-200">
              Owner login
            </Link>
            <Link href="/demo" className="hover:text-slate-200">
              Live demo
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
