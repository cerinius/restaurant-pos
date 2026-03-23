export const ROOM_GAP = 56;
export const ROOM_INNER_PADDING = 18;
export const DEFAULT_CANVAS_WIDTH = 1400;
export const DEFAULT_CANVAS_HEIGHT = 900;
export const CANVAS_PADDING = 48;

export type FloorRoomType = 'room' | 'bar';
export type FloorLayoutMode = 'auto' | 'manual';

export interface BarLayout {
  enabled: boolean;
  counterX: number;
  counterY: number;
  counterWidth: number;
  counterHeight: number;
  seatCount: number;
}

export interface FloorPlanRoom {
  name: string;
  order: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: FloorRoomType;
  bar: BarLayout | null;
}

export interface FloorPlanConnection {
  id: string;
  from: string;
  to: string;
}

export interface FloorPlanSettings {
  version: number;
  layoutMode: FloorLayoutMode;
  canvasWidth: number;
  canvasHeight: number;
  rooms: FloorPlanRoom[];
  connections: FloorPlanConnection[];
}

const MAX_BAR_SEATS_PER_ROW = 8;
const MIN_BAR_SEATS = 2;
const MAX_BAR_SEATS = 24;
const DEFAULT_BAR_SEATS = 8;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function normalizeRoomName(value?: string | null) {
  return value?.trim() ?? '';
}

export function getTableRoomName(table: any, fallback = 'Main') {
  return normalizeRoomName(table?.section) || fallback;
}

export function inferRoomType(roomName: string): FloorRoomType {
  return /bar/i.test(roomName) ? 'bar' : 'room';
}

export function sortFloorRooms<T extends { order?: number; name?: string }>(rooms: T[]) {
  return [...rooms].sort((a, b) => {
    const orderCompare = Number(a.order ?? 9999) - Number(b.order ?? 9999);
    if (orderCompare !== 0) return orderCompare;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });
}

export function makeConnectionId(firstRoom: string, secondRoom: string) {
  return [firstRoom, secondRoom].sort((a, b) => a.localeCompare(b)).join('::');
}

function sanitizeBarSeatCount(value?: number | null) {
  const next = Number(value ?? DEFAULT_BAR_SEATS);
  if (!Number.isFinite(next)) return DEFAULT_BAR_SEATS;
  return clamp(Math.round(next), MIN_BAR_SEATS, MAX_BAR_SEATS);
}

export function buildBarLayout(seatCount?: number | null) {
  const safeSeatCount = sanitizeBarSeatCount(seatCount);
  const columns = Math.min(MAX_BAR_SEATS_PER_ROW, safeSeatCount);
  const rows = Math.ceil(safeSeatCount / MAX_BAR_SEATS_PER_ROW);
  const width = clamp(140 + columns * 56, 360, 620);
  const height = 210 + Math.max(0, rows - 1) * 56;

  return {
    width,
    height,
    bar: {
      enabled: true,
      counterX: 28,
      counterY: 26,
      counterWidth: width - 56,
      counterHeight: 54,
      seatCount: safeSeatCount,
    } as BarLayout,
  };
}

export function createFloorRoom(
  roomName: string,
  order: number,
  type: FloorRoomType = inferRoomType(roomName),
  options?: { seatCount?: number | null }
): FloorPlanRoom {
  if (type === 'bar') {
    const barLayout = buildBarLayout(options?.seatCount);
    return {
      name: roomName,
      order,
      x: 0,
      y: 0,
      width: barLayout.width,
      height: barLayout.height,
      type,
      bar: barLayout.bar,
    };
  }

  return {
    name: roomName,
    order,
    x: 0,
    y: 0,
    width: 420,
    height: 320,
    type,
    bar: null,
  };
}

