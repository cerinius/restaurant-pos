'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';

import api from '@/lib/api';
import {
  BAR_SEAT_SIZE,
  CANVAS_PADDING,
  ROOM_INNER_PADDING,
  applyTemplateToDraft,
  applyAutoLayoutToFloorPlan,
  buildBarSeatDrafts,
  coerceFloorPlan,
  createFloorRoom,
  getCanvasBounds,
  getBarSeatCountForRoom,
  getBarSeatDraftPositions,
  getBarWalkwayDisplaySegments,
  getBarWalkways,
  getRoomCenter,
  getTableAssignment,
  getTableMetadata,
  getTableRoomName,
  isBarSeatTable,
  makeConnectionId,
  normalizeRoomName,
  resizeBarRoomForSeatCount,
  sortFloorRooms,
  type BarOpeningSide,
  type BarStyle,
  type BarWalkway,
  type FloorPlanRoom,
  type FloorPlanSettings,
  type FloorRoomType,
  type FloorTableMetadata,
  type FloorTableTemplate,
} from '@/lib/floor-plan';
import { useAuthStore } from '@/store';
import { LoadingNotice, SkeletonBlock } from '@/components/ui/LoadingState';

const STATUS_STYLES: Record<string, string> = {
  AVAILABLE: 'bg-emerald-900/60 border-emerald-600 text-emerald-200',
  OCCUPIED: 'bg-blue-900/60 border-blue-500 text-blue-200',
  RESERVED: 'bg-purple-900/60 border-purple-500 text-purple-200',
  DIRTY: 'bg-yellow-900/60 border-yellow-500 text-yellow-200',
  BLOCKED: 'bg-slate-800 border-slate-600 text-slate-500',
};

const SHAPES = ['rectangle', 'square', 'circle'];
const STATUSES = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'DIRTY', 'BLOCKED'];
const BAR_STYLES: BarStyle[] = ['straight', 'rectangle', 'circle'];
const BAR_OPENING_SIDES: BarOpeningSide[] = ['north', 'east', 'south', 'west'];
const SNAP_THRESHOLD = 12;
const GRID_SIZE = 30;
const DEFAULT_TABLE = {
  name: '',
  capacity: 4,
  shape: 'rectangle',
  section: 'Main',
  width: 100,
  height: 80,
  templateId: '',
};
const EMPTY_FLOOR_PLAN = coerceFloorPlan(null, []);
const EMPTY_TEMPLATE_FORM: FloorTableTemplate = {
  id: '',
  name: '',
  shape: 'rectangle',
  width: 100,
  height: 80,
  capacity: 4,
};

