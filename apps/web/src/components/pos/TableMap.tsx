'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { motion } from 'framer-motion';

import api from '@/lib/api';
import {
  CANVAS_PADDING,
  coerceFloorPlan,
  getCanvasBounds,
  getRoomCenter,
  getTableRoomName,
  sortFloorRooms,
} from '@/lib/floor-plan';

interface Props {
  locationId: string;
  onTableSelect: (table: any) => void;
  selectedTableId?: string;
  initialTables?: any[];
}

const STATUS_STYLES: Record<string, string> = {
  AVAILABLE: 'table-available',
  OCCUPIED: 'table-occupied',
  RESERVED: 'table-reserved',
  DIRTY: 'table-dirty',
  BLOCKED: 'table-blocked',
};

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Available',
  OCCUPIED: 'Occupied',
  RESERVED: 'Reserved',
  DIRTY: 'Needs Cleaning',
  BLOCKED: 'Blocked',
};

const STATUS_ACCENTS: Record<string, string> = {
  AVAILABLE: 'text-emerald-300',
  OCCUPIED: 'text-blue-300',
  RESERVED: 'text-purple-300',
  DIRTY: 'text-yellow-300',
  BLOCKED: 'text-slate-400',
};

function formatCurrency(amount?: number) {
  return `$${Number(amount || 0).toFixed(0)}`;
}

