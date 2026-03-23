'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store';

const STATUS_STYLES: Record<string, string> = {
  AVAILABLE: 'bg-emerald-900/60 border-emerald-600 text-emerald-200',
  OCCUPIED: 'bg-blue-900/60 border-blue-500 text-blue-200',
  RESERVED: 'bg-purple-900/60 border-purple-500 text-purple-200',
  DIRTY: 'bg-yellow-900/60 border-yellow-500 text-yellow-200',
  BLOCKED: 'bg-slate-800 border-slate-600 text-slate-500',
};

const SHAPES = ['rectangle', 'square', 'circle'];
const STATUSES = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'DIRTY', 'BLOCKED'];
const DEFAULT_TABLE = {
  name: '',
  capacity: 4,
  shape: 'rectangle',
  section: 'Main',
  width: 100,
  height: 80,
};

const normalizeRoomName = (value?: string | null) => value?.trim() ?? '';

const parseNumberInput = (value: string, fallback: number) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export default function FloorPlanPage() {
  const { locationId } = useAuthStore();
  const qc = useQueryClient();
  const canvasRef = useRef<HTMLDivElement>(null);

  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddRoomForm, setShowAddRoomForm] = useState(false);
  const [newTable, setNewTable] = useState(DEFAULT_TABLE);
  const [roomDraft, setRoomDraft] = useState('');
  const [customRooms, setCustomRooms] = useState<string[]>([]);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});

  const { data } = useQuery({
    queryKey: ['tables-floor', locationId],
    queryFn: () => api.getTables({ locationId }),
  });

  const tables: any[] = data?.data || [];
  const selected = tables.find((table) => table.id === selectedId) || null;
  const savedRooms = Array.from(
    new Set(
      [
        ...tables.map((table) => normalizeRoomName(table.section)),
        ...customRooms.map((room) => normalizeRoomName(room)),
      ].filter(Boolean)
    )
  ) as string[];
  const roomOptions =
    savedRooms.length > 0 ? savedRooms : [normalizeRoomName(newTable.section) || DEFAULT_TABLE.section];
  const visibleTables = activeRoom
    ? tables.filter((table) => normalizeRoomName(table.section) === activeRoom)
    : tables;

  const savePositionsMutation = useMutation({
    mutationFn: () =>
      api.updateTablePositions(
        Object.entries(positions).map(([id, pos]) => ({ id, positionX: pos.x, positionY: pos.y }))
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tables-floor'] });
      toast.success('Floor plan saved');
      setPositions({});
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Failed to save layout'),
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) => api.createTable({ ...payload, locationId }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['tables-floor'] });
      setCustomRooms((current) =>
        variables.section && !current.includes(variables.section)
          ? [...current, variables.section]
          : current
      );
      setNewTable((current) => ({ ...current, ...DEFAULT_TABLE, section: variables.section || current.section }));
      setShowAddForm(false);
      toast.success('Table added');
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Failed to add table'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteTable(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tables-floor'] });
      setSelectedId(null);
      toast.success('Table removed');
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Cannot delete table'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.updateTableStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tables-floor'] });
      toast.success('Table status updated');
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Failed to update status'),
  });

  const getTablePos = (table: any) => positions[table.id] || { x: table.positionX, y: table.positionY };

  const handleMouseDown = (event: React.MouseEvent, table: any) => {
    event.preventDefault();
    const pos = getTablePos(table);
    setDragging(table.id);
    setDragOffset({ x: event.clientX - pos.x, y: event.clientY - pos.y });
    setSelectedId(table.id);
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!dragging || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(event.clientX - dragOffset.x, rect.width - 120));
    const y = Math.max(0, Math.min(event.clientY - dragOffset.y, rect.height - 120));

    setPositions((current) => ({ ...current, [dragging]: { x, y } }));
  };

  const handleMouseUp = () => setDragging(null);

  const handleAddRoom = () => {
    const roomName = normalizeRoomName(roomDraft);

    if (!roomName) {
      toast.error('Enter a room name');
      return;
    }

    setCustomRooms((current) => (current.includes(roomName) ? current : [...current, roomName]));
    setNewTable((current) => ({ ...current, section: roomName }));
    setActiveRoom(roomName);
    setRoomDraft('');
    setShowAddRoomForm(false);
    toast.success('Room added');
  };

  const openAddTableForm = () => {
    setNewTable((current) => ({
      ...current,
      section: activeRoom || normalizeRoomName(current.section) || DEFAULT_TABLE.section,
    }));
    setShowAddForm(true);
  };

  const handleCreateTable = () => {
    const name = newTable.name.trim();
    const roomName = normalizeRoomName(newTable.section);

    if (!name) {
      toast.error('Enter a table name');
      return;
    }

    if (!roomName) {
      toast.error('Choose or add a room');
      return;
    }

    createMutation.mutate({
      ...newTable,
      name,
      section: roomName,
      positionX: 50,
      positionY: 50,
    });
  };

  const hasPendingChanges = Object.keys(positions).length > 0;
  const roomCountLabel =
    savedRooms.length > 0 ? `${tables.length} tables across ${savedRooms.length} rooms` : `${tables.length} tables total`;
  const emptyStateTitle = activeRoom ? 'No tables in this room yet' : 'No tables yet';
  const emptyStateBody = activeRoom
    ? 'Add a table to start laying out this room.'
    : 'Click "Add Table" to get started.';

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-950/50 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Floor Plan Editor</h1>
          <p className="text-sm text-slate-400">Drag tables to rearrange, then save the layout.</p>
        </div>

        <div className="flex gap-2">
          {hasPendingChanges && (
            <button
              onClick={() => savePositionsMutation.mutate()}
              disabled={savePositionsMutation.isPending}
              className="btn-success flex items-center gap-2 text-sm"
            >
              {savePositionsMutation.isPending ? 'Saving...' : 'Save Layout'}
            </button>
          )}

          <button
            onClick={() => setShowAddRoomForm(true)}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <PlusIcon className="w-4 h-4" />
            Add Room
          </button>

          <button onClick={openAddTableForm} className="btn-primary flex items-center gap-2 text-sm">
            <PlusIcon className="w-4 h-4" />
            Add Table
          </button>
        </div>
      </div>

      {savedRooms.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-6 py-3 border-b border-slate-800 bg-slate-950/40 shrink-0">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Rooms</span>

          <button
            type="button"
            onClick={() => setActiveRoom(null)}
            className={clsx(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
              !activeRoom
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
            )}
          >
            All Rooms
          </button>

          {savedRooms.map((room) => (
            <button
              key={room}
              type="button"
              onClick={() => setActiveRoom(room === activeRoom ? null : room)}
              className={clsx(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
                activeRoom === room
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
              )}
            >
              {room}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <div
          ref={canvasRef}
          className="flex-1 relative overflow-hidden bg-slate-950 cursor-crosshair select-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #334155 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {visibleTables.map((table) => {
            const pos = getTablePos(table);
            const isSelected = selected?.id === table.id;
            const isPending = !!positions[table.id];

            return (
              <div
                key={table.id}
                onMouseDown={(event) => handleMouseDown(event, table)}
                style={{
                  position: 'absolute',
                  left: pos.x,
                  top: pos.y,
                  width: table.width || 100,
                  height: table.height || 80,
                  borderRadius:
                    table.shape === 'circle' ? '50%' : table.shape === 'square' ? '12px' : '10px',
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
                {!!table.section && <span className="text-xs opacity-60">{table.section}</span>}
              </div>
            );
          })}

          {visibleTables.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-600">
              <div className="text-center">
                <p className="text-4xl mb-3">Floor</p>
                <p className="font-medium">{emptyStateTitle}</p>
                <p className="text-sm mt-1">{emptyStateBody}</p>
              </div>
            </div>
          )}
        </div>

        {selected && (
          <div className="w-64 bg-slate-900 border-l border-slate-700 p-4 shrink-0 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-100">Table {selected.name}</h3>
              <button
                onClick={() => setSelectedId(null)}
                className="text-slate-500 hover:text-slate-300 text-xs"
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="label text-xs">Status</label>
                <div className="space-y-1">
                  {STATUSES.map((status) => (
                    <button
                      key={status}
                      onClick={() => statusMutation.mutate({ id: selected.id, status })}
                      className={clsx(
                        'w-full text-left px-3 py-1.5 rounded-xl text-xs font-medium border transition-all',
                        selected.status === status
                          ? STATUS_STYLES[status]
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                      )}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-700">
                <p className="text-xs text-slate-500 mb-2">Table Info</p>
                <div className="text-xs space-y-1 text-slate-400">
                  <p>Shape: {selected.shape}</p>
                  <p>Capacity: {selected.capacity} guests</p>
                  <p>Room: {selected.section || 'Unassigned'}</p>
                  <p>
                    Size: {selected.width}x{selected.height}px
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  if (confirm(`Delete table "${selected.name}"?`)) deleteMutation.mutate(selected.id);
                }}
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

      <div className="px-4 py-2 border-t border-slate-700 bg-slate-900 flex items-center gap-4 shrink-0">
        {Object.entries(STATUS_STYLES).map(([status, className]) => (
          <div key={status} className="flex items-center gap-1.5 text-xs text-slate-400">
            <div className={clsx('w-3 h-3 rounded border', className)} />
            {status}
          </div>
        ))}

        <div className="flex-1" />
        <span className="text-xs text-slate-500">{roomCountLabel}</span>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="card w-full max-w-sm p-6 shadow-2xl">
            <h2 className="font-bold text-slate-100 mb-4">Add Table</h2>

            <div className="space-y-3">
              <div>
                <label className="label">Table Name/Number</label>
                <input
                  value={newTable.name}
                  onChange={(event) => setNewTable({ ...newTable, name: event.target.value })}
                  className="input w-full"
                  placeholder="T1, VIP1, Bar-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Capacity</label>
                  <input
                    type="number"
                    value={newTable.capacity}
                    onChange={(event) =>
                      setNewTable({
                        ...newTable,
                        capacity: parseNumberInput(event.target.value, DEFAULT_TABLE.capacity),
                      })
                    }
                    className="input w-full"
                    min="1"
                    max="20"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="label">Room</label>
                    <button
                      type="button"
                      onClick={() => {
                        setRoomDraft(normalizeRoomName(newTable.section));
                        setShowAddRoomForm(true);
                      }}
                      className="text-xs text-blue-300 hover:text-blue-200"
                    >
                      Add Room
                    </button>
                  </div>

                  <select
                    value={newTable.section}
                    onChange={(event) => setNewTable({ ...newTable, section: event.target.value })}
                    className="input w-full"
                  >
                    {roomOptions.map((room) => (
                      <option key={room} value={room}>
                        {room}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Shape</label>
                <div className="flex gap-2">
                  {SHAPES.map((shape) => (
                    <button
                      key={shape}
                      type="button"
                      onClick={() => setNewTable({ ...newTable, shape })}
                      className={clsx(
                        'flex-1 py-2 rounded-xl text-xs font-medium border capitalize transition-all',
                        newTable.shape === shape
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-slate-700 border-slate-600 text-slate-300'
                      )}
                    >
                      {shape}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Width (px)</label>
                  <input
                    type="number"
                    value={newTable.width}
                    onChange={(event) =>
                      setNewTable({
                        ...newTable,
                        width: parseNumberInput(event.target.value, DEFAULT_TABLE.width),
                      })
                    }
                    className="input w-full"
                    min="60"
                    max="200"
                  />
                </div>

                <div>
                  <label className="label">Height (px)</label>
                  <input
                    type="number"
                    value={newTable.height}
                    onChange={(event) =>
                      setNewTable({
                        ...newTable,
                        height: parseNumberInput(event.target.value, DEFAULT_TABLE.height),
                      })
                    }
                    className="input w-full"
                    min="60"
                    max="200"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAddForm(false)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={handleCreateTable}
                disabled={!newTable.name.trim() || createMutation.isPending}
                className="btn-primary flex-1"
              >
                {createMutation.isPending ? 'Adding...' : 'Add Table'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddRoomForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="card w-full max-w-sm p-6 shadow-2xl">
            <h2 className="font-bold text-slate-100 mb-4">Add Room</h2>

            <div className="space-y-3">
              <div>
                <label className="label">Room Name</label>
                <input
                  value={roomDraft}
                  onChange={(event) => setRoomDraft(event.target.value)}
                  className="input w-full"
                  placeholder="Main Dining, Patio, Bar"
                />
              </div>

              <p className="text-xs text-slate-400">
                Rooms use the existing table section field, so the room is saved as soon as you add a table to it.
              </p>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => {
                  setRoomDraft('');
                  setShowAddRoomForm(false);
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRoom}
                disabled={!normalizeRoomName(roomDraft)}
                className="btn-primary flex-1"
              >
                Add Room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