function normalizeSavedRoom(savedRoom: any, fallbackName: string, fallbackOrder: number): FloorPlanRoom {
  const type = savedRoom?.type === 'bar' || savedRoom?.type === 'room'
    ? savedRoom.type
    : inferRoomType(fallbackName);
  const baseRoom = createFloorRoom(fallbackName, fallbackOrder, type, {
    seatCount: savedRoom?.bar?.seatCount,
  });
  const width = clamp(Number(savedRoom?.width || baseRoom.width), 260, 900);
  const height = clamp(Number(savedRoom?.height || baseRoom.height), 180, 720);
  const barSeatCount = sanitizeBarSeatCount(savedRoom?.bar?.seatCount ?? baseRoom.bar?.seatCount);

  return {
    ...baseRoom,
    name: fallbackName,
    order: Number.isFinite(Number(savedRoom?.order)) ? Number(savedRoom.order) : fallbackOrder,
    x: Number.isFinite(Number(savedRoom?.x)) ? Number(savedRoom.x) : baseRoom.x,
    y: Number.isFinite(Number(savedRoom?.y)) ? Number(savedRoom.y) : baseRoom.y,
    width,
    height,
    bar:
      type === 'bar'
        ? {
            enabled: savedRoom?.bar?.enabled !== false,
            counterX: Number.isFinite(Number(savedRoom?.bar?.counterX))
              ? Number(savedRoom.bar.counterX)
              : 28,
            counterY: Number.isFinite(Number(savedRoom?.bar?.counterY))
              ? Number(savedRoom.bar.counterY)
              : 26,
            counterWidth: Number.isFinite(Number(savedRoom?.bar?.counterWidth))
              ? Number(savedRoom.bar.counterWidth)
              : Math.max(220, width - 56),
            counterHeight: Number.isFinite(Number(savedRoom?.bar?.counterHeight))
              ? Number(savedRoom.bar.counterHeight)
              : 54,
            seatCount: barSeatCount,
          }
        : null,
  };
}

export function autoArrangeRooms(rooms: FloorPlanRoom[], preferredCanvasWidth = DEFAULT_CANVAS_WIDTH) {
  const sortedRooms = sortFloorRooms(rooms);
  const maxWidth = Math.max(preferredCanvasWidth, 980);
  let cursorX = CANVAS_PADDING;
  let cursorY = CANVAS_PADDING;
  let rowHeight = 0;

  return sortedRooms.map((room, index) => {
    if (cursorX !== CANVAS_PADDING && cursorX + room.width > maxWidth - CANVAS_PADDING) {
      cursorX = CANVAS_PADDING;
      cursorY += rowHeight + ROOM_GAP;
      rowHeight = 0;
    }

    const nextRoom = {
      ...room,
      order: index + 1,
      x: cursorX,
      y: cursorY,
    };

    cursorX += room.width + ROOM_GAP;
    rowHeight = Math.max(rowHeight, room.height);
    return nextRoom;
  });
}

function fillMissingRoomCoordinates(rooms: FloorPlanRoom[], preferredCanvasWidth = DEFAULT_CANVAS_WIDTH) {
  const autoRooms = autoArrangeRooms(rooms, preferredCanvasWidth);

  return sortFloorRooms(rooms).map((room, index) => {
    const fallbackRoom = autoRooms[index];
    return {
      ...room,
      order: index + 1,
      x: Number.isFinite(Number(room.x)) ? room.x : fallbackRoom.x,
      y: Number.isFinite(Number(room.y)) ? room.y : fallbackRoom.y,
    };
  });
}

export function getCanvasBounds(rooms: FloorPlanRoom[]) {
  const width =
    rooms.reduce((max, room) => Math.max(max, room.x + room.width), 0) + CANVAS_PADDING;
  const height =
    rooms.reduce((max, room) => Math.max(max, room.y + room.height), 0) + CANVAS_PADDING;

  return {
    width: Math.max(DEFAULT_CANVAS_WIDTH, width),
    height: Math.max(DEFAULT_CANVAS_HEIGHT, height),
  };
}

