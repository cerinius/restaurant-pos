'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';

import api from '@/lib/api';
import {
  CANVAS_PADDING,
  ROOM_INNER_PADDING,
  applyAutoLayoutToFloorPlan,
  buildBarSeatDrafts,
  coerceFloorPlan,
  createFloorRoom,
  getCanvasBounds,
  getRoomCenter,
  getTableRoomName,
  makeConnectionId,
  normalizeRoomName,
  resizeBarRoomForSeatCount,
  sortFloorRooms,
  type FloorPlanRoom,
  type FloorPlanSettings,
  type FloorRoomType,
} from '@/lib/floor-plan';
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
const EMPTY_FLOOR_PLAN = coerceFloorPlan(null, []);

function parseNumberInput(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function reorderRooms(rooms: FloorPlanRoom[], roomName: string, targetOrder: number) {
  const existingRoom = rooms.find((room) => room.name === roomName);
  if (!existingRoom) return rooms;

  const remainingRooms = sortFloorRooms(rooms).filter((room) => room.name !== roomName);
  const insertIndex = clamp(targetOrder - 1, 0, remainingRooms.length);
  remainingRooms.splice(insertIndex, 0, existingRoom);

  return remainingRooms.map((room, index) => ({
    ...room,
    order: index + 1,
  }));
}

function getRoomBadgeStyle(type: FloorRoomType) {
  return type === 'bar'
    ? 'bg-amber-500/20 border border-amber-400/40 text-amber-100'
    : 'bg-slate-900/80 border border-slate-700 text-slate-200';
}

export default function FloorPlanPage() {
  const { locationId } = useAuthStore();
  const qc = useQueryClient();
  const canvasRef = useRef<HTMLDivElement>(null);

  const [draggingTable, setDraggingTable] = useState<{ id: string; roomName: string } | null>(null);
  const [draggingRoom, setDraggingRoom] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedRoomName, setSelectedRoomName] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddRoomForm, setShowAddRoomForm] = useState(false);
  const [newTable, setNewTable] = useState(DEFAULT_TABLE);
  const [roomDraft, setRoomDraft] = useState('');
  const [roomDraftType, setRoomDraftType] = useState<FloorRoomType>('room');
  const [barSeatCount, setBarSeatCount] = useState(8);
  const [extraBarSeats, setExtraBarSeats] = useState(4);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [draftFloorPlan, setDraftFloorPlan] = useState<FloorPlanSettings>(EMPTY_FLOOR_PLAN);
  const [isFloorPlanDirty, setIsFloorPlanDirty] = useState(false);
  const [isSubmittingRoom, setIsSubmittingRoom] = useState(false);
  const [isAddingBarSeats, setIsAddingBarSeats] = useState(false);

  const { data } = useQuery({
    queryKey: ['tables-floor', locationId],
    queryFn: () => api.getTables({ locationId }),
    enabled: !!locationId,
  });

  const { data: locationsData } = useQuery({
    queryKey: ['locations'],
    queryFn: () => api.getLocations(),
    enabled: !!locationId,
  });

  const tables: any[] = data?.data || [];
  const locations: any[] = locationsData?.data || [];
  const currentLocation = locations.find((location) => location.id === locationId) || null;
  const persistedFloorPlan = useMemo(
    () => coerceFloorPlan(currentLocation?.settings?.floorPlan, tables),
    [currentLocation?.settings?.floorPlan, tables]
  );

  useEffect(() => {
    if (!isFloorPlanDirty) {
      setDraftFloorPlan(persistedFloorPlan);
    }
  }, [persistedFloorPlan, isFloorPlanDirty]);

  useEffect(() => {
    if (activeRoom && !draftFloorPlan.rooms.some((room) => room.name === activeRoom)) {
      setActiveRoom(null);
    }
  }, [activeRoom, draftFloorPlan.rooms]);

  useEffect(() => {
    if (selectedRoomName && !draftFloorPlan.rooms.some((room) => room.name === selectedRoomName)) {
      setSelectedRoomName(null);
    }
  }, [draftFloorPlan.rooms, selectedRoomName]);

  const rooms = useMemo(() => sortFloorRooms(draftFloorPlan.rooms), [draftFloorPlan.rooms]);
  const roomMap = useMemo(
    () => new Map(rooms.map((room) => [room.name, room] as const)),
    [rooms]
  );
  const tablesByRoom = useMemo(() => {
    const grouped = new Map<string, any[]>();

    tables.forEach((table) => {
      const roomName = getTableRoomName(table);
      if (!grouped.has(roomName)) grouped.set(roomName, []);
      grouped.get(roomName)!.push(table);
    });

    return grouped;
  }, [tables]);
  const selected = tables.find((table) => table.id === selectedId) || null;
  const selectedRoom =
    rooms.find((room) => room.name === selectedRoomName) ||
    (activeRoom ? roomMap.get(activeRoom) || null : null);
  const roomOptions = rooms.length > 0 ? rooms.map((room) => room.name) : [DEFAULT_TABLE.section];
  const visibleRooms = activeRoom ? rooms.filter((room) => room.name === activeRoom) : rooms;
  const singleVisibleRoom = visibleRooms[0] || null;
  const visibleRoomTables = activeRoom
    ? tables.filter((table) => getTableRoomName(table) === activeRoom)
    : tables;
  const tableCountLabel =
    rooms.length > 0 ? `${tables.length} tables across ${rooms.length} rooms` : `${tables.length} tables total`;
  const hasPendingTableChanges = Object.keys(positions).length > 0;
  const hasPendingChanges = hasPendingTableChanges || isFloorPlanDirty;
  const emptyStateTitle = activeRoom ? 'No tables in this room yet' : 'No rooms yet';
  const emptyStateBody = activeRoom
    ? 'Add a table to start laying out this room.'
    : 'Add a room, or create a table to generate the first room automatically.';
  const canvasSize = useMemo(() => {
    if (singleVisibleRoom) {
      return {
        width: Math.max(980, singleVisibleRoom.width + CANVAS_PADDING * 2),
        height: Math.max(680, singleVisibleRoom.height + CANVAS_PADDING * 2),
      };
    }

    return getCanvasBounds(rooms);
  }, [rooms, singleVisibleRoom]);

  const saveLayoutMutation = useMutation({
    mutationFn: async ({
      nextPositions,
      nextFloorPlan,
    }: {
      nextPositions?: Record<string, { x: number; y: number }>;
      nextFloorPlan?: FloorPlanSettings;
    }) => {
      if (nextPositions && Object.keys(nextPositions).length > 0) {
        await api.updateTablePositions(
          Object.entries(nextPositions).map(([id, pos]) => ({
            id,
            positionX: pos.x,
            positionY: pos.y,
          }))
        );
      }

      if (nextFloorPlan && locationId) {
        await api.updateLocation(locationId, {
          settings: {
            ...(currentLocation?.settings || {}),
            floorPlan: nextFloorPlan,
          },
        });
      }

      return { nextPositions, nextFloorPlan };
    },
    onSuccess: async (_data, variables) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['tables-floor', locationId] }),
        qc.invalidateQueries({ queryKey: ['tables', locationId] }),
        qc.invalidateQueries({ queryKey: ['locations'] }),
      ]);

      if (variables.nextPositions && Object.keys(variables.nextPositions).length > 0) {
        setPositions({});
      }

      if (variables.nextFloorPlan) {
        setDraftFloorPlan(variables.nextFloorPlan);
        setIsFloorPlanDirty(false);
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to save layout');
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) => api.createTable({ ...payload, locationId }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['tables-floor', locationId] }),
        qc.invalidateQueries({ queryKey: ['tables', locationId] }),
      ]);
      setNewTable((current) => ({ ...current, ...DEFAULT_TABLE, section: current.section || DEFAULT_TABLE.section }));
      setShowAddForm(false);
      toast.success('Table added');
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Failed to add table'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteTable(id),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['tables-floor', locationId] }),
        qc.invalidateQueries({ queryKey: ['tables', locationId] }),
      ]);
      setSelectedId(null);
      toast.success('Table removed');
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Cannot delete table'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.updateTableStatus(id, status),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['tables-floor', locationId] }),
        qc.invalidateQueries({ queryKey: ['tables', locationId] }),
      ]);
      toast.success('Table status updated');
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Failed to update status'),
  });

  const getTablePos = (table: any) => positions[table.id] || { x: table.positionX, y: table.positionY };

  const getCanvasPointer = (event: React.MouseEvent | MouseEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };

    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: event.clientX - rect.left + canvasRef.current.scrollLeft,
      y: event.clientY - rect.top + canvasRef.current.scrollTop,
    };
  };

  const getRoomOrigin = (room: FloorPlanRoom) => {
    return activeRoom ? { x: CANVAS_PADDING, y: CANVAS_PADDING } : { x: room.x, y: room.y };
  };

  const updateDraftPlan = (updater: (current: FloorPlanSettings) => FloorPlanSettings) => {
    setDraftFloorPlan((current) => coerceFloorPlan(updater(current), tables));
    setIsFloorPlanDirty(true);
  };

  const persistFloorPlan = async (nextFloorPlan: FloorPlanSettings, successMessage: string) => {
    await saveLayoutMutation.mutateAsync({ nextFloorPlan });
    toast.success(successMessage);
  };

  const saveAllChanges = () => {
    saveLayoutMutation.mutate(
      {
        nextPositions: hasPendingTableChanges ? positions : undefined,
        nextFloorPlan: isFloorPlanDirty ? draftFloorPlan : undefined,
      },
      {
        onSuccess: () => {
          toast.success('Floor plan saved');
        },
      }
    );
  };

  const setLayoutModeAuto = () => {
    setDraftFloorPlan((current) => applyAutoLayoutToFloorPlan(current));
    setIsFloorPlanDirty(true);
  };

  const setLayoutModeManual = () => {
    updateDraftPlan((current) => ({
      ...current,
      layoutMode: 'manual',
    }));
  };

  const handleTableMouseDown = (event: React.MouseEvent, table: any, roomName: string) => {
    event.preventDefault();
    event.stopPropagation();

    const room = roomMap.get(roomName);
    if (!room) return;

    const pointer = getCanvasPointer(event);
    const pos = getTablePos(table);
    const roomOrigin = getRoomOrigin(room);

    setDraggingTable({ id: table.id, roomName });
    setDragOffset({
      x: pointer.x - (roomOrigin.x + pos.x),
      y: pointer.y - (roomOrigin.y + pos.y),
    });
    setSelectedId(table.id);
    setSelectedRoomName(roomName);
  };

  const handleRoomMouseDown = (event: React.MouseEvent, room: FloorPlanRoom) => {
    if (activeRoom) return;

    event.preventDefault();
    event.stopPropagation();

    const pointer = getCanvasPointer(event);

    setDraggingRoom(room.name);
    setDragOffset({
      x: pointer.x - room.x,
      y: pointer.y - room.y,
    });
    setSelectedId(null);
    setSelectedRoomName(room.name);

    if (draftFloorPlan.layoutMode !== 'manual') {
      setDraftFloorPlan((current) => ({
        ...current,
        layoutMode: 'manual',
      }));
      setIsFloorPlanDirty(true);
    }
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (draggingRoom) {
      const pointer = getCanvasPointer(event);

      updateDraftPlan((current) => {
        const nextRooms = current.rooms.map((room) =>
          room.name === draggingRoom
            ? {
                ...room,
                x: Math.max(CANVAS_PADDING / 2, pointer.x - dragOffset.x),
                y: Math.max(CANVAS_PADDING / 2, pointer.y - dragOffset.y),
              }
            : room
        );
        const bounds = getCanvasBounds(nextRooms);

        return {
          ...current,
          layoutMode: 'manual',
          canvasWidth: Math.max(current.canvasWidth, bounds.width),
          canvasHeight: Math.max(current.canvasHeight, bounds.height),
          rooms: nextRooms,
        };
      });
      return;
    }

    if (!draggingTable) return;

    const room = roomMap.get(draggingTable.roomName);
    const table = tables.find((item) => item.id === draggingTable.id);
    if (!room || !table) return;

    const pointer = getCanvasPointer(event);
    const roomOrigin = getRoomOrigin(room);
    const width = Number(table.width || 100);
    const height = Number(table.height || 80);
    const localX = pointer.x - dragOffset.x - roomOrigin.x;
    const localY = pointer.y - dragOffset.y - roomOrigin.y;
    const maxX = Math.max(ROOM_INNER_PADDING, room.width - width - ROOM_INNER_PADDING);
    const maxY = Math.max(ROOM_INNER_PADDING, room.height - height - ROOM_INNER_PADDING);

    setPositions((current) => ({
      ...current,
      [draggingTable.id]: {
        x: clamp(localX, ROOM_INNER_PADDING, maxX),
        y: clamp(localY, ROOM_INNER_PADDING, maxY),
      },
    }));
  };

  const handleMouseUp = () => {
    setDraggingTable(null);
    setDraggingRoom(null);
  };

  const openAddTableForm = () => {
    setNewTable((current) => ({
      ...current,
      section: activeRoom || selectedRoomName || normalizeRoomName(current.section) || DEFAULT_TABLE.section,
    }));
    setShowAddForm(true);
  };

  const handleCreateTable = () => {
    const name = newTable.name.trim();
    const roomName = normalizeRoomName(newTable.section) || DEFAULT_TABLE.section;
    const targetRoom = roomMap.get(roomName);
    const defaultX = ROOM_INNER_PADDING + 24;
    const defaultY = targetRoom?.type === 'bar' ? 120 : ROOM_INNER_PADDING + 24;

    if (!name) {
      toast.error('Enter a table name');
      return;
    }

    createMutation.mutate({
      ...newTable,
      name,
      section: roomName,
      positionX: defaultX,
      positionY: defaultY,
    });
  };

  const handleAddRoom = async () => {
    const roomName = normalizeRoomName(roomDraft);

    if (!roomName) {
      toast.error('Enter a room name');
      return;
    }

    if (rooms.some((room) => room.name === roomName)) {
      toast.error('That room already exists');
      return;
    }

    const nextRoom = createFloorRoom(roomName, rooms.length + 1, roomDraftType, {
      seatCount: roomDraftType === 'bar' ? barSeatCount : undefined,
    });
    const nextFloorPlan = coerceFloorPlan(
      {
        ...draftFloorPlan,
        rooms: [...draftFloorPlan.rooms, nextRoom],
      },
      tables
    );

    setIsSubmittingRoom(true);

    try {
      setDraftFloorPlan(nextFloorPlan);
      await persistFloorPlan(
        nextFloorPlan,
        roomDraftType === 'bar' ? 'Bar room added' : 'Room added'
      );

      if (roomDraftType === 'bar' && locationId) {
        const seatPayloads = buildBarSeatDrafts(roomName, 0, barSeatCount);
        await Promise.all(
          seatPayloads.map((seat) => api.createTable({ ...seat, locationId }))
        );
        await Promise.all([
          qc.invalidateQueries({ queryKey: ['tables-floor', locationId] }),
          qc.invalidateQueries({ queryKey: ['tables', locationId] }),
        ]);
        toast.success(`${seatPayloads.length} bar seats added`);
      }

      setNewTable((current) => ({ ...current, section: roomName }));
      setActiveRoom(roomName);
      setSelectedRoomName(roomName);
      setRoomDraft('');
      setRoomDraftType('room');
      setBarSeatCount(8);
      setShowAddRoomForm(false);
    } catch {
      // Errors are surfaced by the mutations above.
    } finally {
      setIsSubmittingRoom(false);
    }
  };

  const handleAddBarSeats = async () => {
    if (!selectedRoom || selectedRoom.type !== 'bar' || !locationId) return;

    const existingRoomTables = tablesByRoom.get(selectedRoom.name) || [];
    const nextSeatTotal = existingRoomTables.length + extraBarSeats;
    const updatedRoom = resizeBarRoomForSeatCount(selectedRoom, nextSeatTotal);
    const nextFloorPlan = coerceFloorPlan(
      {
        ...draftFloorPlan,
        rooms: draftFloorPlan.rooms.map((room) => (room.name === selectedRoom.name ? updatedRoom : room)),
      },
      tables
    );

    setIsAddingBarSeats(true);

    try {
      setDraftFloorPlan(nextFloorPlan);
      await persistFloorPlan(nextFloorPlan, 'Bar layout updated');

      const seatPayloads = buildBarSeatDrafts(selectedRoom.name, existingRoomTables.length, extraBarSeats);
      await Promise.all(seatPayloads.map((seat) => api.createTable({ ...seat, locationId })));
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['tables-floor', locationId] }),
        qc.invalidateQueries({ queryKey: ['tables', locationId] }),
      ]);
      toast.success(`${seatPayloads.length} new bar seats added`);
    } catch {
      // Errors are surfaced by the mutations above.
    } finally {
      setIsAddingBarSeats(false);
    }
  };

  const setRoomOrder = (roomName: string, nextOrder: number) => {
    updateDraftPlan((current) => ({
      ...current,
      rooms: reorderRooms(current.rooms, roomName, nextOrder),
    }));
  };

  const toggleRoomConnection = (firstRoom: string, secondRoom: string) => {
    const connectionId = makeConnectionId(firstRoom, secondRoom);

    updateDraftPlan((current) => {
      const exists = current.connections.some((connection) => connection.id === connectionId);

      return {
        ...current,
        connections: exists
          ? current.connections.filter((connection) => connection.id !== connectionId)
          : [...current.connections, { id: connectionId, from: firstRoom, to: secondRoom }],
      };
    });
  };

  const renderRoom = (room: FloorPlanRoom) => {
    const roomOrigin = getRoomOrigin(room);
    const roomTables = (tablesByRoom.get(room.name) || []).sort((a, b) =>
      String(a.name || '').localeCompare(String(b.name || ''))
    );
    const isRoomSelected = selectedRoom?.name === room.name && !selected;

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
        onClick={() => {
          setSelectedRoomName(room.name);
          setSelectedId(null);
        }}
        className={clsx(
          'rounded-[32px] border shadow-2xl transition-all overflow-hidden',
          room.type === 'bar'
            ? 'bg-[linear-gradient(160deg,rgba(120,53,15,0.38),rgba(15,23,42,0.92))]'
            : 'bg-[linear-gradient(160deg,rgba(15,23,42,0.92),rgba(30,41,59,0.88))]',
          isRoomSelected ? 'border-blue-400 shadow-blue-950/50' : 'border-slate-700 shadow-black/40'
        )}
      >
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_left,rgba(148,163,184,0.12),transparent_40%)]" />

        <button
          type="button"
          onMouseDown={(event) => handleRoomMouseDown(event, room)}
          className={clsx(
            'absolute left-4 top-4 z-[2] rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide',
            getRoomBadgeStyle(room.type),
            activeRoom ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
          )}
        >
          {room.name}
        </button>

        <div className="absolute right-4 top-4 z-[2] rounded-full bg-slate-950/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
          {room.type === 'bar'
            ? `${room.bar?.seatCount || roomTables.length} bar seats`
            : `${roomTables.length} tables`}
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
            className="rounded-[24px] border border-amber-400/35 bg-amber-500/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
          >
            <div className="flex h-full items-center justify-center text-xs font-black uppercase tracking-[0.35em] text-amber-100/80">
              Bar
            </div>
          </div>
        )}

        {roomTables.map((table) => {
          const pos = getTablePos(table);
          const isSelected = selected?.id === table.id;
          const isPending = !!positions[table.id];

          return (
            <div
              key={table.id}
              onMouseDown={(event) => handleTableMouseDown(event, table, room.name)}
              style={{
                position: 'absolute',
                left: pos.x,
                top: pos.y,
                width: table.width || 100,
                height: table.height || 80,
                borderRadius:
                  table.shape === 'circle' ? '50%' : table.shape === 'square' ? '12px' : '10px',
                cursor: draggingTable?.id === table.id ? 'grabbing' : 'grab',
                zIndex: draggingTable?.id === table.id ? 10 : isSelected ? 6 : 2,
              }}
              className={clsx(
                'border-2 flex flex-col items-center justify-center transition-shadow backdrop-blur-sm',
                STATUS_STYLES[table.status] || STATUS_STYLES.AVAILABLE,
                isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-950 shadow-xl' : '',
                isPending ? 'opacity-80' : ''
              )}
            >
              <span className="font-black text-sm">{table.name}</span>
              <span className="text-xs opacity-70">{table.capacity}p</span>
            </div>
          );
        })}

        {roomTables.length === 0 && (
          <div className="absolute inset-0 flex items-end justify-center pb-8 text-center text-sm text-slate-400/85">
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 px-4 py-3">
              {room.type === 'bar' ? 'Add bar seats or tables to this room.' : 'Add tables to fill this room.'}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-slate-700 bg-slate-950/50 px-6 py-4 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Floor Plan Editor</h1>
          <p className="text-sm text-slate-400">
            Map rooms, connect the restaurant flow, and drag tables or rooms into place.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!activeRoom && rooms.length > 1 && (
            <>
              <button
                type="button"
                onClick={setLayoutModeAuto}
                className={clsx(
                  'px-3 py-2 rounded-xl text-xs font-semibold border transition-all',
                  draftFloorPlan.layoutMode === 'auto'
                    ? 'bg-emerald-600 border-emerald-500 text-white'
                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                )}
              >
                Auto Arrange Rooms
              </button>
              <button
                type="button"
                onClick={setLayoutModeManual}
                className={clsx(
                  'px-3 py-2 rounded-xl text-xs font-semibold border transition-all',
                  draftFloorPlan.layoutMode === 'manual'
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                )}
              >
                Manual Map
              </button>
            </>
          )}

          {hasPendingChanges && (
            <button
              onClick={saveAllChanges}
              disabled={saveLayoutMutation.isPending}
              className="btn-success flex items-center gap-2 text-sm"
            >
              {saveLayoutMutation.isPending ? 'Saving...' : 'Save Layout'}
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

      {rooms.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 bg-slate-950/40 px-6 py-3 shrink-0">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Rooms</span>

          <button
            type="button"
            onClick={() => {
              setActiveRoom(null);
              setSelectedId(null);
            }}
            className={clsx(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
              !activeRoom
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
            )}
          >
            All Rooms
          </button>

          {rooms.map((room) => (
            <button
              key={room.name}
              type="button"
              onClick={() => {
                const nextRoom = room.name === activeRoom ? null : room.name;
                setActiveRoom(nextRoom);
                setSelectedRoomName(nextRoom || room.name);
                setSelectedId(null);
              }}
              className={clsx(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
                activeRoom === room.name
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
              )}
            >
              {room.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div
          ref={canvasRef}
          className="flex-1 overflow-auto bg-slate-950 select-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(71,85,105,0.45) 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            className="relative"
            style={{
              width: canvasSize.width,
              height: canvasSize.height,
            }}
          >
            {!activeRoom && draftFloorPlan.connections.length > 0 && (
              <svg
                className="absolute inset-0 pointer-events-none"
                width={canvasSize.width}
                height={canvasSize.height}
              >
                {draftFloorPlan.connections.map((connection) => {
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

            {visibleRooms.map(renderRoom)}

            {visibleRooms.length === 0 && visibleRoomTables.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-slate-600">
                <div className="text-center">
                  <p className="mb-3 text-4xl">Floor</p>
                  <p className="font-medium">{emptyStateTitle}</p>
                  <p className="mt-1 text-sm">{emptyStateBody}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {(selected || selectedRoom) && (
          <div className="w-80 shrink-0 overflow-y-auto border-l border-slate-700 bg-slate-900 p-4">
            {selected ? (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-bold text-slate-100">Table {selected.name}</h3>
                  <button
                    onClick={() => setSelectedId(null)}
                    className="text-xs text-slate-500 hover:text-slate-300"
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
                            'w-full rounded-xl border px-3 py-1.5 text-left text-xs font-medium transition-all',
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

                  <div className="border-t border-slate-700 pt-2">
                    <p className="mb-2 text-xs text-slate-500">Table Info</p>
                    <div className="space-y-1 text-xs text-slate-400">
                      <p>Shape: {selected.shape}</p>
                      <p>Capacity: {selected.capacity} guests</p>
                      <p>Room: {getTableRoomName(selected)}</p>
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
                    className="btn-danger mt-2 flex w-full items-center justify-center gap-2 text-sm"
                  >
                    <TrashIcon className="w-4 h-4" />
                    Remove Table
                  </button>
                </div>
              </>
            ) : selectedRoom ? (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-100">{selectedRoom.name}</h3>
                    <p className="text-xs text-slate-500">
                      {selectedRoom.type === 'bar' ? 'Bar room with connected seats' : 'Dining room layout'}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedRoomName(null)}
                    className="text-xs text-slate-500 hover:text-slate-300"
                  >
                    Close
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="label text-xs">Room Order</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setRoomOrder(selectedRoom.name, Math.max(1, selectedRoom.order - 1))}
                        className="btn-secondary text-xs"
                      >
                        Earlier
                      </button>
                      <input
                        type="number"
                        value={selectedRoom.order}
                        onChange={(event) =>
                          setRoomOrder(
                            selectedRoom.name,
                            parseNumberInput(event.target.value, selectedRoom.order)
                          )
                        }
                        className="input w-full text-center"
                        min="1"
                        max={rooms.length}
                      />
                      <button
                        type="button"
                        onClick={() => setRoomOrder(selectedRoom.name, selectedRoom.order + 1)}
                        className="btn-secondary text-xs"
                      >
                        Later
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label text-xs">Width</label>
                      <input
                        type="number"
                        value={selectedRoom.width}
                        onChange={(event) =>
                          updateDraftPlan((current) => ({
                            ...current,
                            rooms: current.rooms.map((room) =>
                              room.name === selectedRoom.name
                                ? {
                                    ...room,
                                    width: clamp(parseNumberInput(event.target.value, room.width), 260, 900),
                                  }
                                : room
                            ),
                          }))
                        }
                        className="input w-full"
                        min="260"
                        max="900"
                      />
                    </div>

                    <div>
                      <label className="label text-xs">Height</label>
                      <input
                        type="number"
                        value={selectedRoom.height}
                        onChange={(event) =>
                          updateDraftPlan((current) => ({
                            ...current,
                            rooms: current.rooms.map((room) =>
                              room.name === selectedRoom.name
                                ? {
                                    ...room,
                                    height: clamp(parseNumberInput(event.target.value, room.height), 180, 720),
                                  }
                                : room
                            ),
                          }))
                        }
                        className="input w-full"
                        min="180"
                        max="720"
                      />
                    </div>
                  </div>

                  {!activeRoom && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label text-xs">Map X</label>
                        <input
                          type="number"
                          value={Math.round(selectedRoom.x)}
                          onChange={(event) =>
                            updateDraftPlan((current) => ({
                              ...current,
                              layoutMode: 'manual',
                              rooms: current.rooms.map((room) =>
                                room.name === selectedRoom.name
                                  ? {
                                      ...room,
                                      x: Math.max(0, parseNumberInput(event.target.value, room.x)),
                                    }
                                  : room
                              ),
                            }))
                          }
                          className="input w-full"
                        />
                      </div>

                      <div>
                        <label className="label text-xs">Map Y</label>
                        <input
                          type="number"
                          value={Math.round(selectedRoom.y)}
                          onChange={(event) =>
                            updateDraftPlan((current) => ({
                              ...current,
                              layoutMode: 'manual',
                              rooms: current.rooms.map((room) =>
                                room.name === selectedRoom.name
                                  ? {
                                      ...room,
                                      y: Math.max(0, parseNumberInput(event.target.value, room.y)),
                                    }
                                  : room
                              ),
                            }))
                          }
                          className="input w-full"
                        />
                      </div>
                    </div>
                  )}

                  <div className="border-t border-slate-700 pt-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Connections
                    </p>
                    <div className="space-y-2">
                      {rooms
                        .filter((room) => room.name !== selectedRoom.name)
                        .map((room) => {
                          const isConnected = draftFloorPlan.connections.some(
                            (connection) => connection.id === makeConnectionId(selectedRoom.name, room.name)
                          );

                          return (
                            <button
                              key={room.name}
                              type="button"
                              onClick={() => toggleRoomConnection(selectedRoom.name, room.name)}
                              className={clsx(
                                'flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-left text-xs font-medium transition-all',
                                isConnected
                                  ? 'border-blue-500 bg-blue-500/10 text-blue-100'
                                  : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500'
                              )}
                            >
                              <span>{room.name}</span>
                              <span>{isConnected ? 'Connected' : 'Connect'}</span>
                            </button>
                          );
                        })}
                    </div>
                  </div>

                  {selectedRoom.type === 'bar' && (
                    <div className="border-t border-slate-700 pt-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Bar Seats
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={extraBarSeats}
                          onChange={(event) => setExtraBarSeats(parseNumberInput(event.target.value, 4))}
                          className="input flex-1"
                          min="1"
                          max="12"
                        />
                        <button
                          type="button"
                          onClick={handleAddBarSeats}
                          disabled={isAddingBarSeats}
                          className="btn-primary text-xs"
                        >
                          {isAddingBarSeats ? 'Adding...' : 'Add Seats'}
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-slate-400">
                        Add a whole bar run in one step. The room counter expands automatically.
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 border-t border-slate-700 bg-slate-900 px-4 py-2 shrink-0">
        {Object.entries(STATUS_STYLES).map(([status, className]) => (
          <div key={status} className="flex items-center gap-1.5 text-xs text-slate-400">
            <div className={clsx('h-3 w-3 rounded border', className)} />
            {status}
          </div>
        ))}

        <div className="flex-1" />
        <span className="text-xs text-slate-500">{tableCountLabel}</span>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-sm p-6 shadow-2xl">
            <h2 className="mb-4 font-bold text-slate-100">Add Table</h2>

            <div className="space-y-3">
              <div>
                <label className="label">Table Name/Number</label>
                <input
                  value={newTable.name}
                  onChange={(event) => setNewTable({ ...newTable, name: event.target.value })}
                  className="input w-full"
                  placeholder="T1, VIP1, Patio 4"
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
                  <div className="mb-1 flex items-center justify-between">
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
                        'flex-1 rounded-xl border py-2 text-xs font-medium capitalize transition-all',
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
                    min="40"
                    max="220"
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
                    min="40"
                    max="220"
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-3">
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-md p-6 shadow-2xl">
            <h2 className="mb-4 font-bold text-slate-100">Add Room</h2>

            <div className="space-y-4">
              <div>
                <label className="label">Room Name</label>
                <input
                  value={roomDraft}
                  onChange={(event) => setRoomDraft(event.target.value)}
                  className="input w-full"
                  placeholder="Patio, Dining Room, Bar"
                />
              </div>

              <div>
                <label className="label">Room Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['room', 'bar'] as FloorRoomType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setRoomDraftType(type)}
                      className={clsx(
                        'rounded-2xl border px-4 py-3 text-left transition-all',
                        roomDraftType === type
                          ? 'border-blue-500 bg-blue-500/10 text-blue-100'
                          : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500'
                      )}
                    >
                      <p className="font-semibold capitalize">{type === 'room' ? 'Dining Room' : 'Bar'}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {type === 'room'
                          ? 'General room with tables you place manually.'
                          : 'Creates the bar counter plus a full run of bar seats.'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {roomDraftType === 'bar' && (
                <div>
                  <label className="label">Initial Bar Seats</label>
                  <input
                    type="number"
                    value={barSeatCount}
                    onChange={(event) => setBarSeatCount(parseNumberInput(event.target.value, 8))}
                    className="input w-full"
                    min="2"
                    max="24"
                  />
                </div>
              )}

              <p className="text-xs text-slate-400">
                Rooms save into this location&apos;s map, so the POS and editor both use the same layout and room order.
              </p>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => {
                  setRoomDraft('');
                  setRoomDraftType('room');
                  setBarSeatCount(8);
                  setShowAddRoomForm(false);
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRoom}
                disabled={!normalizeRoomName(roomDraft) || isSubmittingRoom}
                className="btn-primary flex-1"
              >
                {isSubmittingRoom ? 'Adding...' : roomDraftType === 'bar' ? 'Create Bar' : 'Add Room'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
