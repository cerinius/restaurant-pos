
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { PlusIcon, PencilIcon, TrashIcon, KeyIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

const ROLES = ['OWNER','MANAGER','SERVER','BARTENDER','CASHIER','EXPO','KDS'];
const ROLE_COLORS: Record<string,string> = {
  OWNER:'bg-purple-900/50 text-purple-300 border-purple-700/50',
  MANAGER:'bg-blue-900/50 text-blue-300 border-blue-700/50',
  SERVER:'bg-emerald-900/50 text-emerald-300 border-emerald-700/50',
  BARTENDER:'bg-amber-900/50 text-amber-300 border-amber-700/50',
  CASHIER:'bg-cyan-900/50 text-cyan-300 border-cyan-700/50',
  EXPO:'bg-orange-900/50 text-orange-300 border-orange-700/50',
  KDS:'bg-red-900/50 text-red-300 border-red-700/50',
};

function StaffForm({ staff, locations, onClose, onSaved }: any) {
  const isEdit = !!staff;
  const [form, setForm] = useState({
    name:        staff?.name  || '',
    email:       staff?.email || '',
    pin:         '',
    role:        staff?.role  || 'SERVER',
    locationIds: (staff?.locations || []).map((l: any) => l.locationId) as string[],
    isActive:    staff?.isActive !== false,
  });

  const saveMutation = useMutation({
    mutationFn: (payload: any) =>
      isEdit ? api.updateStaff(staff.id, payload) : api.createStaff(payload),
    onSuccess: () => { toast.success(isEdit ? 'Staff updated!' : 'Staff created!'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Save failed'),
  });

  const toggleLocation = (id: string) => {
    setForm((f) => ({
      ...f,
      locationIds: f.locationIds.includes(id)
        ? f.locationIds.filter((x: string) => x !== id)
        : [...f.locationIds, id],
    }));
  };

  const handleSubmit = () => {
    if (!form.name || !form.role) { toast.error('Name and role are required'); return; }
    if (!isEdit && form.pin.length < 4) { toast.error('PIN must be at least 4 digits'); return; }
    const payload: any = {
      name: form.name,
      email: form.email || undefined,
      role: form.role,
      locationIds: form.locationIds,
      isActive: form.isActive,
    };
    if (form.pin) payload.pin = form.pin;
    saveMutation.mutate(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} className="card w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="font-bold text-slate-100">{isEdit ? 'Edit Staff' : 'New Staff Member'}</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="label">Full Name *</label>
            <input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="input w-full" placeholder="John Smith" />
          </div>
          <div>
            <label className="label">Email (optional)</label>
            <input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="input w-full" placeholder="john@example.com" />
          </div>
          <div>
            <label className="label">{isEdit ? 'New PIN (leave blank to keep current)' : 'PIN * (4+ digits)'}</label>
            <input type="password" value={form.pin} onChange={(e) => setForm({...form, pin: e.target.value})} className="input w-full font-mono tracking-widest" placeholder={isEdit ? 'â¢â¢â¢â¢' : 'Enter PIN'} maxLength={8} />
          </div>
          <div>
            <label className="label">Role *</label>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map((r) => (
                <button key={r} type="button" onClick={() => setForm({...form, role: r})}
                  className={clsx('py-2 rounded-xl text-xs font-semibold border transition-all',
                    form.role === r ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-blue-500'
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          {locations.length > 1 && (
            <div>
              <label className="label">Location Access</label>
              <div className="space-y-1.5">
                {locations.map((loc: any) => (
                  <label key={loc.id} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.locationIds.includes(loc.id)} onChange={() => toggleLocation(loc.id)} className="w-4 h-4 accent-blue-600" />
                    <span className="text-sm text-slate-300">{loc.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {isEdit && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({...form, isActive: e.target.checked})} className="w-4 h-4 accent-blue-600" />
              <span className="text-sm text-slate-300">Active</span>
            </label>
          )}
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-slate-700">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSubmit} disabled={saveMutation.isPending} className="btn-primary flex-1">
            {saveMutation.isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Staff'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function StaffPage() {
  const qc = useQueryClient();
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [resetPinFor, setResetPinFor] = useState<any>(null);
  const [newPin, setNewPin] = useState('');

  const { data: staffData }     = useQuery({ queryKey: ['staff'],     queryFn: () => api.getStaff() });
  const { data: locationsData } = useQuery({ queryKey: ['locations'], queryFn: () => api.getLocations() });

  const staffList: any[]  = staffData?.data    || [];
  const locations: any[]  = locationsData?.data || [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteStaff(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['staff'] }); toast.success('Staff deactivated'); },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed'),
  });

  const resetPinMutation = useMutation({
    mutationFn: ({ id, pin }: { id: string; pin: string }) => api.resetPin(id, pin),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['staff'] }); toast.success('PIN reset'); setResetPinFor(null); setNewPin(''); },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed'),
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-950/50 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Staff Management</h1>
          <p className="text-sm text-slate-400">{staffList.filter((s:any) => s.isActive).length} active members</p>
        </div>
        <button onClick={() => { setEditingStaff(null); setShowForm(true); }} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-4 h-4" /> Add Staff
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-800">
              <tr>
                {['Name','Role','Email','Locations','Status','Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staffList.map((s: any) => (
                <tr key={s.id} className={clsx('border-t border-slate-700/50 hover:bg-slate-800/30 transition-colors', !s.isActive && 'opacity-50')}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0">
                        {s.name?.charAt(0)}
                      </div>
                      <span className="font-semibold text-slate-200">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx('text-xs px-2 py-0.5 rounded-lg border font-medium', ROLE_COLORS[s.role] || 'bg-slate-700 text-slate-300 border-slate-600')}>
                      {s.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{s.email || 'â'}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {(s.locations || []).map((l: any) => l.location?.name || l.locationId).join(', ') || 'All'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx('text-xs px-2 py-0.5 rounded-lg font-medium',
                      s.isActive ? 'bg-emerald-900/40 text-emerald-300' : 'bg-slate-700 text-slate-400'
                    )}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditingStaff(s); setShowForm(true); }}
                        className="p-1.5 text-blue-400 hover:bg-blue-900/30 rounded-lg transition-all">
                        <PencilIcon className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setResetPinFor(s)}
                        className="p-1.5 text-amber-400 hover:bg-amber-900/30 rounded-lg transition-all" title="Reset PIN">
                        <KeyIcon className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { if(confirm(`Deactivate ${s.name}?`)) deleteMutation.mutate(s.id); }}
                        className="p-1.5 text-red-400 hover:bg-red-900/30 rounded-lg transition-all">
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {staffList.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-slate-500">No staff members yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <StaffForm
          staff={editingStaff}
          locations={locations}
          onClose={() => { setShowForm(false); setEditingStaff(null); }}
          onSaved={() => { setShowForm(false); setEditingStaff(null); qc.invalidateQueries({ queryKey: ['staff'] }); }}
        />
      )}

      {/* Reset PIN Modal */}
      {resetPinFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} className="card w-full max-w-sm p-6 shadow-2xl">
            <h2 className="font-bold text-slate-100 mb-4">Reset PIN for {resetPinFor.name}</h2>
            <label className="label">New PIN (4+ digits)</label>
            <input
              type="password"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              className="input w-full font-mono tracking-widest text-xl mb-4"
              placeholder="â¢â¢â¢â¢"
              maxLength={8}
            />
            <div className="flex gap-3">
              <button onClick={() => { setResetPinFor(null); setNewPin(''); }} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={() => resetPinMutation.mutate({ id: resetPinFor.id, pin: newPin })}
                disabled={newPin.length < 4 || resetPinMutation.isPending}
                className="btn-primary flex-1"
              >
                {resetPinMutation.isPending ? 'Resetting...' : 'Reset PIN'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
