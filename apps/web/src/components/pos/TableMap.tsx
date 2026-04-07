'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MagnifyingGlassMinusIcon, MagnifyingGlassPlusIcon, TableCellsIcon, UsersIcon } from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { motion } from 'framer-motion';

import api from '@/lib/api';
import {
  CANVAS_PADDING,
  coerceFloorPlan,
  getBarSeatCountForRoom,
  getBarWalkwayDisplaySegments,
  getCanvasBounds,
  getRoomCenter,
  getTableAssignment,
  getTableRoomName,
  isBarSeatTable,
  sortFloorRooms,
} from '@/lib/floor-plan';
import { useAuthStore } from '@/store';

interface Props {
  locationId: string;
  onTableSelect: (table: any) => void;
  selectedTableId?: string;
  initialTables?: any[];
}

const STATUS_STYLES: Record<string, string> = {
  AVAILABLE: 'bg-green-500/10 border-green-500/80 text-green-300',
  OCCUPIED: 'bg-blue-500/10 border-blue-500/80 text-blue-300',
  RESERVED: 'bg-purple-500/10 border-purple-500/80 text-purple-300',
  DIRTY: 'bg-yellow-500/10 border-yellow-500/80 text-yellow-300',
  BLOCKED: 'bg-slate-700/50 border-slate-600/80 text-slate-400',
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
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function TableMap({ locationId, onTableSelect, selectedTableId, initialTables = [] }: Props) {
  const { user } = useAuthStore();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const desktopViewportRef = useRef<HTMLDivElement>(null);
  const [desktopViewport, setDesktopViewport] = useState({ width: 0, height: 0 });
  const [zoomLevel, setZoomLevel] = useState(1);
  const [blockedTable, setBlockedTable] = useState<{
    table: any;
    assignment: ReturnType<typeof getTableAssignment>;
    order: any;
  } | null>(null);

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
  const sections = rooms.map((room) => room.name);
  const focusedSection = activeSection || sections[0] || null;
  const activeRoom = focusedSection ? roomMap.get(focusedSection) || null : null;
  const filtered = focusedSection
    ? tables.filter((table: any) => getTableRoomName(table) === focusedSection)
    : tables;
  const mobileTables = [...filtered].sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  const canvasSize = activeRoom
    ? getCanvasBounds([
        {
          ...activeRoom,
          x: CANVAS_PADDING,
          y: CANVAS_PADDING,
        },
      ])
    : getCanvasBounds(rooms);
  const isSingleRoomLayout = rooms.length === 1;
  const assignmentSummary = useMemo(() => {
    const counts = new Map<string, { serverId: string; serverName: string; assigned: number; open: number }>();

    floorPlan.tableAssignments.forEach((assignment) => {
      const table = tables.find((entry) => entry.id === assignment.tableId);
      if (!table) return;

      const current = counts.get(assignment.serverId) || {
        serverId: assignment.serverId,
        serverName: assignment.serverName,
        assigned: 0,
        open: 0,
      };

      current.assigned += 1;
      if (table.status === 'AVAILABLE') current.open += 1;
      counts.set(assignment.serverId, current);
    });

    return Array.from(counts.values()).sort((left, right) => left.serverName.localeCompare(right.serverName));
  }, [floorPlan.tableAssignments, tables]);
  const isRestrictedRole = ['SERVER', 'BARTENDER'].includes(String(user?.role || '').toUpperCase());

  useEffect(() => {
    if (!focusedSection || focusedSection === activeSection) return;
    setActiveSection(focusedSection);
  }, [activeSection, focusedSection]);

  useEffect(() => {
    const node = desktopViewportRef.current;
    if (!node) return;

    const updateViewport = (width: number, height: number) => {
      setDesktopViewport({ width, height });
    };

    updateViewport(node.clientWidth, node.clientHeight);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      updateViewport(entry.contentRect.width, entry.contentRect.height);
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const desktopScale = useMemo(() => {
    if (!activeRoom || desktopViewport.width === 0 || desktopViewport.height === 0) return 1;

    const widthScale = (desktopViewport.width - 8) / canvasSize.width;
    const heightScale = (desktopViewport.height - 8) / canvasSize.height;

    // Bias toward larger default table sizing on roomy viewports, while still fitting dense plans.
    return Math.max(0.72, Math.min(widthScale, heightScale, activeRoom ? 1.58 : 1.3));
  }, [activeRoom, canvasSize.height, canvasSize.width, desktopViewport.height, desktopViewport.width]);

  useEffect(() => {
    setZoomLevel(1);
  }, [focusedSection, locationId]);

  const counts = {
    available: tables.filter((table: any) => table.status === 'AVAILABLE').length,
    occupied: tables.filter((table: any) => table.status === 'OCCUPIED').length,
    dirty: tables.filter((table: any) => table.status === 'DIRTY').length,
  };
  const totalAssignedTables = assignmentSummary.reduce((sum, entry) => sum + entry.assigned, 0);

  const handleTablePress = (table: any) => {
    const assignment = getTableAssignment(floorPlan.tableAssignments, table.id);
    const order = table.orders?.[0] || null;

    if (isRestrictedRole && assignment?.serverId !== user?.id) {
      setBlockedTable({ table, assignment, order });
      return;
    }

    onTableSelect(table);
  };

  const renderBarFeature = (room: any) => {
    if (room.type !== 'bar' || !room.bar?.enabled) return null;

    const bar = room.bar;

    return (
      <>
        <div
          style={{
            position: 'absolute',
            left: bar.counterX,
            top: bar.counterY,
            width: Math.min(room.width - 56, bar.counterWidth),
            height: bar.counterHeight,
            borderRadius: bar.style === 'circle' ? '999px' : `${Math.max(24, Math.round(bar.counterRadius))}px`,
          }}
          className="border border-amber-400/35 bg-amber-500/10"
        >
          <div className="flex h-full items-center justify-center text-xs font-black uppercase tracking-[0.35em] text-amber-100/80">
            Bar
          </div>
        </div>
        {getBarWalkwayDisplaySegments(room).map((walkway) => (
          <div
            key={walkway.id}
            style={walkway.style}
            className="pointer-events-none rounded-full border border-dashed border-amber-300/30 bg-amber-100/5"
          />
        ))}
      </>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="flex gap-3 overflow-x-auto border-b border-white/10 bg-slate-950/55 px-4 py-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-8 w-24 animate-pulse rounded-xl bg-white/10" />
          ))}
        </div>
        <div className="grid flex-1 grid-cols-1 gap-3 p-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-3xl bg-white/10 md:aspect-square md:h-auto"
            />
          ))}
        </div>
      </div>
    );
  }

  const renderDesktopRoom = (room: any) => {
    const renderedRoom = activeRoom || isSingleRoomLayout
      ? {
          ...room,
          x: CANVAS_PADDING,
          y: CANVAS_PADDING,
          width: Math.max(room.width, canvasSize.width - CANVAS_PADDING * 2),
          height: Math.max(room.height, canvasSize.height - CANVAS_PADDING * 2),
        }
      : room;
    const roomOrigin = activeRoom ? { x: CANVAS_PADDING, y: CANVAS_PADDING } : { x: renderedRoom.x, y: renderedRoom.y };
    const roomTables = (tablesByRoom.get(room.name) || []).sort((a, b) =>
      String(a.name || '').localeCompare(String(b.name || ''))
    );
    const barSeatCount =
      renderedRoom.type === 'bar'
        ? getBarSeatCountForRoom(renderedRoom, roomTables, floorPlan.tableMetadata)
        : 0;

    return (
      <div
        key={room.name}
        style={{
          position: 'absolute',
          left: roomOrigin.x,
          top: roomOrigin.y,
          width: renderedRoom.width,
          height: renderedRoom.height,
        }}
        className={clsx(
          'rounded-3xl border-2 shadow-lg transition-all overflow-hidden',
          renderedRoom.type === 'bar'
            ? 'bg-slate-800/50 border-slate-700'
            : 'bg-slate-800/50 border-slate-700',
        )}
      >
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_left,rgba(148,163,184,0.08),transparent_40%)]" />
        <div className="absolute left-4 top-3 z-[2] rounded-full bg-slate-900/80 px-3 py-1 text-sm font-semibold text-slate-100 backdrop-blur-sm">
          {renderedRoom.name}
        </div>

        {renderBarFeature(renderedRoom)}

        {roomTables.map((table: any) => {
          const isSelected = table.id === selectedTableId;
          const hasOrder = table.orders && table.orders.length > 0;
          const order = hasOrder ? table.orders[0] : null;
          const assignment = getTableAssignment(floorPlan.tableAssignments, table.id);
          const elapsed = order
            ? Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000)
            : 0;
          const isBarSeat = isBarSeatTable(table, renderedRoom, floorPlan.tableMetadata);

          return (
            <motion.button
              key={table.id}
              type="button"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleTablePress(table)}
              style={{
                position: 'absolute',
                left: table.positionX,
                top: table.positionY,
                width: Math.max(table.width || 80, isBarSeat ? 68 : 96),
                height: Math.max(table.height || 80, isBarSeat ? 68 : 96),
                borderRadius:
                  table.shape === 'circle'
                    ? '50%'
                    : table.shape === 'square'
                      ? '16px'
                      : '16px',
              }}
              className={clsx(
                'border-2 flex flex-col items-center justify-center px-2 text-center transition-all backdrop-blur-sm shadow-md',
                STATUS_STYLES[table.status] || STATUS_STYLES.AVAILABLE,
                isSelected ? 'ring-4 ring-cyan-400 ring-offset-2 ring-offset-slate-900' : 'hover:ring-2 hover:ring-cyan-400',
                isBarSeat ? 'border-amber-400/80' : '',
                table.status === 'BLOCKED' ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
              )}
            >
              <span className="font-bold text-lg leading-none">{table.name}</span>
              {table.capacity && (
                <span className="mt-1 text-xs leading-none opacity-80">{table.capacity}p</span>
              )}
              {hasOrder && (
                <span className="mt-1 text-xs font-semibold leading-none opacity-90">{elapsed}m</span>
              )}
              {order && (
                <span className="mt-1 truncate px-1 text-xs leading-none opacity-80">
                  {formatCurrency(order.total)}
                </span>
              )}
              {assignment && (
                <span className="mt-1.5 max-w-[88%] truncate rounded-full bg-slate-900/50 px-2 py-0.5 text-[10px] font-semibold leading-none text-blue-200">
                  {assignment.serverName}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-white/10 bg-slate-950/70 px-2 py-2 md:px-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-auto flex min-w-0 items-center gap-2">
            <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-slate-200">
              <TableCellsIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-black text-white md:text-base">
                {focusedSection ? focusedSection : 'Floor'}
              </h2>
              <p className="truncate text-[11px] text-slate-500">
                {filtered.length} tables
                {assignmentSummary.length > 0 ? ` • ${totalAssignedTables} assigned` : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-200">
              {counts.available} open
            </span>
            <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-2.5 py-1 text-[11px] font-semibold text-blue-200">
              {counts.occupied} occupied
            </span>
            <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200">
              {counts.dirty} dirty
            </span>
            {assignmentSummary.length > 0 && (
              <span className="hidden rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-300 lg:inline-flex lg:items-center lg:gap-1.5">
                <UsersIcon className="h-3.5 w-3.5" />
                {assignmentSummary.length} sections
              </span>
            )}
            <div className="ml-1 hidden items-center gap-1 md:flex">
              <button
                type="button"
                onClick={() => setZoomLevel((current) => Math.max(0.82, Number((current - 0.08).toFixed(2))))}
                className="touch-target inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
                aria-label="Zoom out floor plan"
              >
                <MagnifyingGlassMinusIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                className="touch-target rounded-2xl border border-white/10 bg-white/5 px-2.5 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
              >
                Fit
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel((current) => Math.min(1.42, Number((current + 0.08).toFixed(2))))}
                className="touch-target inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
                aria-label="Zoom in floor plan"
              >
                <MagnifyingGlassPlusIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          {sections.map((section) => (
            <button
              key={section}
              type="button"
              onClick={() => setActiveSection(section)}
              className={clsx(
                'touch-target whitespace-nowrap rounded-xl border px-3 py-1.5 text-xs font-bold transition-all',
                focusedSection === section
                  ? 'border-cyan-400 bg-cyan-400 text-slate-950'
                  : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white',
              )}
            >
              {section}
            </button>
          ))}
        </div>
      </div>

      {assignmentSummary.length > 0 && (
        <div className="hidden shrink-0 border-b border-white/10 bg-slate-950/40 px-3 py-1.5 lg:block">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {assignmentSummary.map((summary) => (
              <div key={summary.serverId} className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-300">
                <span className="font-semibold text-slate-100">{summary.serverName}</span>
                <span className="ml-1.5 text-slate-500">{summary.assigned}</span>
                <span className="ml-1 text-emerald-300">{summary.open} open</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-3 md:hidden">
        {focusedSection ? (
          mobileTables.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {mobileTables.map((table: any) => {
                const isSelected = table.id === selectedTableId;
                const hasOrder = table.orders && table.orders.length > 0;
                const order = hasOrder ? table.orders[0] : null;
                const assignment = getTableAssignment(floorPlan.tableAssignments, table.id);
                const elapsed = order
                  ? Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000)
                  : 0;

                return (
                  <button
                    key={table.id}
                    type="button"
                    onClick={() => handleTablePress(table)}
                    className={clsx(
                      'touch-target flex min-h-[112px] flex-col rounded-3xl border-2 p-4 text-left transition-all',
                      STATUS_STYLES[table.status] || 'table-available',
                      isSelected ? 'ring-4 ring-cyan-400 ring-offset-2 ring-offset-slate-900' : 'hover:bg-slate-800/50',
                      table.status === 'BLOCKED' ? 'opacity-60' : '',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold">{table.name}</p>
                        <p className="mt-1 text-xs opacity-80">
                          {getTableRoomName(table)}
                          {table.capacity ? ` | ${table.capacity} seats` : ''}
                        </p>
                        {assignment && <p className="mt-1 text-xs font-semibold text-blue-200/80">{assignment.serverName}</p>}
                      </div>
                      <span className={clsx('text-xs font-semibold', STATUS_ACCENTS[table.status] || 'text-slate-300')}>
                        {STATUS_LABELS[table.status] || table.status}
                      </span>
                    </div>

                    <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                      <div className="text-xs opacity-80">
                        {hasOrder ? `${elapsed} min active` : 'Ready for service'}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">
                          {hasOrder ? formatCurrency(order?.total) : ''}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex h-full min-h-[280px] items-center justify-center rounded-3xl border-2 border-dashed border-slate-700 bg-slate-800/50 px-6 text-center text-sm text-slate-500">
              No tables found. Add tables in Admin / Floor Plan.
            </div>
          )
        ) : rooms.length > 0 ? (
          <div className="space-y-4">
            {rooms.map((room) => {
              const roomTables = (tablesByRoom.get(room.name) || []).sort((a, b) =>
                String(a.name || '').localeCompare(String(b.name || ''))
              );
              const barSeatCount = room.type === 'bar' ? getBarSeatCountForRoom(room, roomTables, floorPlan.tableMetadata) : 0;

              return (
                <section key={room.name} className="rounded-3xl border-2 border-slate-700 bg-slate-800/50 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-slate-100">{room.name}</h3>
                      <p className="text-xs text-slate-400">
                        {room.type === 'bar'
                          ? `Bar / ${barSeatCount} stools / ${roomTables.length - barSeatCount} tables`
                          : `Room / ${roomTables.length} tables`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveSection(room.name)}
                      className="rounded-lg bg-cyan-400 px-4 py-2 text-xs font-semibold text-slate-950 transition-all hover:bg-cyan-300"
                    >
                      Focus
                    </button>
                  </div>

                  {roomTables.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {roomTables.map((table: any) => {
                        const isSelected = table.id === selectedTableId;
                        const hasOrder = table.orders && table.orders.length > 0;
                        const order = hasOrder ? table.orders[0] : null;
                        const assignment = getTableAssignment(floorPlan.tableAssignments, table.id);

                        return (
                          <button
                            key={table.id}
                            type="button"
                            onClick={() => handleTablePress(table)}
                            className={clsx(
                              'touch-target flex min-h-[104px] flex-col rounded-2xl border-2 p-4 text-left transition-all',
                              STATUS_STYLES[table.status] || 'table-available',
                              isSelected ? 'ring-4 ring-cyan-400 ring-offset-2 ring-offset-slate-900' : 'hover:bg-slate-800/50',
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold">{table.name}</p>
                                <p className="mt-1 text-xs opacity-80">{table.capacity || 0} seats</p>
                                {assignment && <p className="mt-1 text-xs font-semibold text-blue-200/80">{assignment.serverName}</p>}
                              </div>
                              <span className={clsx('text-xs font-semibold', STATUS_ACCENTS[table.status] || 'text-slate-300')}>
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
                    <div className="rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900/50 px-4 py-6 text-center text-sm text-slate-500">
                      No tables in this room yet.
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        ) : (
          <div className="flex h-full min-h-[280px] items-center justify-center rounded-3xl border-2 border-dashed border-slate-700 bg-slate-800/50 px-6 text-center text-sm text-slate-500">
            No tables found. Add tables in Admin / Floor Plan.
          </div>
        )}
      </div>

      <div ref={desktopViewportRef} className="relative hidden min-h-0 flex-1 overflow-auto bg-slate-950/40 p-1.5 md:block">
        <div className="workspace-panel flex min-h-full w-full items-start justify-start p-1.5">
          <div
            style={{
              width: canvasSize.width * desktopScale * zoomLevel,
              height: canvasSize.height * desktopScale * zoomLevel,
            }}
          >
            <div
              className="relative origin-top-left bg-slate-950 select-none"
              style={{
                width: canvasSize.width,
                height: canvasSize.height,
                transform: `scale(${desktopScale * zoomLevel})`,
                backgroundImage: 'radial-gradient(circle, rgba(71,85,105,0.45) 1px, transparent 1px)',
                backgroundSize: '30px 30px',
                borderRadius: '28px',
                overflow: 'hidden',
              }}
            >
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
        </div>
      </div>

      {blockedTable && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border-2 border-slate-700 bg-slate-800 p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-100">Table Not In Your Section</h3>
            <p className="mt-2 text-sm text-slate-400">
              Table {blockedTable.table.name} is currently{' '}
              <span className="font-semibold text-slate-200">
                {STATUS_LABELS[blockedTable.table.status] || blockedTable.table.status}
              </span>
              .
            </p>
            <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900/50 p-4 text-sm text-slate-300">
              <p>
                Assigned to:{' '}
                <span className="font-semibold text-slate-100">
                  {blockedTable.assignment?.serverName || 'No one yet'}
                </span>
              </p>
              <p className="mt-2">
                Current check:{' '}
                <span className="font-semibold text-slate-100">
                  {blockedTable.order ? formatCurrency(blockedTable.order.total) : 'No open check'}
                </span>
              </p>
              {blockedTable.order?.serverName && (
                <p className="mt-2">
                  Active server: <span className="font-semibold text-slate-100">{blockedTable.order.serverName}</span>
                </p>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setBlockedTable(null)}
                className="touch-target rounded-2xl bg-cyan-400 px-5 py-2 text-sm font-semibold text-slate-950 transition-all hover:bg-cyan-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