export function TableMap({ locationId, onTableSelect, selectedTableId, initialTables = [] }: Props) {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['tables', locationId],
    queryFn: () => api.getTables({ locationId }),
    refetchInterval: 30000,
    enabled: !!locationId,
    initialData: initialTables.length > 0 ? { success: true, data: initialTables } : undefined,
  });

  const { data: locationsData } = useQuery({
    queryKey: ['locations'],
    queryFn: () => api.getLocations(),
    enabled: !!locationId,
  });

  const tables: any[] = data?.data || [];
  const locations: any[] = locationsData?.data || [];
  const currentLocation = locations.find((location) => location.id === locationId) || null;
  const floorPlan = useMemo(
    () => coerceFloorPlan(currentLocation?.settings?.floorPlan, tables),
    [currentLocation?.settings?.floorPlan, tables]
  );
  const rooms = useMemo(() => sortFloorRooms(floorPlan.rooms), [floorPlan.rooms]);
  const roomMap = useMemo(() => new Map(rooms.map((room) => [room.name, room] as const)), [rooms]);
  const tablesByRoom = useMemo(() => {
    const grouped = new Map<string, any[]>();

    tables.forEach((table) => {
      const roomName = getTableRoomName(table);
      if (!grouped.has(roomName)) grouped.set(roomName, []);
      grouped.get(roomName)!.push(table);
    });

    return grouped;
  }, [tables]);
  const activeRoom = activeSection ? roomMap.get(activeSection) || null : null;
  const sections = rooms.map((room) => room.name);
  const filtered = activeSection
    ? tables.filter((table: any) => getTableRoomName(table) === activeSection)
    : tables;
  const mobileTables = [...filtered].sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  const canvasSize = activeRoom
    ? {
        width: Math.max(760, activeRoom.width + CANVAS_PADDING * 2),
        height: Math.max(600, activeRoom.height + CANVAS_PADDING * 2),
      }
    : getCanvasBounds(rooms);

  const counts = {
    available: tables.filter((table: any) => table.status === 'AVAILABLE').length,
    occupied: tables.filter((table: any) => table.status === 'OCCUPIED').length,
    dirty: tables.filter((table: any) => table.status === 'DIRTY').length,
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="flex gap-3 overflow-x-auto border-b border-slate-700 bg-slate-900 px-4 py-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-8 w-24 animate-pulse rounded-xl bg-slate-800" />
          ))}
        </div>
        <div className="grid flex-1 grid-cols-1 gap-3 p-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-3xl bg-slate-800 md:aspect-square md:h-auto"
            />
          ))}
        </div>
      </div>
    );
  }

  const renderDesktopRoom = (room: any) => {
    const roomOrigin = activeRoom ? { x: CANVAS_PADDING, y: CANVAS_PADDING } : { x: room.x, y: room.y };
    const roomTables = (tablesByRoom.get(room.name) || []).sort((a, b) =>
      String(a.name || '').localeCompare(String(b.name || ''))
    );

    return (
      <div
        key={room.name}
        style={{
          position: 'absolute',
          left: roomOrigin.x,
          top: roomOrigin.y,
          width: room.width,
          height: room.height,
        }}
        className={clsx(
          'overflow-hidden rounded-[32px] border shadow-2xl',
          room.type === 'bar'
            ? 'border-amber-500/30 bg-[linear-gradient(160deg,rgba(120,53,15,0.32),rgba(15,23,42,0.92))]'
            : 'border-slate-700 bg-[linear-gradient(160deg,rgba(15,23,42,0.92),rgba(30,41,59,0.88))]'
        )}
      >
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_left,rgba(148,163,184,0.12),transparent_40%)]" />
        <div className="absolute left-4 top-4 z-[2] rounded-full border border-slate-700 bg-slate-950/85 px-3 py-1.5 text-xs font-semibold text-slate-100">
          {room.name}
        </div>
        <div className="absolute right-4 top-4 z-[2] rounded-full bg-slate-950/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
          {room.type === 'bar' ? `${room.bar?.seatCount || roomTables.length} seats` : `${roomTables.length} tables`}
        </div>

        {room.type === 'bar' && room.bar?.enabled && (
          <div
            style={{
              position: 'absolute',
              left: room.bar.counterX,
              top: room.bar.counterY,
              width: Math.min(room.width - 56, room.bar.counterWidth),
              height: room.bar.counterHeight,
            }}
            className="rounded-[24px] border border-amber-400/35 bg-amber-500/10"
          >
            <div className="flex h-full items-center justify-center text-xs font-black uppercase tracking-[0.35em] text-amber-100/80">
              Bar
            </div>
          </div>
        )}

        {roomTables.map((table: any) => {
          const isSelected = table.id === selectedTableId;
          const hasOrder = table.orders && table.orders.length > 0;
          const order = hasOrder ? table.orders[0] : null;
          const elapsed = order
            ? Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000)
            : 0;

          return (
            <motion.button
              key={table.id}
              type="button"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onTableSelect(table)}
              style={{
                position: 'absolute',
                left: table.positionX,
                top: table.positionY,
                width: table.width || 80,
                height: table.height || 80,
                borderRadius:
                  table.shape === 'circle'
                    ? '50%'
                    : table.shape === 'square'
                      ? '12px'
                      : '12px',
              }}
              className={`border-2 flex flex-col items-center justify-center transition-all
                ${STATUS_STYLES[table.status] || 'table-available'}
                ${isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-900' : ''}
                ${table.status === 'BLOCKED' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:brightness-110'}
              `}
            >
              <span className="font-bold text-sm leading-none">{table.name}</span>
              {table.capacity && (
                <span className="mt-0.5 text-xs leading-none opacity-70">{table.capacity}p</span>
              )}
              {hasOrder && (
                <span className="mt-0.5 text-xs font-semibold leading-none opacity-90">{elapsed}m</span>
              )}
              {order && (
                <span className="mt-0.5 truncate px-1 text-xs leading-none opacity-75">
                  {formatCurrency(order.total)}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-slate-700 bg-slate-900 px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-400">{counts.available} Available</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />
            <span className="text-slate-400">{counts.occupied} Occupied</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-yellow-500" />
            <span className="text-slate-400">{counts.dirty} Dirty</span>
          </div>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveSection(null)}
            className={`touch-target rounded-xl px-3 text-xs font-medium transition-all ${
              !activeSection ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'
            }`}
          >
            All Rooms
          </button>
          {sections.map((section) => (
            <button
              key={section}
              type="button"
              onClick={() => setActiveSection(section === activeSection ? null : section)}
              className={`touch-target whitespace-nowrap rounded-xl px-3 text-xs font-medium transition-all ${
                activeSection === section ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {section}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:hidden">
        {activeSection ? (
          mobileTables.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {mobileTables.map((table: any) => {
                const isSelected = table.id === selectedTableId;
                const hasOrder = table.orders && table.orders.length > 0;
                const order = hasOrder ? table.orders[0] : null;
                const elapsed = order
                  ? Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000)
                  : 0;

                return (
                  <button
                    key={table.id}
                    type="button"
                    onClick={() => onTableSelect(table)}
                    className={`touch-target flex min-h-[112px] flex-col rounded-[28px] border-2 p-4 text-left transition
                      ${STATUS_STYLES[table.status] || 'table-available'}
                      ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-950' : ''}
                      ${table.status === 'BLOCKED' ? 'opacity-60' : 'hover:brightness-110'}
                    `}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold">{table.name}</p>
                        <p className="mt-1 text-xs opacity-80">
                          {getTableRoomName(table)}
                          {table.capacity ? ` | ${table.capacity} seats` : ''}
                        </p>
                      </div>
                      <span className={`text-xs font-semibold ${STATUS_ACCENTS[table.status] || 'text-slate-300'}`}>
                        {STATUS_LABELS[table.status] || table.status}
                      </span>
                    </div>

                    <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                      <div className="text-xs opacity-80">
                        {hasOrder ? `${elapsed} min active` : 'Ready for service'}
                      </div>
                      <div className="text-right">
                        <p className="text-xs opacity-70">{hasOrder ? 'Open check' : 'Status'}</p>
                        <p className="text-sm font-semibold">
                          {hasOrder ? formatCurrency(order?.total) : STATUS_LABELS[table.status] || table.status}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex h-full min-h-[280px] items-center justify-center rounded-[28px] border border-dashed border-slate-700 bg-slate-900/60 px-6 text-center text-sm text-slate-500">
              No tables found. Add tables in Admin / Floor Plan.
            </div>
          )
        ) : rooms.length > 0 ? (
          <div className="space-y-4">
            {rooms.map((room) => {
              const roomTables = (tablesByRoom.get(room.name) || []).sort((a, b) =>
                String(a.name || '').localeCompare(String(b.name || ''))
              );

              return (
                <section key={room.name} className="rounded-[28px] border border-slate-800 bg-slate-900/70 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-100">{room.name}</h3>
                      <p className="text-xs text-slate-500">
                        {room.type === 'bar' ? 'Bar map' : 'Room map'} · {roomTables.length} tables
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveSection(room.name)}
                      className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200"
                    >
                      Focus Room
                    </button>
                  </div>

                  {roomTables.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {roomTables.map((table: any) => {
                        const isSelected = table.id === selectedTableId;
                        const hasOrder = table.orders && table.orders.length > 0;
                        const order = hasOrder ? table.orders[0] : null;

                        return (
                          <button
                            key={table.id}
                            type="button"
                            onClick={() => onTableSelect(table)}
                            className={`touch-target flex min-h-[104px] flex-col rounded-[24px] border-2 p-4 text-left transition
                              ${STATUS_STYLES[table.status] || 'table-available'}
                              ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-950' : ''}
                            `}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold">{table.name}</p>
                                <p className="mt-1 text-xs opacity-80">{table.capacity || 0} seats</p>
                              </div>
                              <span className={`text-xs font-semibold ${STATUS_ACCENTS[table.status] || 'text-slate-300'}`}>
                                {STATUS_LABELS[table.status] || table.status}
                              </span>
                            </div>
                            <div className="mt-auto pt-3 text-xs opacity-80">
                              {order ? `Open check ${formatCurrency(order.total)}` : 'Ready for service'}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 px-4 py-6 text-center text-sm text-slate-500">
                      No tables in this room yet.
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        ) : (
          <div className="flex h-full min-h-[280px] items-center justify-center rounded-[28px] border border-dashed border-slate-700 bg-slate-900/60 px-6 text-center text-sm text-slate-500">
            No tables found. Add tables in Admin / Floor Plan.
          </div>
        )}
      </div>

      <div className="relative hidden flex-1 overflow-auto p-4 md:block">
        <div className="relative" style={{ width: canvasSize.width, height: canvasSize.height, minWidth: 720, minHeight: 640 }}>
          {!activeRoom && floorPlan.connections.length > 0 && (
            <svg className="absolute inset-0 pointer-events-none" width={canvasSize.width} height={canvasSize.height}>
              {floorPlan.connections.map((connection) => {
                const fromRoom = roomMap.get(connection.from);
                const toRoom = roomMap.get(connection.to);
                if (!fromRoom || !toRoom) return null;

                const fromCenter = getRoomCenter(fromRoom);
                const toCenter = getRoomCenter(toRoom);

                return (
                  <g key={connection.id}>
                    <line
                      x1={fromCenter.x}
                      y1={fromCenter.y}
                      x2={toCenter.x}
                      y2={toCenter.y}
                      stroke="rgba(96,165,250,0.55)"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray="10 12"
                    />
                    <circle cx={fromCenter.x} cy={fromCenter.y} r="6" fill="rgba(147,197,253,0.85)" />
                    <circle cx={toCenter.x} cy={toCenter.y} r="6" fill="rgba(147,197,253,0.85)" />
                  </g>
                );
              })}
            </svg>
          )}

          {(activeRoom ? [activeRoom] : rooms).map(renderDesktopRoom)}

          {tables.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-500">
              No tables found. Add tables in Admin / Floor Plan.
            </div>
          )}
        </div>
      </div>

      <div className="hidden shrink-0 items-center gap-4 border-t border-slate-700 bg-slate-900 px-4 py-2 md:flex">
        {Object.entries(STATUS_LABELS).map(([status, label]) => (
          <div key={status} className="flex items-center gap-1.5 text-xs text-slate-400">
            <div className={`h-3 w-3 rounded-sm border ${STATUS_STYLES[status]}`} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
