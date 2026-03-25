'use client';

import dynamic from 'next/dynamic';
import clsx from 'clsx';
import { startTransition, useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useWebSocket } from '@/hooks/useWebSocket';
import api from '@/lib/api';
import { useAuthStore } from '@/store';
import toast from 'react-hot-toast';

const TableMap = dynamic(
  () => import('@/components/pos/TableMap').then((module) => module.TableMap),
  {
    loading: () => <div className="h-full animate-pulse bg-slate-800" />,
  },
);

interface HostContentProps {
  initialData: {
    tables: any[];
    locationId: string | null;
  };
}

export default function HostContent({ initialData }: HostContentProps) {
  const { locationId } = useAuthStore();
  const qc = useQueryClient();
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [selectedServer, setSelectedServer] = useState<any>(null);
  const [showSeatingModal, setShowSeatingModal] = useState(false);

  const effectiveLocationId = locationId || initialData.locationId;

  const { data: tablesData } = useQuery({
    queryKey: ['tables', effectiveLocationId],
    queryFn: () => api.getTables({ locationId: effectiveLocationId }),
    refetchInterval: 30000,
    enabled: !!effectiveLocationId,
    initialData: { success: true, data: initialData.tables },
  });

  const { data: staffData } = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.getStaff(),
    enabled: !!effectiveLocationId,
  });

  const tables = tablesData?.data || [];
  const allStaff = staffData?.data || [];
  const activeServers = allStaff
    .filter(
      (member: any) =>
        member.isActive &&
        ['SERVER', 'BARTENDER'].includes(member.role?.toUpperCase()) &&
        member.locations.some((loc: any) => loc.location.id === effectiveLocationId)
    )
    .sort((a, b) => {
      const aTime = a.lastSeatedAt ? new Date(a.lastSeatedAt).getTime() : 0;
      const bTime = b.lastSeatedAt ? new Date(b.lastSeatedAt).getTime() : 0;
      return aTime - bTime; // Older first
    });

  const handleTableSelect = useCallback((table: any) => {
    setSelectedTable(table);
    setShowSeatingModal(true);
  }, []);

  const seatingMutation = useMutation({
    mutationFn: async ({ tableId, serverId, guestCount }: { tableId: string; serverId: string; guestCount: number }) => {
      // Update server lastSeatedAt
      await api.updateStaff(serverId, { lastSeatedAt: new Date().toISOString() });
      // Create order
      return api.createOrder({
        tableId,
        serverId,
        guestCount,
        type: 'DINE_IN',
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff'] });
      qc.invalidateQueries({ queryKey: ['tables', effectiveLocationId] });
      toast.success('Table seated');
      setShowSeatingModal(false);
      setSelectedTable(null);
      setSelectedServer(null);
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Failed to seat table'),
  });

  const clearTableMutation = useMutation({
    mutationFn: (tableId: string) => api.updateTableStatus(tableId, 'DIRTY'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tables', effectiveLocationId] });
      toast.success('Table cleared');
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Failed to clear table'),
  });

  const handleSeatTable = () => {
    if (!selectedTable || !selectedServer) return;
    seatingMutation.mutate({
      tableId: selectedTable.id,
      serverId: selectedServer.id,
      guestCount: selectedTable.capacity || 4,
    });
  };

  const handleClearTable = (tableId: string) => {
    clearTableMutation.mutate(tableId);
  };

  return (
    <div className="flex h-screen bg-slate-950">
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-700 bg-slate-950/50 px-6 py-4">
          <h1 className="text-xl font-bold text-slate-100">Host Station</h1>
        </div>
        <div className="flex-1">
          <TableMap
            initialTables={tables}
            locationId={effectiveLocationId || ''}
            onTableSelect={handleTableSelect}
            selectedTableId={selectedTable?.id}
          />
        </div>
      </div>

      <div className="w-80 border-l border-slate-700 bg-slate-900 p-4">
        <h2 className="mb-4 text-lg font-semibold text-slate-100">Servers</h2>
        <div className="space-y-2">
          {activeServers.map((server: any) => (
            <button
              key={server.id}
              onClick={() => setSelectedServer(server)}
              className={clsx(
                'w-full rounded-lg border p-3 text-left transition',
                selectedServer?.id === server.id
                  ? 'border-blue-500 bg-blue-900/50'
                  : 'border-slate-700 bg-slate-800 hover:border-slate-500'
              )}
            >
              <p className="font-medium text-slate-100">{server.name}</p>
              <p className="text-xs text-slate-400">{server.role}</p>
            </button>
          ))}
        </div>
      </div>

      {showSeatingModal && selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-96 rounded-lg bg-slate-800 p-6">
            <h3 className="mb-4 text-lg font-semibold text-slate-100">Seat Table {selectedTable.name}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300">Server</label>
                <select
                  value={selectedServer?.id || ''}
                  onChange={(e) => setSelectedServer(activeServers.find((s: any) => s.id === e.target.value))}
                  className="mt-1 w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100"
                >
                  <option value="">Select Server</option>
                  {activeServers.map((server: any) => (
                    <option key={server.id} value={server.id}>
                      {server.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-300">Guest Count</label>
                <input
                  type="number"
                  defaultValue={selectedTable.capacity || 4}
                  className="mt-1 w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowSeatingModal(false)}
                className="rounded px-4 py-2 text-slate-300 hover:text-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSeatTable}
                disabled={!selectedServer || seatingMutation.isPending}
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {seatingMutation.isPending ? 'Seating...' : 'Seat Table'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}