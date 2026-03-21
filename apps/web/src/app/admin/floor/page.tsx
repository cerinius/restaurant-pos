
'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

const STATUS_STYLES: Record<string, string> = {
  AVAILABLE: 'bg-emerald-900/60 border-emerald-600 text-emerald-200',
  OCCUPIED:  'bg-blue-900/60 border-blue-500 text-blue-200',
  RESERVED:  'bg-purple-900/60 border-purple-500 text-purple-200',
  DIRTY:     'bg-yellow-900/60 border-yellow-500 text-yellow-200',
  BLOCKED:   'bg-slate-800 border-slate-600 text-slate-500',
};

const SHAPES = ['rectangle', 'square', 'circle'];
const STATUSES = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'DIRTY', 'BLOCKED'];

export default function FloorPlanPage() {
  const { locationId } = useAuthStore();
  const qc = useQueryClient();
  const canvasRef = useRef<HTMLDivElement>(null);

  const [dragging, setDragging]     = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selected, setSelected]     = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTable, setNewTable]     = useState({ name: '', capacity: 4, shape: 'rectangle', section: 'Main', width: 100, height: 80 });
  const [positions, setPositions]   = useState<Record<string, { x: number; y: number }>>({});

  const { data } = useQuery({
    queryKey: ['tables-floor', locationId],
    queryFn: () => api.getTables({ locationId }),
  });

  const tables: any[] = data?.data || [];

  const savePositionsMutation = useMutation({
    mutationFn: () => api.updateTablePositions(
      Object.entries(positions).map(([id, pos]) => ({ id, positionX: pos.x, positionY: pos.y }))
    ),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tables-floor'] }); toast.success('Floor plan saved!'); setPositions({}); },
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) => api.createTable({ ...payload, locationId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tables-floor'] }); toast.success('Table added'); setShowAddForm(false); },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteTable(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tables-floor'] }); setSelected(null); toast.success('Table removed'); },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Cannot delete â active orders'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.updateTableStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tables-floor'] }),
  });

  const getTablePos = (table: any) => positions[table.id] || { x: table.positionX, y: table.positionY };

  const handleMouseDown = (e: React.MouseEvent, table: any) => {
    e.preventDefault();
    const pos = getTablePos(table);
    setDragging(table.id);
    setDragOffset({ x: e.clientX - pos.x, y: e.clientY - pos.y });
    setSelected(table);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - dragOffset.x, rect.width - 120));
    const y = Math.max(0, Math.min(e.clientY - dragOffset.y, rect.height - 120));
    setPositions((prev) => ({ ...prev, [dragging]: { x, y } }));
  };

  const handleMouseUp = () => setDragging(null);

  const hasPendingChanges = Object.keys(positions).length > 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-950/50 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Floor Plan Editor</h1>
          <p className="text-sm text-slate-400">Drag tables to rearrange Â· Click to edit</p>
        </div>
        <div className="flex gap-2">
          {hasPendingChanges && (
            <button onClick={() => savePositionsMutation.mutate()} disabled={savePositionsMutation.isPending}
              className="btn-success flex items-center gap-2 text-sm">
              {savePositionsMutation.isPending ? 'Saving...' : 'ð¾ Save Layout'}
            </button>
          )}
          <button onClick={() => setShowAddForm(true)} className="btn-primary flex items-center gap-2 text-sm">
            <PlusIcon className="w-4 h-4" /> Add Table
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Canvas */}
        <div
          ref={canvasRef}
          className="flex-1 relative overflow-hidden bg-slate-950 cursor-crosshair select-none"
          style={{ backgroundImage: 'radial-gradient(circle, #334155 1px, transparent 1px)', backgroundSize: '30px 30px' }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {tables.map((table) => {
            const pos = getTablePos(table);
            const isSelected = selected?.id === table.id;
            const isPending  = !!positions[table.id];
            return (
              <div
                key={table.id}
                onMouseDown={(e) => handleMouseDown(e, table)}
                style={{
                  position: 'absolute',
                  left: pos.x,
                  top: pos.y,
                  width: table.width || 100,
                  height: table.height || 80,
                  borderRadius: table.shape === 'circle' ? '50%' : table.shape === 'square' ? '12px' : '10px',
                  cursor: dragging === table.id ? 'grabbing' : 'grab',
                  zIndex: dragging === table.id ? 10 : isSelected ? 5 : 1,
                }}
                className={clsx(
                  'border-2 flex flex-col items-center justify-center transition-shadow',
                  STATUS_STYLES[table.status] || STATUS_STYLES.AVAILABLE,
                  isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-950 shadow-xl' : '',
                  isPending ? 'opacity-80' : ''
                )}
              >
                <span className="font-black text-sm">{table.name}</span>
                <span className="text-xs opacity-70">{table.capacity}p</span>
                {table.status !== 'AVAILABLE' && (
                  <span className="text-xs opacity-60">{table.status}</span>
                )}
              </div>
            );
          })}

          {tables.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-600">
              <div className="text-center">
                <p className="text-4xl mb-3">ðª</p>
                <p className="font-medium">No tables yet</p>
                <p className="text-sm mt-1">Click "Add Table" to get started</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel â selected table editor */}
        {selected && (
          <div className="w-64 bg-slate-900 border-l border-slate-700 p-4 shrink-0 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-100">Table {selected.name}</h3>
              <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-slate-300 text-xs">â</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="label text-xs">Status</label>
                <div className="space-y-1">
                  {STATUSES.map((s) => (
                    <button key={s} onClick={() => statusMutation.mutate({ id: selected.id, status: s })}
                      className={clsx('w-full text-left px-3 py-1.5 rounded-xl text-xs font-medium border transition-all',
                        selected.status === s
                          ? STATUS_STYLES[s]
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                      )}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-700">
                <p className="text-xs text-slate-500 mb-2">Table Info</p>
                <div className="text-xs space-y-1 text-slate-400">
                  <p>Shape: {selected.shape}</p>
                  <p>Capacity: {selected.capacity} guests</p>
                  <p>Section: {selected.section || 'â'}</p>
                  <p>Size: {selected.width}Ã{selected.height}px</p>
                </div>
              </div>

              <button
                onClick={() => { if(confirm(`Delete table "${selected.name}"?`)) deleteMutation.mutate(selected.id); }}
                disabled={deleteMutation.isPending}
                className="btn-danger w-full flex items-center justify-center gap-2 text-sm mt-2"
              >
                <TrashIcon className="w-4 h-4" />
                Remove Table
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="px-4 py-2 border-t border-slate-700 bg-slate-900 flex items-center gap-4 shrink-0">
        {Object.entries(STATUS_STYLES).map(([status, cls]) => (
          <div key={status} className="flex items-center gap-1.5 text-xs text-slate-400">
            <div className={clsx('w-3 h-3 rounded border', cls)} />
            {status}
          </div>
        ))}
        <div className="flex-1" />
        <span className="text-xs text-slate-500">{tables.length} tables total</span>
      </div>

      {/* Add Table Form */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="card w-full max-w-sm p-6 shadow-2xl">
            <h2 className="font-bold text-slate-100 mb-4">Add Table</h2>
            <div className="space-y-3">
              <div>
                <label className="label">Table Name/Number</label>
                <input value={newTable.name} onChange={(e) => setNewTable({...newTable, name: e.target.value})}
                  className="input w-full" placeholder="T1, VIP1, Bar-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Capacity</label>
                  <input type="number" value={newTable.capacity} onChange={(e) => setNewTable({...newTable, capacity: parseInt(e.target.value)})}
                    className="input w-full" min="1" max="20" />
                </div>
                <div>
                  <label className="label">Section</label>
                  <input value={newTable.section} onChange={(e) => setNewTable({...newTable, section: e.target.value})}
                    className="input w-full" placeholder="Main" />
                </div>
              </div>
              <div>
                <label className="label">Shape</label>
                <div className="flex gap-2">
                  {SHAPES.map((s) => (
                    <button key={s} type="button" onClick={() => setNewTable({...newTable, shape: s})}
                      className={clsx('flex-1 py-2 rounded-xl text-xs font-medium border capitalize transition-all',
                        newTable.shape === s ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-300'
                      )}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Width (px)</label>
                  <input type="number" value={newTable.width} onChange={(e) => setNewTable({...newTable, width: parseInt(e.target.value)})}
                    className="input w-full" min="60" max="200" />
                </div>
                <div>
                  <label className="label">Height (px)</label>
                  <input type="number" value={newTable.height} onChange={(e) => setNewTable({...newTable, height: parseInt(e.target.value)})}
                    className="input w-full" min="60" max="200" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAddForm(false)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={() => createMutation.mutate({ ...newTable, positionX: 50, positionY: 50 })}
                disabled={!newTable.name || createMutation.isPending}
                className="btn-primary flex-1"
              >
                {createMutation.isPending ? 'Adding...' : 'Add Table'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