export function coerceFloorPlan(rawFloorPlan: any, tables: any[] = []): FloorPlanSettings {
  const savedRooms = Array.isArray(rawFloorPlan?.rooms) ? rawFloorPlan.rooms : [];
  const savedConnections = Array.isArray(rawFloorPlan?.connections) ? rawFloorPlan.connections : [];
  const inferredRooms = tables
    .map((table) => getTableRoomName(table))
    .filter(Boolean);
  const orderedNames: string[] = [];

  sortFloorRooms(savedRooms).forEach((room: any) => {
    const roomName = normalizeRoomName(room?.name);
    if (roomName && !orderedNames.includes(roomName)) orderedNames.push(roomName);
  });

  inferredRooms.sort((a, b) => a.localeCompare(b)).forEach((roomName) => {
    if (!orderedNames.includes(roomName)) orderedNames.push(roomName);
  });

  const roomMap = new Map(
    savedRooms
      .map((room: any) => [normalizeRoomName(room?.name), room] as const)
      .filter(([roomName]) => !!roomName)
  );

  const normalizedRooms = orderedNames.map((roomName, index) =>
    normalizeSavedRoom(roomMap.get(roomName), roomName, index + 1)
  );
  const layoutMode = rawFloorPlan?.layoutMode === 'manual' ? 'manual' : 'auto';
  const positionedRooms =
    layoutMode === 'manual'
      ? fillMissingRoomCoordinates(normalizedRooms, Number(rawFloorPlan?.canvasWidth) || DEFAULT_CANVAS_WIDTH)
      : autoArrangeRooms(normalizedRooms, Number(rawFloorPlan?.canvasWidth) || DEFAULT_CANVAS_WIDTH);
  const roomNames = new Set(positionedRooms.map((room) => room.name));
  const connections = savedConnections
    .map((connection: any) => {
      const from = normalizeRoomName(connection?.from);
      const to = normalizeRoomName(connection?.to);
      if (!from || !to || from === to) return null;
      if (!roomNames.has(from) || !roomNames.has(to)) return null;
      return {
        id: makeConnectionId(from, to),
        from,
        to,
      } as FloorPlanConnection;
    })
    .filter(Boolean)
    .filter((connection, index, current) => {
      return current.findIndex((item) => item!.id === connection!.id) === index;
    }) as FloorPlanConnection[];
  const bounds = getCanvasBounds(positionedRooms);

  return {
    version: 1,
    layoutMode,
    canvasWidth: Math.max(Number(rawFloorPlan?.canvasWidth) || 0, bounds.width),
    canvasHeight: Math.max(Number(rawFloorPlan?.canvasHeight) || 0, bounds.height),
    rooms: positionedRooms,
    connections,
  };
}

export function applyAutoLayoutToFloorPlan(floorPlan: FloorPlanSettings) {
  const rooms = autoArrangeRooms(floorPlan.rooms, floorPlan.canvasWidth);
  const bounds = getCanvasBounds(rooms);

  return {
    ...floorPlan,
    layoutMode: 'auto' as FloorLayoutMode,
    canvasWidth: Math.max(floorPlan.canvasWidth, bounds.width),
    canvasHeight: Math.max(floorPlan.canvasHeight, bounds.height),
    rooms,
  };
}

export function resizeBarRoomForSeatCount(room: FloorPlanRoom, seatCount?: number | null) {
  const nextRoom = createFloorRoom(room.name, room.order, 'bar', { seatCount });
  return {
    ...room,
    width: Math.max(room.width, nextRoom.width),
    height: Math.max(room.height, nextRoom.height),
    type: 'bar' as FloorRoomType,
    bar: {
      ...(nextRoom.bar as BarLayout),
      ...(room.bar || {}),
      seatCount: sanitizeBarSeatCount(seatCount ?? room.bar?.seatCount),
      counterWidth: Math.max(room.bar?.counterWidth || 0, nextRoom.bar?.counterWidth || 0),
    },
  };
}

export function buildBarSeatDrafts(roomName: string, existingSeatCount: number, seatCount: number) {
  const safeSeatCount = sanitizeBarSeatCount(seatCount);
  const room = createFloorRoom(roomName, 1, 'bar', {
    seatCount: existingSeatCount + safeSeatCount,
  });
  const prefix = /bar/i.test(roomName) ? roomName : `${roomName} Seat`;

  return Array.from({ length: safeSeatCount }).map((_, index) => {
    const seatNumber = existingSeatCount + index + 1;
    const seatIndex = seatNumber - 1;
    const column = seatIndex % MAX_BAR_SEATS_PER_ROW;
    const row = Math.floor(seatIndex / MAX_BAR_SEATS_PER_ROW);

    return {
      name: `${prefix} ${seatNumber}`,
      capacity: 1,
      shape: 'circle',
      section: roomName,
      width: 44,
      height: 44,
      positionX: 46 + column * 52,
      positionY: (room.bar?.counterY || 26) + (room.bar?.counterHeight || 54) + 34 + row * 54,
    };
  });
}

export function getRoomCenter(room: FloorPlanRoom) {
  return {
    x: room.x + room.width / 2,
    y: room.y + room.height / 2,
  };
}
