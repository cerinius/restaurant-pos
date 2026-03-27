'use client';

import clsx from 'clsx';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import api from '@/lib/api';
import { getRestaurantAdminPath, resolveRestaurantHomePath } from '@/lib/paths';
import { setRememberedRestaurantId } from '@/lib/remembered-restaurant';
import { useAuthStore } from '@/store';

const DEMO_PINS = [
  { label: 'Owner', pin: '1234' },
  { label: 'Manager', pin: '2222' },
  { label: 'Server', pin: '3333' },
  { label: 'Bartender', pin: '4444' },
];

const NUMPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];
const PIN_LENGTH = 4;

export default function RestaurantLoginPage() {
  const params = useParams<{ restaurantId: string }>();
  const restaurantId = useMemo(() => String(params?.restaurantId || ''), [params?.restaurantId]);
  const router = useRouter();
  const { user, isAuthenticated, setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [pin, setPin] = useState('');
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [restaurantInfo, setRestaurantInfo] = useState<any>(null);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
  const [pinShake, setPinShake] = useState(false);
  const [emailForm, setEmailForm] = useState({
    email: '',
    password: '',
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    setRedirectPath(params.get('redirect'));
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.restaurantId === restaurantId) {
      router.replace(redirectPath || resolveRestaurantHomePath(user));
    }
  }, [isAuthenticated, redirectPath, restaurantId, router, user]);

  useEffect(() => {
    if (!restaurantId) return;

    setRememberedRestaurantId(restaurantId);

    api
      .getPublicRestaurant(restaurantId)
      .then((result) => {
        setRestaurantInfo(result.data);
        setSelectedLocationId(result.data.locations?.[0]?.id || '');
      })
      .catch(() => {
        toast.error('Restaurant not found');
      });
  }, [restaurantId]);

  const handlePinLogin = async (loginPin = pin) => {
    if (!selectedLocationId) {
      toast.error('Select a location first');
      return;
    }

    setLoading(true);
    try {
      const result = await api.pinLogin(loginPin, restaurantId, selectedLocationId);
      setAuth(result.data.user, result.data.accessToken, result.data.refreshToken);
      toast.success(`Welcome, ${result.data.user.name}`);
      setRememberedRestaurantId(restaurantId);
      router.replace(redirectPath || resolveRestaurantHomePath(result.data.user));
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Invalid PIN');
      setPin('');
      setPinShake(true);
      setTimeout(() => setPinShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  const handleNumpadPress = (key: string) => {
    if (loading) return;
    if (key === '⌫') {
      setPin((prev) => prev.slice(0, -1));
      return;
    }
    if (pin.length >= PIN_LENGTH) return;
    const next = pin + key;
    setPin(next);
    if (next.length === PIN_LENGTH) {
      handlePinLogin(next);
    }
  };

  const handleEmailLogin = async () => {
    if (!restaurantInfo?.slug) {
      toast.error('Restaurant details are still loading');
      return;
    }

    setLoading(true);
    try {
      const result = await api.login(emailForm.email, emailForm.password, restaurantInfo.slug);
      setAuth(result.data.user, result.data.accessToken, result.data.refreshToken);
      toast.success(`Welcome, ${result.data.user.name}`);
      setRememberedRestaurantId(restaurantId);
      router.replace(redirectPath || resolveRestaurantHomePath(result.data.user));
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
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="glass-panel p-8">
          <p className="section-kicker">Restaurant access portal</p>
          <h1 className="mt-3 text-4xl font-black text-white">
            {restaurantInfo?.name || 'Loading restaurant...'}
          </h1>
          <p className="mt-4 text-base leading-8 text-slate-300">
            Staff and managers log in at the restaurant URL itself. That keeps every shift tied to the right tenant before anyone opens the POS, KDS, or admin workspace.
          </p>

          <div className="mt-6 space-y-3">
            {[
              `Tenant login lives at /${restaurantId}/login`,
              'PIN access for speed, plus email login for owner and manager workflows',
              'Remembered restaurant ID keeps repeat logins fast on shared devices',
            ].map((item) => (
              <div key={item} className="soft-panel p-4 text-sm text-slate-200">
                {item}
              </div>
            ))}
          </div>

          <div className="mt-6 soft-panel p-4 text-sm text-slate-300">
            Admin URL: <span className="font-semibold text-white">{getRestaurantAdminPath(restaurantId)}</span>
          </div>
        </section>

        <section className="card p-8">
          <div className="mb-5 grid grid-cols-2 gap-2 rounded-[22px] border border-white/10 bg-white/5 p-1">
            <button
              type="button"
              onClick={() => setShowEmailLogin(false)}
              className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                !showEmailLogin ? 'bg-cyan-300 text-slate-950' : 'text-slate-300'
              }`}
            >
              Staff PIN
            </button>
            <button
              type="button"
              onClick={() => setShowEmailLogin(true)}
              className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                showEmailLogin ? 'bg-cyan-300 text-slate-950' : 'text-slate-300'
              }`}
            >
              Email login
            </button>
          </div>

          <div className="mb-4">
            <label className="label">Location</label>
            <select
              value={selectedLocationId}
              onChange={(event) => setSelectedLocationId(event.target.value)}
              className="input w-full"
            >
              {(restaurantInfo?.locations || []).map((location: any) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>

          {!showEmailLogin ? (
            <>
              {/* PIN dots */}
              <div className="mb-6 flex justify-center gap-4">
                {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                  <div
                    key={i}
                    className={clsx(
                      'h-4 w-4 rounded-full border-2 transition-all duration-150',
                      i < pin.length
                        ? 'scale-110 border-cyan-300 bg-cyan-300'
                        : 'border-white/20 bg-transparent',
                      pinShake && 'animate-pulse border-red-400 bg-red-400/30',
                    )}
                  />
                ))}
              </div>

              {/* Numpad */}
              <div className={clsx('grid grid-cols-3 gap-2.5', pinShake && 'opacity-60')}>
                {NUMPAD_KEYS.map((key, idx) => {
                  if (key === '') {
                    return <div key={`empty-${idx}`} />;
                  }
                  const isBackspace = key === '⌫';
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={loading}
                      onClick={() => handleNumpadPress(key)}
                      className={clsx(
                        'flex h-16 items-center justify-center rounded-2xl border text-xl font-bold transition-all duration-100 active:scale-95 select-none',
                        isBackspace
                          ? 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-100'
                          : 'border-white/10 bg-white/5 text-slate-100 hover:border-cyan-300/30 hover:bg-white/10',
                        loading && 'cursor-not-allowed opacity-50',
                      )}
                    >
                      {loading && key !== '⌫' ? '·' : key}
                    </button>
                  );
                })}
              </div>

              {loading && (
                <p className="mt-4 text-center text-sm font-semibold text-cyan-300">
                  Signing in...
                </p>
              )}

              {process.env.NEXT_PUBLIC_DEMO_RESTAURANT_ID === restaurantId && (
                <div className="mt-6">
                  <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Demo quick access
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {DEMO_PINS.map((demoPin) => (
                      <button
                        key={demoPin.pin}
                        type="button"
                        onClick={() => handlePinLogin(demoPin.pin)}
                        className="btn-secondary justify-start text-left"
                      >
                        <span className="font-bold">{demoPin.label}</span>
                        <span className="ml-auto font-mono text-slate-400">{demoPin.pin}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="space-y-4">
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    value={emailForm.email}
                    onChange={(event) =>
                      setEmailForm((current) => ({ ...current, email: event.target.value }))
                    }
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="label">Password or PIN</label>
                  <input
                    type="password"
                    value={emailForm.password}
                    onChange={(event) =>
                      setEmailForm((current) => ({ ...current, password: event.target.value }))
                    }
                    className="input w-full"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        handleEmailLogin();
                      }
                    }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleEmailLogin}
                disabled={loading}
                className="btn-primary mt-6 w-full"
              >
                {loading ? 'Signing in...' : 'Go to tenant admin'}
              </button>
            </>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
            <Link href="/login" className="hover:text-slate-200">
              Owner login
            </Link>
            <Link href="/staff?change=1" className="hover:text-slate-200">
              Change restaurant
            </Link>
            <Link href="/" className="hover:text-slate-200">
              Homepage
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
