
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const DEMO_RESTAURANT_ID = process.env.NEXT_PUBLIC_DEMO_RESTAURANT_ID || '';
const DEMO_LOCATION_ID   = process.env.NEXT_PUBLIC_DEMO_LOCATION_ID   || 'main-location';

const PIN_USERS = [
  { name: 'Owner',     pin: '1234', role: 'OWNER',     color: 'bg-purple-600' },
  { name: 'Manager',   pin: '2222', role: 'MANAGER',   color: 'bg-blue-600' },
  { name: 'Server',    pin: '3333', role: 'SERVER',    color: 'bg-emerald-600' },
  { name: 'Bartender', pin: '4444', role: 'BARTENDER', color: 'bg-amber-600' },
];

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, isAuthenticated } = useAuthStore();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [restaurantId, setRestaurantId] = useState(DEMO_RESTAURANT_ID);
  const [locationId, setLocationId] = useState(DEMO_LOCATION_ID);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminForm, setAdminForm] = useState({ email: '', password: '', slug: 'demo-restaurant' });

  useEffect(() => {
    if (isAuthenticated) router.push('/pos');
  }, [isAuthenticated, router]);

  // Fetch restaurant ID from slug on mount
  useEffect(() => {
    if (!DEMO_RESTAURANT_ID) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/health`)
        .catch(() => {});
    }
  }, []);

  const handlePinPress = (digit: string) => {
    if (pin.length < 6) setPin((p) => p + digit);
  };

  const handleBackspace = () => setPin((p) => p.slice(0, -1));

  const handlePinLogin = async (pinValue?: string) => {
    const loginPin = pinValue || pin;
    if (loginPin.length < 4) {
      toast.error('PIN must be at least 4 digits');
      return;
    }

    // Need restaurantId â fetch via slug first
    let rid = restaurantId;
    if (!rid) {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/restaurants/slug/demo-restaurant`
        );
        const data = await res.json();
        rid = data?.data?.id || '';
        setRestaurantId(rid);
      } catch {
        toast.error('Cannot reach server â is the API running?');
        return;
      }
    }

    setLoading(true);
    try {
      const result = await api.pinLogin(loginPin, rid, locationId);
      if (result.success) {
        setAuth(result.data.user, result.data.accessToken, result.data.refreshToken);
        toast.success(`Welcome, ${result.data.user.name}!`);
        router.push('/pos');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Invalid PIN');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async () => {
    setLoading(true);
    try {
      const result = await api.login(adminForm.email, adminForm.password, adminForm.slug);
      if (result.success) {
        setAuth(result.data.user, result.data.accessToken, result.data.refreshToken);
        toast.success(`Welcome, ${result.data.user.name}!`);
        router.push('/admin');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-600/30">
            <span className="text-3xl">ð½ï¸</span>
          </div>
          <h1 className="text-3xl font-bold text-gradient">RestaurantOS</h1>
          <p className="text-slate-400 mt-1 text-sm">Professional Point of Sale</p>
        </div>

        <AnimatePresence mode="wait">
          {!showAdminLogin ? (
            <motion.div
              key="pin"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="card p-6 space-y-5"
            >
              <h2 className="text-center text-lg font-semibold text-slate-200">Staff PIN Login</h2>

              {/* PIN Display */}
              <div className="flex justify-center gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all ${
                      i < pin.length
                        ? 'bg-blue-600 border-blue-500'
                        : 'bg-slate-700 border-slate-600'
                    }`}
                  >
                    {i < pin.length && <div className="w-3 h-3 bg-white rounded-full" />}
                  </div>
                ))}
              </div>

              {/* Numpad */}
              <div className="grid grid-cols-3 gap-3">
                {['1','2','3','4','5','6','7','8','9','','0','â«'].map((key, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (key === 'â«') handleBackspace();
                      else if (key !== '') handlePinPress(key);
                    }}
                    disabled={key === '' || loading}
                    className={`h-14 rounded-xl font-bold text-xl transition-all active:scale-95 select-none ${
                      key === ''
                        ? 'opacity-0 cursor-default'
                        : key === 'â«'
                        ? 'bg-slate-600 hover:bg-slate-500 text-slate-300'
                        : 'bg-slate-700 hover:bg-slate-600 text-slate-100'
                    }`}
                  >
                    {key}
                  </button>
                ))}
              </div>

              {/* Login Button */}
              <button
                onClick={() => handlePinLogin()}
                disabled={pin.length < 4 || loading}
                className="btn-primary w-full h-14 text-lg"
              >
                {loading ? 'Verifying...' : 'Login'}
              </button>

              {/* Demo quick logins */}
              <div className="pt-2 border-t border-slate-700">
                <p className="text-xs text-slate-500 text-center mb-3">Quick demo login</p>
                <div className="grid grid-cols-2 gap-2">
                  {PIN_USERS.map((u) => (
                    <button
                      key={u.pin}
                      onClick={() => handlePinLogin(u.pin)}
                      disabled={loading}
                      className={`${u.color} hover:opacity-90 text-white text-xs font-semibold py-2.5 rounded-xl transition-all active:scale-95`}
                    >
                      {u.name} ({u.pin})
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setShowAdminLogin(true)}
                className="w-full text-xs text-slate-500 hover:text-slate-300 text-center pt-1 transition-colors"
              >
                Admin / Email Login â
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="card p-6 space-y-4"
            >
              <h2 className="text-center text-lg font-semibold text-slate-200">Admin Login</h2>

              <div>
                <label className="label">Restaurant Slug</label>
                <input
                  type="text"
                  value={adminForm.slug}
                  onChange={(e) => setAdminForm({ ...adminForm, slug: e.target.value })}
                  className="input w-full"
                  placeholder="demo-restaurant"
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={adminForm.email}
                  onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                  className="input w-full"
                  placeholder="owner@example.com"
                />
              </div>
              <div>
                <label className="label">Password / PIN</label>
                <input
                  type="password"
                  value={adminForm.password}
                  onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                  className="input w-full"
                  placeholder="â¢â¢â¢â¢"
                  onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                />
              </div>

              <button
                onClick={handleAdminLogin}
                disabled={loading}
                className="btn-primary w-full h-12"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>

              <button
                onClick={() => setShowAdminLogin(false)}
                className="w-full text-xs text-slate-500 hover:text-slate-300 text-center transition-colors"
              >
                â Back to PIN Login
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-xs text-slate-600 mt-6">
          RestaurantOS v1.0 Â· All rights reserved
        </p>
      </div>
    </div>
  );
}