function parseNumberInput(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function createTemplateId() {
  return `template-${Math.random().toString(36).slice(2, 10)}`;
}

function CommitNumberInput({
  value,
  onCommit,
  min,
  max,
  className,
  placeholder,
}: {
  value: number;
  onCommit: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
  placeholder?: string;
}) {
  const [draftValue, setDraftValue] = useState(String(value));

  useEffect(() => {
    setDraftValue(String(value));
  }, [value]);

  const commitValue = () => {
    const trimmed = draftValue.trim();
    let nextValue = parseNumberInput(trimmed, value);

    if (typeof min === 'number') nextValue = Math.max(min, nextValue);
    if (typeof max === 'number') nextValue = Math.min(max, nextValue);

    const normalized = String(nextValue);
    setDraftValue(normalized);

    if (nextValue !== value) {
      onCommit(nextValue);
    }
  };

  return (
    <input
      type="number"
      value={draftValue}
      onChange={(event) => setDraftValue(event.target.value)}
      onBlur={commitValue}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.currentTarget.blur();
        }

        if (event.key === 'Escape') {
          setDraftValue(String(value));
          event.currentTarget.blur();
        }
      }}
      className={className}
      min={min}
      max={max}
      inputMode="numeric"
      placeholder={placeholder}
    />
  );
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
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [newTable, setNewTable] = useState(DEFAULT_TABLE);
  const [roomDraft, setRoomDraft] = useState('');
  const [roomDraftType, setRoomDraftType] = useState<FloorRoomType>('room');
  const [barSeatCount, setBarSeatCount] = useState(8);
  const [barStyleDraft, setBarStyleDraft] = useState<BarStyle>('straight');
  const [barOpeningSideDraft, setBarOpeningSideDraft] = useState<BarOpeningSide>('south');
  const [barWalkwayWidthDraft, setBarWalkwayWidthDraft] = useState(88);
  const [extraBarSeats, setExtraBarSeats] = useState(4);
  const [templateForm, setTemplateForm] = useState<FloorTableTemplate>(EMPTY_TEMPLATE_FORM);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [bulkAssignedServerId, setBulkAssignedServerId] = useState('');
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [draftFloorPlan, setDraftFloorPlan] = useState<FloorPlanSettings>(EMPTY_FLOOR_PLAN);
  const [isFloorPlanDirty, setIsFloorPlanDirty] = useState(false);
  const [isSubmittingRoom, setIsSubmittingRoom] = useState(false);
  const [isAddingBarSeats, setIsAddingBarSeats] = useState(false);
  const [snapToGuides, setSnapToGuides] = useState(true);
  const [dragGuides, setDragGuides] = useState<{
    vertical: Array<{ x: number; top: number; bottom: number }>;
    horizontal: Array<{ y: number; left: number; right: number }>;
  }>({
    vertical: [],
    horizontal: [],
  });

  const { data, isLoading: tablesLoading } = useQuery({
    queryKey: ['tables-floor', locationId],
    queryFn: () => api.getTables({ locationId }),
    enabled: !!locationId,
  });

  const { data: locationsData, isLoading: locationsLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: () => api.getLocations(),
    enabled: !!locationId,
  });

  const { data: staffData, isLoading: staffLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.getStaff(),
    enabled: !!locationId,
  });

  const tables: any[] = data?.data || [];
  const locations: any[] = locationsData?.data || [];
  const staffList: any[] = staffData?.data || [];
  const currentLocation = locations.find((location) => location.id === locationId) || null;
  const persistedFloorPlan = useMemo(
    () => coerceFloorPlan(currentLocation?.settings?.floorPlan, tables),
    [currentLocation?.settings?.floorPlan, tables]
  );
  const isInitialFloorLoading =
    (tablesLoading || locationsLoading || staffLoading) && !currentLocation && tables.length === 0;

  useEffect(() => {
    if (!isFloorPlanDirty) {
      setDraftFloorPlan(persistedFloorPlan);
    }
  }, [persistedFloorPlan, isFloorPlanDirty]);

  useEffect(() => {
    const orderedRoomNames = sortFloorRooms(draftFloorPlan.rooms).map((room) => room.name);

    if (orderedRoomNames.length === 0) {
      if (activeRoom) setActiveRoom(null);
      return;
    }

    if (!activeRoom || !orderedRoomNames.includes(activeRoom)) {
      setActiveRoom(orderedRoomNames[0]);
    }
  }, [activeRoom, draftFloorPlan.rooms]);

  useEffect(() => {
    if (selectedRoomName && !draftFloorPlan.rooms.some((room) => room.name === selectedRoomName)) {
      setSelectedRoomName(null);
    }
  }, [draftFloorPlan.rooms, selectedRoomName]);

  useEffect(() => {
    setBulkAssignedServerId('');
  }, [selectedRoomName]);

  const rooms = useMemo(() => sortFloorRooms(draftFloorPlan.rooms), [draftFloorPlan.rooms]);
  const roomMap = useMemo(
    () => new Map(rooms.map((room) => [room.name, room] as const)),
    [rooms]
  );
  const tableTemplates = draftFloorPlan.tableTemplates || [];
  const tableMetadata = draftFloorPlan.tableMetadata || [];
  const assignableStaff = staffList.filter((member) =>
    member?.isActive !== false && ['SERVER', 'BARTENDER'].includes(String(member?.role || '').toUpperCase())
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
  const selectedMetadata = selected ? getTableMetadata(tableMetadata, selected.id) : null;
  const selectedTemplate =
    selectedMetadata?.templateId ? tableTemplates.find((template) => template.id === selectedMetadata.templateId) || null : null;
  const selectedAssignment = selected ? getTableAssignment(draftFloorPlan.tableAssignments, selected.id) : null;
  const focusedRoomName = activeRoom || rooms[0]?.name || null;
  const selectedRoom = selectedRoomName ? rooms.find((room) => room.name === selectedRoomName) || null : null;
  const roomOptions = rooms.length > 0 ? rooms.map((room) => room.name) : [DEFAULT_TABLE.section];
  const visibleRooms = focusedRoomName ? rooms.filter((room) => room.name === focusedRoomName) : rooms;
  const singleVisibleRoom = visibleRooms[0] || null;
  const visibleRoomTables = focusedRoomName
    ? tables.filter((table) => getTableRoomName(table) === focusedRoomName)
    : tables;
  const tableCountLabel = focusedRoomName
    ? `${visibleRoomTables.length} tables in ${focusedRoomName}`
    : rooms.length > 0
      ? `${tables.length} tables across ${rooms.length} rooms`
      : `${tables.length} tables total`;
  const hasPendingTableChanges = Object.keys(positions).length > 0;
  const hasPendingChanges = hasPendingTableChanges || isFloorPlanDirty;
  const emptyStateTitle = focusedRoomName ? 'No tables in this room yet' : 'No rooms yet';
  const emptyStateBody = focusedRoomName
    ? 'Add a table to start laying out this room.'
    : 'Add a room, or create a table to generate the first room automatically.';
  const canvasSize = useMemo(() => {
    if (singleVisibleRoom) {
      return getCanvasBounds([
        {
          ...singleVisibleRoom,
          x: CANVAS_PADDING,
          y: CANVAS_PADDING,
        },
      ]);
    }

    return getCanvasBounds(rooms);
  }, [rooms, singleVisibleRoom]);
  const isSingleRoomLayout = rooms.length === 1;

  const getInteractiveRoom = (room: FloorPlanRoom) => {
    const shouldFillWorkspace = Boolean(focusedRoomName) || isSingleRoomLayout;
    if (!shouldFillWorkspace || room.name !== (focusedRoomName || rooms[0]?.name)) return room;

    return {
      ...room,
      x: CANVAS_PADDING,
      y: CANVAS_PADDING,
      width: Math.max(room.width, canvasSize.width - CANVAS_PADDING * 2),
      height: Math.max(room.height, canvasSize.height - CANVAS_PADDING * 2),
    };
  };
  const selectedRoomView = selectedRoom ? getInteractiveRoom(selectedRoom) : null;
  const selectedRoomWalkways = selectedRoomView?.type === 'bar' ? getBarWalkways(selectedRoomView.bar) : [];
  const assignmentSummary = useMemo(() => {
    const counts = new Map<string, { serverId: string; serverName: string; assigned: number; open: number }>();

    draftFloorPlan.tableAssignments.forEach((assignment) => {
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
  }, [draftFloorPlan.tableAssignments, tables]);

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

  if (isInitialFloorLoading) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="border-b border-slate-700 bg-slate-950/50 px-6 py-4">
          <SkeletonBlock className="h-7 w-40" />
          <SkeletonBlock className="mt-2 h-4 w-56" />
        </div>
        <div className="space-y-4 p-6">
          <LoadingNotice
            title="Loading floor plan"
            description="We are pulling rooms, table layouts, sections, and assignments."
          />
          <SkeletonBlock className="h-[520px] w-full" />
        </div>
      </div>
    );
  }

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
    const interactiveRoom = getInteractiveRoom(room);

    if (isSingleRoomLayout) {
      return { x: interactiveRoom.x, y: interactiveRoom.y };
    }

    return focusedRoomName ? { x: CANVAS_PADDING, y: CANVAS_PADDING } : { x: room.x, y: room.y };
  };

  const updateDraftPlan = (updater: (current: FloorPlanSettings) => FloorPlanSettings) => {
    setDraftFloorPlan((current) => coerceFloorPlan(updater(current), tables));
    setIsFloorPlanDirty(true);
  };

  useEffect(() => {
    if (!focusedRoomName) return;

    const focusedRoom = roomMap.get(focusedRoomName);
    if (!focusedRoom) return;

    const nextWidth = Math.max(focusedRoom.width, canvasSize.width - CANVAS_PADDING * 2);
    const nextHeight = Math.max(focusedRoom.height, canvasSize.height - CANVAS_PADDING * 2);

    if (
      focusedRoom.x === CANVAS_PADDING &&
      focusedRoom.y === CANVAS_PADDING &&
      focusedRoom.width === nextWidth &&
      focusedRoom.height === nextHeight
    ) {
      return;
    }

    updateDraftPlan((current) => ({
      ...current,
      rooms: current.rooms.map((room) =>
        room.name === focusedRoomName
          ? {
              ...room,
              x: CANVAS_PADDING,
              y: CANVAS_PADDING,
              width: nextWidth,
              height: nextHeight,
            }
          : room
      ),
    }));
  }, [canvasSize.height, canvasSize.width, focusedRoomName, roomMap]);

  const persistFloorPlan = async (nextFloorPlan: FloorPlanSettings, successMessage?: string) => {
    await saveLayoutMutation.mutateAsync({ nextFloorPlan });
    if (successMessage) {
      toast.success(successMessage);
    }
  };

  const updateTableMetadataEntry = (tableId: string, patch: Partial<FloorTableMetadata> | null) => {
    updateDraftPlan((current) => {
      const existing = current.tableMetadata.find((entry) => entry.tableId === tableId);
      const nextMetadata = current.tableMetadata.filter((entry) => entry.tableId !== tableId);

      if (!patch) {
        return {
          ...current,
          tableMetadata: nextMetadata,
        };
      }

      nextMetadata.push({
        tableId,
        kind: patch.kind === 'bar-seat' ? 'bar-seat' : existing?.kind || 'standard',
        templateId: patch.templateId === undefined ? existing?.templateId : patch.templateId || undefined,
      });

      return {
        ...current,
        tableMetadata: nextMetadata,
      };
    });
  };

  const setTableAssignment = (tableId: string, serverId: string) => {
    updateDraftPlan((current) => {
      const nextAssignments = current.tableAssignments.filter((assignment) => assignment.tableId !== tableId);
      const staffMember = assignableStaff.find((member) => member.id === serverId);

      if (staffMember) {
        nextAssignments.push({
          tableId,
          serverId: staffMember.id,
          serverName: staffMember.name || 'Assigned Server',
        });
      }

      return {
        ...current,
        tableAssignments: nextAssignments,
      };
    });
  };

  const setRoomAssignments = (roomName: string, serverId: string) => {
    const roomTables = tablesByRoom.get(roomName) || [];

    updateDraftPlan((current) => {
      const roomTableIds = new Set(roomTables.map((table) => table.id));
      const nextAssignments = current.tableAssignments.filter((assignment) => !roomTableIds.has(assignment.tableId));
      const staffMember = assignableStaff.find((member) => member.id === serverId);

      if (staffMember) {
        roomTables.forEach((table) => {
          nextAssignments.push({
            tableId: table.id,
            serverId: staffMember.id,
            serverName: staffMember.name || 'Assigned Server',
          });
        });
      }

      return {
        ...current,
        tableAssignments: nextAssignments,
      };
    });
  };

  const updateBarRoomLayout = (
    room: FloorPlanRoom,
    options: {
      style?: BarStyle;
      openingSide?: BarOpeningSide;
      aisleWidth?: number;
      walkways?: BarWalkway[];
    }
  ) => {
    const roomTables = tablesByRoom.get(room.name) || [];
    const existingBarSeats = roomTables
      .filter((table) => isBarSeatTable(table, room, tableMetadata))
      .sort((left, right) => String(left.name || '').localeCompare(String(right.name || '')));
    const nextRoom = resizeBarRoomForSeatCount(room, existingBarSeats.length || room.bar?.seatCount || 0, options);
    const nextSeatPositions = getBarSeatDraftPositions(nextRoom, existingBarSeats.length);

    updateDraftPlan((current) => ({
      ...current,
      rooms: current.rooms.map((entry) => (entry.name === room.name ? nextRoom : entry)),
    }));

    if (existingBarSeats.length > 0) {
      setPositions((current) => {
        const nextPositions = { ...current };

        existingBarSeats.forEach((table, index) => {
          const seatPosition = nextSeatPositions[index];
          if (!seatPosition) return;

          nextPositions[table.id] = {
            x: Math.round(seatPosition.x),
            y: Math.round(seatPosition.y),
          };
        });

        return nextPositions;
      });
    }
  };

  const addBarWalkway = (room: FloorPlanRoom) => {
    const currentWalkways = getBarWalkways(room.bar);
    const nextSide = BAR_OPENING_SIDES.find(
      (side) => !currentWalkways.some((walkway) => walkway.side === side)
    );

    if (!nextSide) {
      toast.error('All bar sides already have a staff walkway');
      return;
    }

    updateBarRoomLayout(room, {
      walkways: [
        ...currentWalkways,
        {
          id: `walkway-${nextSide}`,
          side: nextSide,
          width: room.bar?.aisleWidth || 88,
        },
      ],
    });
  };

  const updateBarWalkway = (
    room: FloorPlanRoom,
    walkwayId: string,
    patch: Partial<Pick<BarWalkway, 'side' | 'width'>>
  ) => {
    const currentWalkways = getBarWalkways(room.bar);
    const nextWalkways = currentWalkways.map((walkway) =>
      walkway.id === walkwayId ? { ...walkway, ...patch } : walkway
    );

    if (new Set(nextWalkways.map((walkway) => walkway.side)).size !== nextWalkways.length) {
      toast.error('Each walkway needs its own side');
      return;
    }

    updateBarRoomLayout(room, { walkways: nextWalkways });
  };

  const removeBarWalkway = (room: FloorPlanRoom, walkwayId: string) => {
    const currentWalkways = getBarWalkways(room.bar);

    if (currentWalkways.length <= 1) {
      toast.error('Keep at least one staff walkway');
      return;
    }

    updateBarRoomLayout(room, {
      walkways: currentWalkways.filter((walkway) => walkway.id !== walkwayId),
    });
  };

  const beginTemplateEdit = (template?: FloorTableTemplate | null) => {
    if (template) {
      setEditingTemplateId(template.id);
      setTemplateForm(template);
      return;
    }

    setEditingTemplateId(null);
    setTemplateForm(EMPTY_TEMPLATE_FORM);
  };

  const saveTemplate = () => {
    const name = templateForm.name.trim();

    if (!name) {
      toast.error('Enter a template name');
      return;
    }

    const nextTemplate: FloorTableTemplate = {
      id: editingTemplateId || createTemplateId(),
      name,
      shape: templateForm.shape,
      width: clamp(Number(templateForm.width || 100), 40, 260),
      height: clamp(Number(templateForm.height || 80), 40, 260),
      capacity: clamp(Number(templateForm.capacity || 4), 1, 20),
    };

    updateDraftPlan((current) => {
      const nextTemplates = current.tableTemplates.filter((template) => template.id !== nextTemplate.id);
      nextTemplates.push(nextTemplate);

      return {
        ...current,
        tableTemplates: nextTemplates,
      };
    });

    toast.success(editingTemplateId ? 'Template updated' : 'Template added');
    beginTemplateEdit();
  };

  const deleteTemplate = (templateId: string) => {
    updateDraftPlan((current) => ({
      ...current,
      tableTemplates: current.tableTemplates.filter((template) => template.id !== templateId),
      tableMetadata: current.tableMetadata.map((entry) =>
        entry.templateId === templateId
          ? {
              ...entry,
              templateId: undefined,
            }
          : entry
      ),
    }));

    if (newTable.templateId === templateId) {
      setNewTable((current) => ({
        ...current,
        templateId: '',
      }));
    }

    if (editingTemplateId === templateId) {
      beginTemplateEdit();
    }
  };

  const applyTemplateSelection = (templateId: string) => {
    if (!templateId) {
      setNewTable((current) => ({
        ...current,
        templateId: '',
      }));
      return;
    }

    const template = tableTemplates.find((entry) => entry.id === templateId);
    if (!template) return;

    setNewTable((current) => ({
      ...applyTemplateToDraft(
        template,
        normalizeRoomName(current.section) || activeRoom || selectedRoomName || DEFAULT_TABLE.section
      ),
      name: current.name,
      templateId: template.id,
    }));
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

  const clearDragGuides = () => {
    setDragGuides({
      vertical: [],
      horizontal: [],
    });
  };

  const getTableSnapResult = (
    table: any,
    room: FloorPlanRoom,
    nextX: number,
    nextY: number
  ) => {
    const roomOrigin = getRoomOrigin(room);
    const roomTables = (tablesByRoom.get(room.name) || []).filter((entry) => entry.id !== table.id);
    const width = Number(table.width || 100);
    const height = Number(table.height || 80);
    const verticalCandidates: Array<{ position: number; line: number }> = [];
    const horizontalCandidates: Array<{ position: number; line: number }> = [];
    const guides = {
      vertical: [] as Array<{ x: number; top: number; bottom: number }>,
      horizontal: [] as Array<{ y: number; left: number; right: number }>,
    };

    const gridX = Math.round(nextX / GRID_SIZE) * GRID_SIZE;
    const gridY = Math.round(nextY / GRID_SIZE) * GRID_SIZE;

    if (Math.abs(gridX - nextX) <= 8) {
      verticalCandidates.push({
        position: gridX,
        line: roomOrigin.x + gridX,
      });
    }

    if (Math.abs(gridY - nextY) <= 8) {
      horizontalCandidates.push({
        position: gridY,
        line: roomOrigin.y + gridY,
      });
    }

    verticalCandidates.push(
      {
        position: ROOM_INNER_PADDING,
        line: roomOrigin.x + ROOM_INNER_PADDING,
      },
      {
        position: (room.width - width) / 2,
        line: roomOrigin.x + room.width / 2,
      },
      {
        position: room.width - width - ROOM_INNER_PADDING,
        line: roomOrigin.x + room.width - ROOM_INNER_PADDING,
      }
    );
    horizontalCandidates.push(
      {
        position: ROOM_INNER_PADDING,
        line: roomOrigin.y + ROOM_INNER_PADDING,
      },
      {
        position: (room.height - height) / 2,
        line: roomOrigin.y + room.height / 2,
      },
      {
        position: room.height - height - ROOM_INNER_PADDING,
        line: roomOrigin.y + room.height - ROOM_INNER_PADDING,
      }
    );

    roomTables.forEach((otherTable) => {
      const otherPosition = getTablePos(otherTable);
      const otherWidth = Number(otherTable.width || 100);
      const otherHeight = Number(otherTable.height || 80);

      verticalCandidates.push(
        {
          position: otherPosition.x,
          line: roomOrigin.x + otherPosition.x,
        },
        {
          position: otherPosition.x + (otherWidth - width) / 2,
          line: roomOrigin.x + otherPosition.x + otherWidth / 2,
        },
        {
          position: otherPosition.x + otherWidth - width,
          line: roomOrigin.x + otherPosition.x + otherWidth,
        }
      );
      horizontalCandidates.push(
        {
          position: otherPosition.y,
          line: roomOrigin.y + otherPosition.y,
        },
        {
          position: otherPosition.y + (otherHeight - height) / 2,
          line: roomOrigin.y + otherPosition.y + otherHeight / 2,
        },
        {
          position: otherPosition.y + otherHeight - height,
          line: roomOrigin.y + otherPosition.y + otherHeight,
        }
      );
    });

    const closestVertical = verticalCandidates.reduce<{ position: number; line: number } | null>(
      (closest, candidate) => {
        const distance = Math.abs(candidate.position - nextX);
        if (distance > SNAP_THRESHOLD) return closest;
        if (!closest || distance < Math.abs(closest.position - nextX)) return candidate;
        return closest;
      },
      null
    );
    const closestHorizontal = horizontalCandidates.reduce<{ position: number; line: number } | null>(
      (closest, candidate) => {
        const distance = Math.abs(candidate.position - nextY);
        if (distance > SNAP_THRESHOLD) return closest;
        if (!closest || distance < Math.abs(closest.position - nextY)) return candidate;
        return closest;
      },
      null
    );

    if (closestVertical) {
      guides.vertical.push({
        x: closestVertical.line,
        top: roomOrigin.y + ROOM_INNER_PADDING / 2,
        bottom: roomOrigin.y + room.height - ROOM_INNER_PADDING / 2,
      });
    }

    if (closestHorizontal) {
      guides.horizontal.push({
        y: closestHorizontal.line,
        left: roomOrigin.x + ROOM_INNER_PADDING / 2,
        right: roomOrigin.x + room.width - ROOM_INNER_PADDING / 2,
      });
    }

    return {
      x: closestVertical?.position ?? nextX,
      y: closestHorizontal?.position ?? nextY,
      guides,
    };
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
    if (focusedRoomName || isSingleRoomLayout) return;

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

    const baseRoom = roomMap.get(draggingTable.roomName);
    const table = tables.find((item) => item.id === draggingTable.id);
    if (!baseRoom || !table) return;
    const room = getInteractiveRoom(baseRoom);

    const pointer = getCanvasPointer(event);
    const roomOrigin = getRoomOrigin(room);
    const width = Number(table.width || 100);
    const height = Number(table.height || 80);
    const localX = pointer.x - dragOffset.x - roomOrigin.x;
    const localY = pointer.y - dragOffset.y - roomOrigin.y;
    const maxX = Math.max(ROOM_INNER_PADDING, room.width - width - ROOM_INNER_PADDING);
    const maxY = Math.max(ROOM_INNER_PADDING, room.height - height - ROOM_INNER_PADDING);
    const clampedX = clamp(localX, ROOM_INNER_PADDING, maxX);
    const clampedY = clamp(localY, ROOM_INNER_PADDING, maxY);
    const snapped = snapToGuides
      ? getTableSnapResult(table, room, clampedX, clampedY)
      : {
          x: clampedX,
          y: clampedY,
          guides: {
            vertical: [],
            horizontal: [],
          },
        };

    setDragGuides(snapped.guides);

    setPositions((current) => ({
      ...current,
      [draggingTable.id]: {
        x: clamp(snapped.x, ROOM_INNER_PADDING, maxX),
        y: clamp(snapped.y, ROOM_INNER_PADDING, maxY),
      },
    }));
  };

  const handleMouseUp = () => {
    if (draggingTable && isSingleRoomLayout) {
      updateDraftPlan((current) => ({
        ...current,
        layoutMode: 'manual',
        rooms: current.rooms.map((room) =>
          room.name === draggingTable.roomName
            ? {
                ...room,
                x: CANVAS_PADDING,
                y: CANVAS_PADDING,
                width: Math.max(room.width, canvasSize.width - CANVAS_PADDING * 2),
                height: Math.max(room.height, canvasSize.height - CANVAS_PADDING * 2),
              }
            : room
        ),
      }));
    }

    setDraggingTable(null);
    setDraggingRoom(null);
    clearDragGuides();
  };

  const openAddTableForm = () => {
    setNewTable((current) => ({
      ...current,
      section: focusedRoomName || selectedRoomName || normalizeRoomName(current.section) || DEFAULT_TABLE.section,
    }));
    setShowAddForm(true);
  };

  const handleCreateTable = async () => {
    const name = newTable.name.trim();
    const roomName = normalizeRoomName(newTable.section) || DEFAULT_TABLE.section;
    const targetRoom = roomMap.get(roomName);
    const defaultX = ROOM_INNER_PADDING + 24;
    const defaultY = targetRoom?.type === 'bar' ? 120 : ROOM_INNER_PADDING + 24;

    if (!name) {
      toast.error('Enter a table name');
      return;
    }

    try {
      const response = await createMutation.mutateAsync({
        ...newTable,
        name,
        section: roomName,
        positionX: defaultX,
        positionY: defaultY,
      });

      if (response?.data?.id) {
        updateTableMetadataEntry(response.data.id, {
          kind: 'standard',
          templateId: newTable.templateId || undefined,
        });
      }
    } catch {
      // Error toast comes from the mutation.
    }
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
      barStyle: roomDraftType === 'bar' ? barStyleDraft : undefined,
      openingSide: roomDraftType === 'bar' ? barOpeningSideDraft : undefined,
      aisleWidth: roomDraftType === 'bar' ? barWalkwayWidthDraft : undefined,
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
        roomDraftType === 'bar' ? undefined : 'Room added'
      );

      if (roomDraftType === 'bar' && locationId) {
        const seatPayloads = buildBarSeatDrafts(nextRoom, 0, barSeatCount, {
          style: barStyleDraft,
          openingSide: barOpeningSideDraft,
          aisleWidth: barWalkwayWidthDraft,
        });
        const createdSeats = await Promise.all(
          seatPayloads.map((seat) => api.createTable({ ...seat, locationId }))
        );
        const nextFloorPlanWithMetadata = coerceFloorPlan(
          {
            ...nextFloorPlan,
            tableMetadata: [
              ...nextFloorPlan.tableMetadata,
              ...createdSeats
                .map((response: any) => response?.data?.id)
                .filter(Boolean)
                .map((tableId: string) => ({
                  tableId,
                  kind: 'bar-seat' as const,
                })),
            ],
          },
          tables
        );

        setDraftFloorPlan(nextFloorPlanWithMetadata);
        await persistFloorPlan(nextFloorPlanWithMetadata, 'Bar room added');
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
      setBarStyleDraft('straight');
      setBarOpeningSideDraft('south');
      setBarWalkwayWidthDraft(88);
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
    const existingSeatCount = getBarSeatCountForRoom(selectedRoom, existingRoomTables, tableMetadata);
    const nextSeatTotal = existingSeatCount + extraBarSeats;
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

      const seatPayloads = buildBarSeatDrafts(selectedRoom, existingSeatCount, extraBarSeats, {
        style: updatedRoom.bar?.style,
        openingSide: updatedRoom.bar?.openingSide,
        aisleWidth: updatedRoom.bar?.aisleWidth,
        walkways: updatedRoom.bar?.walkways,
      });
      const createdSeats = await Promise.all(seatPayloads.map((seat) => api.createTable({ ...seat, locationId })));
      const nextFloorPlanWithMetadata = coerceFloorPlan(
        {
          ...nextFloorPlan,
          tableMetadata: [
            ...nextFloorPlan.tableMetadata,
            ...createdSeats
              .map((response: any) => response?.data?.id)
              .filter(Boolean)
              .map((tableId: string) => ({
                tableId,
                kind: 'bar-seat' as const,
              })),
          ],
        },
        tables
      );

      setDraftFloorPlan(nextFloorPlanWithMetadata);
      await persistFloorPlan(nextFloorPlanWithMetadata);
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

  const clampTablePositionToRoom = (
    table: any,
    room: FloorPlanRoom,
    nextX: number,
    nextY: number
  ) => {
    const interactiveRoom = getInteractiveRoom(room);
    const width = Number(table.width || 100);
    const height = Number(table.height || 80);
    const maxX = Math.max(ROOM_INNER_PADDING, interactiveRoom.width - width - ROOM_INNER_PADDING);
    const maxY = Math.max(ROOM_INNER_PADDING, interactiveRoom.height - height - ROOM_INNER_PADDING);

    return {
      x: clamp(Math.round(nextX), ROOM_INNER_PADDING, maxX),
      y: clamp(Math.round(nextY), ROOM_INNER_PADDING, maxY),
    };
  };

  const updateTableDraftPosition = (
    table: any,
    roomName: string,
    coordinates: { x?: number; y?: number }
  ) => {
    const baseRoom = roomMap.get(roomName);
    if (!baseRoom) return;

    const currentPosition = getTablePos(table);
    const nextPosition = clampTablePositionToRoom(
      table,
      baseRoom,
      coordinates.x ?? currentPosition.x,
      coordinates.y ?? currentPosition.y
    );

    setPositions((current) => ({
      ...current,
      [table.id]: nextPosition,
    }));
    setSelectedRoomName(roomName);
  };

  const nudgeSelectedTable = (deltaX: number, deltaY: number) => {
    if (!selected) return;

    const roomName = getTableRoomName(selected);
    const currentPosition = getTablePos(selected);

    updateTableDraftPosition(selected, roomName, {
      x: currentPosition.x + deltaX,
      y: currentPosition.y + deltaY,
    });
  };

  const alignSelectedTable = (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (!selected) return;

    const roomName = getTableRoomName(selected);
    const baseRoom = roomMap.get(roomName);
    if (!baseRoom) return;
    const room = getInteractiveRoom(baseRoom);

    const width = Number(selected.width || 100);
    const height = Number(selected.height || 80);
    const currentPosition = getTablePos(selected);

    switch (alignment) {
      case 'left':
        updateTableDraftPosition(selected, roomName, { x: ROOM_INNER_PADDING });
        return;
      case 'center':
        updateTableDraftPosition(selected, roomName, { x: (room.width - width) / 2 });
        return;
      case 'right':
        updateTableDraftPosition(selected, roomName, {
          x: room.width - width - ROOM_INNER_PADDING,
        });
        return;
      case 'top':
        updateTableDraftPosition(selected, roomName, { y: ROOM_INNER_PADDING });
        return;
      case 'middle':
        updateTableDraftPosition(selected, roomName, { y: (room.height - height) / 2 });
        return;
      case 'bottom':
        updateTableDraftPosition(selected, roomName, {
          y: room.height - height - ROOM_INNER_PADDING,
        });
        return;
      default:
        updateTableDraftPosition(selected, roomName, currentPosition);
    }
  };

  const expandSelectedRoomToCanvas = () => {
    if (!selectedRoomView) return;

    updateDraftPlan((current) => ({
      ...current,
      layoutMode: 'manual',
      rooms: current.rooms.map((room) =>
        room.name === selectedRoomView.name
          ? {
              ...room,
              x: CANVAS_PADDING,
              y: CANVAS_PADDING,
              width: Math.max(room.width, canvasSize.width - CANVAS_PADDING * 2),
              height: Math.max(room.height, canvasSize.height - CANVAS_PADDING * 2),
            }
          : room
      ),
    }));
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

  const renderBarFeature = (room: FloorPlanRoom) => {
    if (room.type !== 'bar' || !room.bar?.enabled) return null;

    const bar = room.bar;
    const baseStyle = {
      position: 'absolute' as const,
      left: bar.counterX,
      top: bar.counterY,
      width: Math.min(room.width - 56, bar.counterWidth),
      height: bar.counterHeight,
      borderRadius: bar.style === 'circle' ? '999px' : `${Math.max(24, Math.round(bar.counterRadius))}px`,
    };

    return (
      <>
        <div
          style={baseStyle}
          className="border border-amber-400/35 bg-amber-500/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
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
          >
            <div className="flex h-full items-center justify-center text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-100/60">
              Staff lane
            </div>
          </div>
        ))}
      </>
    );
  };

  const renderRoom = (room: FloorPlanRoom) => {
    const interactiveRoom = getInteractiveRoom(room);
    const roomOrigin = getRoomOrigin(interactiveRoom);
    const roomTables = (tablesByRoom.get(room.name) || []).sort((a, b) =>
      String(a.name || '').localeCompare(String(b.name || ''))
    );
    const roomBarSeatCount =
      interactiveRoom.type === 'bar'
        ? getBarSeatCountForRoom(interactiveRoom, roomTables, tableMetadata)
        : 0;
    const isRoomSelected = selectedRoomView?.name === room.name && !selected;

    return (
      <div
        key={room.name}
        style={{
          position: 'absolute',
          left: roomOrigin.x,
          top: roomOrigin.y,
          width: interactiveRoom.width,
          height: interactiveRoom.height,
        }}
        onClick={() => {
          setSelectedRoomName(room.name);
          setSelectedId(null);
        }}
        className={clsx(
          'rounded-[32px] border shadow-2xl transition-all overflow-hidden',
          interactiveRoom.type === 'bar'
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
            getRoomBadgeStyle(interactiveRoom.type),
            focusedRoomName || isSingleRoomLayout ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
          )}
        >
          {room.name}
        </button>

        <div className="absolute right-4 top-4 z-[2] rounded-full bg-slate-950/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
          {interactiveRoom.type === 'bar'
            ? `${roomBarSeatCount} stools · ${roomTables.length - roomBarSeatCount} tables`
            : `${roomTables.length} tables`}
        </div>

        {renderBarFeature(interactiveRoom)}

        {roomTables.map((table) => {
          const pos = getTablePos(table);
          const isSelected = selected?.id === table.id;
          const isPending = !!positions[table.id];
          const metadata = getTableMetadata(tableMetadata, table.id);
          const assignment = getTableAssignment(draftFloorPlan.tableAssignments, table.id);
          const isBarSeat = isBarSeatTable(table, interactiveRoom, tableMetadata);

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
                isBarSeat ? 'border-amber-300/80 shadow-[0_0_0_1px_rgba(251,191,36,0.18)]' : '',
                isPending ? 'opacity-80' : ''
              )}
            >
              <span className="font-black text-sm">{table.name}</span>
              <span className="text-xs opacity-70">{table.capacity}p</span>
              {assignment && <span className="mt-1 max-w-[90%] truncate text-[10px] font-semibold text-blue-100/85">{assignment.serverName}</span>}
              {metadata?.templateId && (
                <span className="max-w-[90%] truncate text-[9px] uppercase tracking-[0.18em] text-slate-300/75">
                  {tableTemplates.find((template) => template.id === metadata.templateId)?.name || 'Template'}
                </span>
              )}
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
            Focus one room at a time, then place and align tables across the full workspace.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!focusedRoomName && rooms.length > 1 && (
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

          <button
            type="button"
            onClick={() => {
              beginTemplateEdit();
              setShowTemplateManager(true);
            }}
            className="btn-secondary text-sm"
          >
            Templates
          </button>

          <button
            type="button"
            onClick={() => setSnapToGuides((current) => !current)}
            className={clsx(
              'px-3 py-2 rounded-xl text-xs font-semibold border transition-all',
              snapToGuides
                ? 'bg-cyan-300 text-slate-950 border-cyan-200'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
            )}
          >
            {snapToGuides ? 'Snap Guides On' : 'Snap Guides Off'}
          </button>

          <button onClick={openAddTableForm} className="btn-primary flex items-center gap-2 text-sm">
            <PlusIcon className="w-4 h-4" />
            Add Table
          </button>
        </div>
      </div>

      {rooms.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 bg-slate-950/40 px-6 py-3 shrink-0">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Rooms</span>

          {rooms.map((room) => (
            <button
              key={room.name}
              type="button"
              onClick={() => {
                setActiveRoom(room.name);
                setSelectedRoomName(null);
                setSelectedId(null);
              }}
              className={clsx(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
                focusedRoomName === room.name
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
              )}
            >
              {room.name}
            </button>
          ))}
        </div>
      )}

      {assignmentSummary.length > 0 && !focusedRoomName && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 bg-slate-950/30 px-6 py-3 shrink-0">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Sections</span>
          {assignmentSummary.map((summary) => (
            <div
              key={summary.serverId}
              className="rounded-2xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-300"
            >
              <span className="font-semibold text-slate-100">{summary.serverName}</span>
              <span className="ml-2 text-slate-400">{summary.assigned} assigned</span>
              <span className="ml-2 text-emerald-300">{summary.open} open</span>
            </div>
          ))}
        </div>
      )}

      <div className="relative flex flex-1 overflow-hidden">
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
            {!focusedRoomName && draftFloorPlan.connections.length > 0 && (
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

            {(dragGuides.vertical.length > 0 || dragGuides.horizontal.length > 0) && (
              <svg
                className="absolute inset-0 pointer-events-none z-[3]"
                width={canvasSize.width}
                height={canvasSize.height}
              >
                {dragGuides.vertical.map((guide, index) => (
                  <line
                    key={`v-${index}-${guide.x}`}
                    x1={guide.x}
                    y1={guide.top}
                    x2={guide.x}
                    y2={guide.bottom}
                    stroke="rgba(125,211,252,0.95)"
                    strokeWidth="2"
                    strokeDasharray="8 6"
                  />
                ))}

                {dragGuides.horizontal.map((guide, index) => (
                  <line
                    key={`h-${index}-${guide.y}`}
                    x1={guide.left}
                    y1={guide.y}
                    x2={guide.right}
                    y2={guide.y}
                    stroke="rgba(125,211,252,0.95)"
                    strokeWidth="2"
                    strokeDasharray="8 6"
                  />
                ))}
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

        {(selected || selectedRoomView) && (
          <div className="absolute inset-y-0 right-0 z-20 w-full max-w-[22rem] overflow-y-auto border-l border-slate-700 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-xl">
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

                  {roomMap.get(getTableRoomName(selected)) && (
                    <div className="border-t border-slate-700 pt-2">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs text-slate-500">Move & Align</p>
                        <span className="text-[11px] text-slate-500">
                          {Math.round(getTablePos(selected).x)}, {Math.round(getTablePos(selected).y)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="label text-xs">X</label>
                          <CommitNumberInput
                            value={Math.round(getTablePos(selected).x)}
                            onCommit={(value) =>
                              updateTableDraftPosition(selected, getTableRoomName(selected), { x: value })
                            }
                            className="input w-full"
                            min={ROOM_INNER_PADDING}
                            max={Math.max(
                              ROOM_INNER_PADDING,
                              (getInteractiveRoom(roomMap.get(getTableRoomName(selected))!)?.width || 0) -
                                Number(selected.width || 100) -
                                ROOM_INNER_PADDING
                            )}
                          />
                        </div>

                        <div>
                          <label className="label text-xs">Y</label>
                          <CommitNumberInput
                            value={Math.round(getTablePos(selected).y)}
                            onCommit={(value) =>
                              updateTableDraftPosition(selected, getTableRoomName(selected), { y: value })
                            }
                            className="input w-full"
                            min={ROOM_INNER_PADDING}
                            max={Math.max(
                              ROOM_INNER_PADDING,
                              (getInteractiveRoom(roomMap.get(getTableRoomName(selected))!)?.height || 0) -
                                Number(selected.height || 80) -
                                ROOM_INNER_PADDING
                            )}
                          />
                        </div>
                      </div>

                      <div className="mt-3">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Nudge
                        </p>
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { label: 'Left', dx: -12, dy: 0 },
                            { label: 'Up', dx: 0, dy: -12 },
                            { label: 'Down', dx: 0, dy: 12 },
                            { label: 'Right', dx: 12, dy: 0 },
                          ].map((control) => (
                            <button
                              key={control.label}
                              type="button"
                              onClick={() => nudgeSelectedTable(control.dx, control.dy)}
                              className="btn-secondary min-h-[40px] px-2 py-2 text-[11px]"
                            >
                              {control.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="mt-3">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Align In Room
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: 'Left', value: 'left' as const },
                            { label: 'Center', value: 'center' as const },
                            { label: 'Right', value: 'right' as const },
                            { label: 'Top', value: 'top' as const },
                            { label: 'Middle', value: 'middle' as const },
                            { label: 'Bottom', value: 'bottom' as const },
                          ].map((alignment) => (
                            <button
                              key={alignment.value}
                              type="button"
                              onClick={() => alignSelectedTable(alignment.value)}
                              className="btn-secondary min-h-[40px] px-2 py-2 text-[11px]"
                            >
                              {alignment.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <p className="mt-2 text-[11px] leading-5 text-slate-500">
                        Position changes stay local until you use Save Layout.
                      </p>
                    </div>
                  )}

                  <div className="border-t border-slate-700 pt-2">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs text-slate-500">Template</p>
                      <button
                        type="button"
                        onClick={() => {
                          beginTemplateEdit({
                            id: selectedTemplate?.id || '',
                            name: selectedTemplate?.name || `${selected.name} Template`,
                            shape: selected.shape,
                            width: selected.width,
                            height: selected.height,
                            capacity: selected.capacity,
                          });
                          setShowTemplateManager(true);
                        }}
                        className="text-xs text-blue-300 hover:text-blue-200"
                      >
                        Save as Template
                      </button>
                    </div>
                    <div className="rounded-2xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-300">
                      {selectedTemplate ? selectedTemplate.name : 'No template linked yet'}
                    </div>
                  </div>

                  <div className="border-t border-slate-700 pt-2">
                    <label className="label text-xs">Assigned Server</label>
                    <select
                      value={selectedAssignment?.serverId || ''}
                      onChange={(event) => setTableAssignment(selected.id, event.target.value)}
                      className="input w-full"
                    >
                      <option value="">Unassigned</option>
                      {assignableStaff.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name} ({member.role})
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs text-slate-500">
                      Servers and bartenders can only open tables assigned to them.
                    </p>
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
            ) : selectedRoomView ? (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-100">{selectedRoomView.name}</h3>
                    <p className="text-xs text-slate-500">
                      {selectedRoomView.type === 'bar' ? 'Bar room with connected seats' : 'Dining room layout'}
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
                        onClick={() =>
                          setRoomOrder(selectedRoomView.name, Math.max(1, selectedRoomView.order - 1))
                        }
                        className="btn-secondary text-xs"
                      >
                        Earlier
                      </button>
                      <CommitNumberInput
                        value={selectedRoomView.order}
                        onCommit={(value) =>
                          setRoomOrder(
                            selectedRoomView.name,
                            value
                          )
                        }
                        className="input w-full text-center"
                        min={1}
                        max={rooms.length}
                      />
                      <button
                        type="button"
                        onClick={() => setRoomOrder(selectedRoomView.name, selectedRoomView.order + 1)}
                        className="btn-secondary text-xs"
                      >
                        Later
                      </button>
                    </div>
                  </div>

                  {isSingleRoomLayout && (
                    <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                            Full Workspace
                          </p>
                          <p className="mt-1 text-xs leading-5 text-slate-300">
                            This room can stretch to the full editor canvas for easier placement.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={expandSelectedRoomToCanvas}
                          className="btn-secondary min-h-[40px] px-3 py-2 text-xs"
                        >
                          Fill Canvas
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label text-xs">Width</label>
                      <CommitNumberInput
                        value={selectedRoomView.width}
                        onCommit={(value) =>
                          updateDraftPlan((current) => ({
                            ...current,
                            rooms: current.rooms.map((room) =>
                              room.name === selectedRoomView.name
                                ? {
                                    ...room,
                                    width: clamp(value, 260, 900),
                                  }
                                : room
                            ),
                          }))
                        }
                        className="input w-full"
                        min={260}
                        max={900}
                      />
                    </div>

                    <div>
                      <label className="label text-xs">Height</label>
                      <CommitNumberInput
                        value={selectedRoomView.height}
                        onCommit={(value) =>
                          updateDraftPlan((current) => ({
                            ...current,
                            rooms: current.rooms.map((room) =>
                              room.name === selectedRoomView.name
                                ? {
                                    ...room,
                                    height: clamp(value, 180, 720),
                                  }
                                : room
                            ),
                          }))
                        }
                        className="input w-full"
                        min={180}
                        max={720}
                      />
                    </div>
                  </div>

                  {!focusedRoomName && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label text-xs">Map X</label>
                        <CommitNumberInput
                          value={Math.round(selectedRoomView.x)}
                          onCommit={(value) =>
                            updateDraftPlan((current) => ({
                              ...current,
                              layoutMode: 'manual',
                              rooms: current.rooms.map((room) =>
                                room.name === selectedRoomView.name
                                  ? {
                                      ...room,
                                      x: Math.max(0, value),
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
                        <CommitNumberInput
                          value={Math.round(selectedRoomView.y)}
                          onCommit={(value) =>
                            updateDraftPlan((current) => ({
                              ...current,
                              layoutMode: 'manual',
                              rooms: current.rooms.map((room) =>
                                room.name === selectedRoomView.name
                                  ? {
                                      ...room,
                                      y: Math.max(0, value),
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
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Section Assignment
                      </p>
                      <span className="text-xs text-slate-400">
                        {(tablesByRoom.get(selectedRoomView.name) || []).length} tables
                      </span>
                    </div>
                    <div className="space-y-2">
                      <select
                        value={bulkAssignedServerId}
                        onChange={(event) => setBulkAssignedServerId(event.target.value)}
                        className="input w-full"
                      >
                        <option value="">Choose a server or bartender</option>
                        {assignableStaff.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name} ({member.role})
                          </option>
                        ))}
                      </select>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (!bulkAssignedServerId) {
                              toast.error('Pick a staff member first');
                              return;
                            }
                            setRoomAssignments(selectedRoomView.name, bulkAssignedServerId);
                          }}
                          className="btn-primary text-xs"
                        >
                          Assign Room
                        </button>
                        <button
                          type="button"
                          onClick={() => setRoomAssignments(selectedRoomView.name, '')}
                          className="btn-secondary text-xs"
                        >
                          Clear Room
                        </button>
                      </div>
                    </div>
                  </div>

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
                    <>
                      <div className="border-t border-slate-700 pt-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Bar Layout
                        </p>
                        <div className="space-y-3">
                          <div>
                            <label className="label text-xs">Counter Style</label>
                            <div className="grid grid-cols-3 gap-2">
                              {BAR_STYLES.map((style) => (
                                <button
                                  key={style}
                                  type="button"
                                  onClick={() => updateBarRoomLayout(selectedRoom, { style })}
                                  className={clsx(
                                    'rounded-xl border px-2 py-2 text-[11px] font-semibold capitalize transition-all',
                                    selectedRoom.bar?.style === style
                                      ? 'border-amber-400 bg-amber-500/10 text-amber-100'
                                      : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500'
                                  )}
                                >
                                  {style}
                                </button>
                              ))}
                            </div>
                          </div>

                          {selectedRoom.bar?.style !== 'straight' ? (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between gap-3">
                                <label className="label text-xs">Server Walkways</label>
                                <button
                                  type="button"
                                  onClick={() => addBarWalkway(selectedRoom)}
                                  className="btn-secondary px-3 py-1.5 text-[11px]"
                                >
                                  Add Walkway
                                </button>
                              </div>

                              <div className="space-y-2">
                                {selectedRoomWalkways.map((walkway) => (
                                  <div
                                    key={walkway.id}
                                    className="rounded-2xl border border-slate-700 bg-slate-800/70 p-3"
                                  >
                                    <div className="grid gap-3 sm:grid-cols-[1fr_112px_auto]">
                                      <select
                                        value={walkway.side}
                                        onChange={(event) =>
                                          updateBarWalkway(selectedRoom, walkway.id, {
                                            side: event.target.value as BarOpeningSide,
                                          })
                                        }
                                        className="input w-full text-xs uppercase"
                                      >
                                        {BAR_OPENING_SIDES.map((side) => (
                                          <option key={side} value={side}>
                                            {side}
                                          </option>
                                        ))}
                                      </select>

                                      <CommitNumberInput
                                        value={walkway.width}
                                        onCommit={(value) =>
                                          updateBarWalkway(selectedRoom, walkway.id, {
                                            width: clamp(value, 64, 140),
                                          })
                                        }
                                        className="input w-full text-xs"
                                        min={64}
                                        max={140}
                                      />

                                      <button
                                        type="button"
                                        onClick={() => removeBarWalkway(selectedRoom, walkway.id)}
                                        className="btn-secondary px-3 py-2 text-[11px]"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <p className="text-[11px] leading-5 text-slate-400">
                                Use multiple walkways to keep bartender entry and exit clear while still wrapping seats around the bar.
                              </p>
                            </div>
                          ) : (
                            <p className="rounded-2xl border border-slate-700 bg-slate-800/70 px-3 py-3 text-[11px] leading-5 text-slate-400">
                              Straight bars keep a fixed working lane behind the counter. Switch to rectangle or circle bars to place multiple configurable walkways.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="border-t border-slate-700 pt-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Bar Seats
                        </p>
                        <div className="flex gap-2">
                          <CommitNumberInput
                            value={extraBarSeats}
                            onCommit={(value) => setExtraBarSeats(value)}
                            className="input flex-1"
                            min={1}
                            max={12}
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
                          Existing stools stay in a walkable ring and regular bar tables can still live in this room.
                        </p>
                      </div>
                    </>
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

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="label">Table Design</label>
                  <button
                    type="button"
                    onClick={() => {
                      beginTemplateEdit();
                      setShowTemplateManager(true);
                    }}
                    className="text-xs text-blue-300 hover:text-blue-200"
                  >
                    Manage Templates
                  </button>
                </div>
                <select
                  value={newTable.templateId}
                  onChange={(event) => applyTemplateSelection(event.target.value)}
                  className="input w-full"
                >
                  <option value="">Custom table</option>
                  {tableTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} ({template.capacity} seats)
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-slate-500">
                  Design table types once, then reuse them across every room.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Capacity</label>
                  <CommitNumberInput
                    value={newTable.capacity}
                    onCommit={(value) =>
                      setNewTable({
                        ...newTable,
                        capacity: value,
                      })
                    }
                    className="input w-full"
                    min={1}
                    max={20}
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
                  <CommitNumberInput
                    value={newTable.width}
                    onCommit={(value) =>
                      setNewTable({
                        ...newTable,
                        width: value,
                      })
                    }
                    className="input w-full"
                    min={40}
                    max={220}
                  />
                </div>

                <div>
                  <label className="label">Height (px)</label>
                  <CommitNumberInput
                    value={newTable.height}
                    onCommit={(value) =>
                      setNewTable({
                        ...newTable,
                        height: value,
                      })
                    }
                    className="input w-full"
                    min={40}
                    max={220}
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

      {showTemplateManager && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="card flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
              <div>
                <h2 className="font-bold text-slate-100">Table Templates</h2>
                <p className="text-sm text-slate-400">
                  Build consistent 2-tops, booths, bar tables, and any other repeatable table design.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTemplateManager(false)}
                className="text-sm text-slate-400 hover:text-slate-200"
              >
                Close
              </button>
            </div>

            <div className="grid flex-1 gap-0 overflow-hidden md:grid-cols-[1.2fr_0.8fr]">
              <div className="overflow-y-auto border-r border-slate-700 p-6">
                <div className="space-y-3">
                  {tableTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="rounded-3xl border border-slate-700 bg-slate-900/70 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-slate-100">{template.name}</h3>
                          <p className="mt-1 text-xs text-slate-400">
                            {template.capacity} guests · {template.shape} · {template.width}x{template.height}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => beginTemplateEdit(template)}
                            className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteTemplate(template.id)}
                            className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="overflow-y-auto p-6">
                <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-100">
                        {editingTemplateId ? 'Edit Template' : 'New Template'}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Save the table once and reuse it from a dropdown.
                      </p>
                    </div>
                    {editingTemplateId && (
                      <button
                        type="button"
                        onClick={() => beginTemplateEdit()}
                        className="text-xs text-slate-400 hover:text-slate-200"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="label">Template Name</label>
                      <input
                        value={templateForm.name}
                        onChange={(event) => setTemplateForm({ ...templateForm, name: event.target.value })}
                        className="input w-full"
                        placeholder="4 Top Round, Patio Deuce, Booth 6"
                      />
                    </div>

                    <div>
                      <label className="label">Shape</label>
                      <div className="grid grid-cols-3 gap-2">
                        {SHAPES.map((shape) => (
                          <button
                            key={shape}
                            type="button"
                            onClick={() => setTemplateForm({ ...templateForm, shape: shape as FloorTableTemplate['shape'] })}
                            className={clsx(
                              'rounded-xl border py-2 text-xs font-medium capitalize transition-all',
                              templateForm.shape === shape
                                ? 'border-blue-500 bg-blue-600 text-white'
                                : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500'
                            )}
                          >
                            {shape}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="label">Capacity</label>
                        <CommitNumberInput
                          value={templateForm.capacity}
                          onCommit={(value) =>
                            setTemplateForm({
                              ...templateForm,
                              capacity: value,
                            })
                          }
                          className="input w-full"
                          min={1}
                          max={20}
                        />
                      </div>
                      <div>
                        <label className="label">Width</label>
                        <CommitNumberInput
                          value={templateForm.width}
                          onCommit={(value) =>
                            setTemplateForm({
                              ...templateForm,
                              width: value,
                            })
                          }
                          className="input w-full"
                          min={40}
                          max={260}
                        />
                      </div>
                      <div>
                        <label className="label">Height</label>
                        <CommitNumberInput
                          value={templateForm.height}
                          onCommit={(value) =>
                            setTemplateForm({
                              ...templateForm,
                              height: value,
                            })
                          }
                          className="input w-full"
                          min={40}
                          max={260}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex gap-3">
                    <button type="button" onClick={() => beginTemplateEdit()} className="btn-secondary flex-1">
                      Clear
                    </button>
                    <button type="button" onClick={saveTemplate} className="btn-primary flex-1">
                      {editingTemplateId ? 'Update Template' : 'Save Template'}
                    </button>
                  </div>
                </div>
              </div>
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
                <div className="space-y-3">
                  <div>
                    <label className="label">Initial Bar Seats</label>
                    <CommitNumberInput
                      value={barSeatCount}
                      onCommit={(value) => setBarSeatCount(value)}
                      className="input w-full"
                      min={2}
                      max={24}
                    />
                  </div>

                  <div>
                    <label className="label">Bar Style</label>
                    <div className="grid grid-cols-3 gap-2">
                      {BAR_STYLES.map((style) => (
                        <button
                          key={style}
                          type="button"
                          onClick={() => setBarStyleDraft(style)}
                          className={clsx(
                            'rounded-xl border px-3 py-2 text-xs font-semibold capitalize transition-all',
                            barStyleDraft === style
                              ? 'border-amber-400 bg-amber-500/10 text-amber-100'
                              : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500'
                          )}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>

                  {barStyleDraft !== 'straight' && (
                    <>
                      <div>
                        <label className="label">Initial Staff Walkway</label>
                        <div className="grid grid-cols-2 gap-2">
                          {BAR_OPENING_SIDES.map((side) => (
                            <button
                              key={side}
                              type="button"
                              onClick={() => setBarOpeningSideDraft(side)}
                              className={clsx(
                                'rounded-xl border px-3 py-2 text-xs font-semibold uppercase transition-all',
                                barOpeningSideDraft === side
                                  ? 'border-amber-400 bg-amber-500/10 text-amber-100'
                                  : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500'
                              )}
                            >
                              {side}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="label">Initial Walkway Width</label>
                        <CommitNumberInput
                          value={barWalkwayWidthDraft}
                          onCommit={(value) =>
                            setBarWalkwayWidthDraft(clamp(value, 64, 140))
                          }
                          className="input w-full"
                          min={64}
                          max={140}
                        />
                        <p className="mt-2 text-xs text-slate-400">
                          You can add more walkways after the bar room is created.
                        </p>
                      </div>
                    </>
                  )}
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
                  setBarStyleDraft('straight');
                  setBarOpeningSideDraft('south');
                  setBarWalkwayWidthDraft(88);
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
