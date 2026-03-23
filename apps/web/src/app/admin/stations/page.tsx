'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  PencilIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';

import api from '@/lib/api';
import { useAuthStore } from '@/store';
import { LoadingNotice, SkeletonBlock } from '@/components/ui/LoadingState';

const STATION_TYPES = ['KITCHEN', 'BAR', 'EXPO', 'GRILL', 'FRY', 'DESSERT', 'CUSTOM'];

function StationForm({
  station,
  locations,
  categories,
  defaultLocationId,
  onClose,
  onSaved,
}: {
  station?: any;
  locations: any[];
  categories: any[];
  defaultLocationId?: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!station;
  const [form, setForm] = useState({
    locationId: station?.locationId || defaultLocationId || locations[0]?.id || '',
    name: station?.name || '',
    type: station?.type || 'KITCHEN',
    color: station?.color || '#3B82F6',
    displayOrder: station?.displayOrder ?? 0,
    categoryIds: (station?.categories || []).map((entry: any) => entry.categoryId || entry.category?.id),
  });

  const saveMutation = useMutation({
    mutationFn: (payload: any) =>
      isEdit ? api.updateStation(station.id, payload) : api.createStation(payload),
    onSuccess: () => {
      toast.success(isEdit ? 'Station updated' : 'Station created');
      onSaved();
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Unable to save station'),
  });

  function toggleCategory(categoryId: string) {
    setForm((current) => ({
      ...current,
      categoryIds: current.categoryIds.includes(categoryId)
        ? current.categoryIds.filter((value: string) => value !== categoryId)
        : [...current.categoryIds, categoryId],
    }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="card w-full max-w-2xl shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100">{isEdit ? 'Edit Station' : 'New KDS Station'}</h2>
            <p className="text-sm text-slate-400">Assign categories so items route to the right screen.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:text-slate-200">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label">Location</label>
              <select
                value={form.locationId}
                onChange={(event) => setForm({ ...form, locationId: event.target.value })}
                className="input w-full"
              >
                <option value="">Select location</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Station Name</label>
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                className="input w-full"
                placeholder="Main Kitchen"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="label">Type</label>
              <select
                value={form.type}
                onChange={(event) => setForm({ ...form, type: event.target.value })}
                className="input w-full"
              >
                {STATION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Color</label>
              <input
                type="color"
                value={form.color}
                onChange={(event) => setForm({ ...form, color: event.target.value })}
                className="h-[46px] w-full rounded-xl border border-slate-600 bg-slate-700 px-2"
              />
            </div>

            <div>
              <label className="label">Display Order</label>
              <input
                type="number"
                value={form.displayOrder}
                onChange={(event) => setForm({ ...form, displayOrder: Number(event.target.value) || 0 })}
                className="input w-full"
              />
            </div>
          </div>

          <div>
            <label className="label">Assigned Categories</label>
            <div className="grid gap-2 md:grid-cols-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => toggleCategory(category.id)}
                  className={clsx(
                    'rounded-xl border px-4 py-3 text-left transition-all',
                    form.categoryIds.includes(category.id)
                      ? 'border-blue-500 bg-blue-600/15'
                      : 'border-slate-700 bg-slate-900/60 hover:border-slate-500'
                  )}
                >
                  <p className="font-semibold text-slate-100">{category.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {form.categoryIds.includes(category.id) ? 'Assigned to station' : 'Tap to assign'}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 border-t border-slate-700 px-6 py-4">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            onClick={() => saveMutation.mutate(form)}
            disabled={saveMutation.isPending || !form.locationId || !form.name.trim()}
            className="btn-primary flex-1"
          >
            {saveMutation.isPending ? 'Saving...' : isEdit ? 'Save Station' : 'Create Station'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StationsPage() {
  const { locationId } = useAuthStore();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingStation, setEditingStation] = useState<any | null>(null);

  const { data: stationData, isLoading: stationsLoading } = useQuery({
    queryKey: ['admin-stations'],
    queryFn: () => api.getStations(),
  });

  const { data: locationData, isLoading: locationsLoading } = useQuery({
    queryKey: ['admin-locations'],
    queryFn: () => api.getLocations(),
  });

  const { data: categoryData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['station-categories'],
    queryFn: () => api.getCategories(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteStation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-stations'] });
      toast.success('Station deactivated');
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Unable to deactivate station'),
  });

  const stations: any[] = stationData?.data || [];
  const locations: any[] = locationData?.data || [];
  const categories: any[] = categoryData?.data || [];
  const showStationSkeleton = (stationsLoading || locationsLoading || categoriesLoading) && stations.length === 0;

  function getLocationName(id: string) {
    return locations.find((location) => location.id === id)?.name || 'Unknown location';
  }

  if (showStationSkeleton) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="border-b border-slate-700 bg-slate-950/50 px-6 py-4">
          <SkeletonBlock className="h-7 w-36" />
          <SkeletonBlock className="mt-2 h-4 w-72" />
        </div>
        <div className="space-y-4 p-6">
          <LoadingNotice
            title="Loading KDS stations"
            description="We are syncing station routing, locations, and category assignments."
          />
          <div className="grid gap-4 xl:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-52 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-700 bg-slate-950/50 px-6 py-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100">KDS Stations</h1>
          <p className="text-sm text-slate-400">Control which categories flow to each kitchen display.</p>
        </div>
        <button
          onClick={() => {
            setEditingStation(null);
            setShowForm(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="h-4 w-4" />
          Add Station
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {stations.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-16 text-center">
            <p className="text-lg font-semibold text-slate-100">No stations configured</p>
            <p className="mt-2 max-w-md text-sm text-slate-400">
              Add at least one active station so fired menu items can appear on the KDS screens.
            </p>
            <button onClick={() => setShowForm(true)} className="btn-primary mt-5">
              Create First Station
            </button>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {stations.map((station) => (
              <div key={station.id} className="card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: station.color || '#3B82F6' }}
                      />
                      <h2 className="text-lg font-bold text-slate-100">{station.name}</h2>
                      <span className="rounded-full border border-slate-700 bg-slate-900/50 px-2 py-1 text-xs font-semibold text-slate-300">
                        {station.type}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                      <span>{getLocationName(station.locationId)}</span>
                      <span>Display order {station.displayOrder ?? 0}</span>
                      <span>{station.categories?.length || 0} assigned categories</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingStation(station);
                        setShowForm(true);
                      }}
                      className="rounded-xl p-2 text-blue-400 transition-colors hover:bg-blue-900/30"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Deactivate station "${station.name}"?`)) {
                          deleteMutation.mutate(station.id);
                        }
                      }}
                      className="rounded-xl p-2 text-red-400 transition-colors hover:bg-red-900/30"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {(station.categories || []).length === 0 ? (
                    <span className="rounded-full border border-dashed border-slate-700 px-3 py-2 text-xs text-slate-500">
                      No categories assigned
                    </span>
                  ) : (
                    station.categories.map((entry: any) => (
                      <span
                        key={entry.categoryId || entry.category?.id}
                        className="rounded-full border border-slate-700 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-300"
                      >
                        {entry.category?.name || 'Category'}
                      </span>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <StationForm
          station={editingStation || undefined}
          locations={locations}
          categories={categories}
          defaultLocationId={locationId}
          onClose={() => {
            setShowForm(false);
            setEditingStation(null);
          }}
          onSaved={() => {
            setShowForm(false);
            setEditingStation(null);
            queryClient.invalidateQueries({ queryKey: ['admin-stations'] });
          }}
        />
      )}
    </div>
  );
}
