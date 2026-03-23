export const ROOM_GAP = 56;
export const ROOM_INNER_PADDING = 18;
export const DEFAULT_CANVAS_WIDTH = 1400;
export const DEFAULT_CANVAS_HEIGHT = 900;
export const CANVAS_PADDING = 48;
export const BAR_SEAT_SIZE = 44;

export type FloorRoomType = 'room' | 'bar';
export type FloorLayoutMode = 'auto' | 'manual';
export type BarStyle = 'straight' | 'rectangle' | 'circle';
export type BarOpeningSide = 'north' | 'south' | 'east' | 'west';
export type FloorTableKind = 'standard' | 'bar-seat';

export interface FloorTableTemplate {
  id: string;
  name: string;
  shape: 'rectangle' | 'square' | 'circle';
  width: number;
  height: number;
  capacity: number;
}

export interface FloorTableAssignment {
  tableId: string;
  serverId: string;
  serverName: string;
}

export interface FloorTableMetadata {
  tableId: string;
  templateId?: string;
  kind: FloorTableKind;
}

export interface BarLayout {
  enabled: boolean;
  style: BarStyle;
  openingSide: BarOpeningSide;
  aisleWidth: number;
  counterX: number;
  counterY: number;
  counterWidth: number;
  counterHeight: number;
  counterRadius: number;
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
  tableTemplates: FloorTableTemplate[];
  tableAssignments: FloorTableAssignment[];
  tableMetadata: FloorTableMetadata[];
}

const MAX_BAR_SEATS_PER_ROW = 8;
const MIN_BAR_SEATS = 2;
const MAX_BAR_SEATS = 24;
const DEFAULT_BAR_SEATS = 8;
const DEFAULT_BAR_STYLE: BarStyle = 'straight';
const DEFAULT_BAR_OPENING_SIDE: BarOpeningSide = 'south';
const DEFAULT_BAR_AISLE_WIDTH = 88;

export const DEFAULT_TABLE_TEMPLATES: FloorTableTemplate[] = [
  { id: 'two-top-round', name: '2 Top Round', shape: 'circle', width: 72, height: 72, capacity: 2 },
  { id: 'four-top-square', name: '4 Top Square', shape: 'square', width: 90, height: 90, capacity: 4 },
  { id: 'six-top-rect', name: '6 Top Rectangle', shape: 'rectangle', width: 124, height: 84, capacity: 6 },
  { id: 'booth-four', name: 'Booth 4', shape: 'rectangle', width: 136, height: 80, capacity: 4 },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
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

function sanitizeBarStyle(value?: string | null): BarStyle {
  return value === 'rectangle' || value === 'circle' || value === 'straight'
    ? value
    : DEFAULT_BAR_STYLE;
}

function sanitizeOpeningSide(value?: string | null): BarOpeningSide {
  return value === 'north' || value === 'south' || value === 'east' || value === 'west'
    ? value
    : DEFAULT_BAR_OPENING_SIDE;
}

function normalizeTemplate(rawTemplate: any, fallbackIndex: number): FloorTableTemplate {
  const shape =
    rawTemplate?.shape === 'circle' || rawTemplate?.shape === 'square' || rawTemplate?.shape === 'rectangle'
      ? rawTemplate.shape
      : 'rectangle';

  return {
    id: String(rawTemplate?.id || createId(`template-${fallbackIndex + 1}`)),
    name: String(rawTemplate?.name || `Template ${fallbackIndex + 1}`),
    shape,
    width: clamp(Number(rawTemplate?.width || 100), 40, 260),
    height: clamp(Number(rawTemplate?.height || 80), 40, 260),
    capacity: clamp(Number(rawTemplate?.capacity || 4), 1, 20),
  };
}

function normalizeAssignment(rawAssignment: any): FloorTableAssignment | null {
  const tableId = String(rawAssignment?.tableId || '').trim();
  const serverId = String(rawAssignment?.serverId || '').trim();
  const serverName = String(rawAssignment?.serverName || '').trim();

  if (!tableId || !serverId) return null;

  return {
    tableId,
    serverId,
    serverName: serverName || 'Assigned Server',
  };
}

function normalizeTableMetadata(rawMetadata: any): FloorTableMetadata | null {
  const tableId = String(rawMetadata?.tableId || '').trim();
  if (!tableId) return null;

  return {
    tableId,
    templateId: rawMetadata?.templateId ? String(rawMetadata.templateId) : undefined,
    kind: rawMetadata?.kind === 'bar-seat' ? 'bar-seat' : 'standard',
  };
}

export function getFloorTemplates(rawTemplates?: any[]) {
  const source = Array.isArray(rawTemplates) && rawTemplates.length > 0 ? rawTemplates : DEFAULT_TABLE_TEMPLATES;
  return source.map((template, index) => normalizeTemplate(template, index));
}

export function getTableAssignment(
  assignments: FloorTableAssignment[] | undefined,
  tableId?: string | null
) {
  if (!tableId) return null;
  return (assignments || []).find((assignment) => assignment.tableId === tableId) || null;
}

export function getTableMetadata(
  metadata: FloorTableMetadata[] | undefined,
  tableId?: string | null
) {
  if (!tableId) return null;
  return (metadata || []).find((entry) => entry.tableId === tableId) || null;
}

export function isBarSeatTable(
  table: any,
  room?: FloorPlanRoom | null,
  metadata?: FloorTableMetadata[] | null
) {
  const savedMetadata = getTableMetadata(metadata || undefined, table?.id);
  if (savedMetadata?.kind === 'bar-seat') return true;
  if (savedMetadata?.kind === 'standard') return false;
  if (room?.type !== 'bar') return false;

  const name = String(table?.name || '').toLowerCase();
  const width = Number(table?.width || 0);
  const height = Number(table?.height || 0);
  const capacity = Number(table?.capacity || 0);

  return (
    capacity <= 1 &&
    width <= BAR_SEAT_SIZE + 4 &&
    height <= BAR_SEAT_SIZE + 4 &&
    (name.includes('bar') || name.includes('seat'))
  );
}

export function getBarSeatCountForRoom(
  room: FloorPlanRoom,
  tables: any[],
  metadata?: FloorTableMetadata[] | null
) {
  return tables.filter((table) => isBarSeatTable(table, room, metadata)).length;
}

export function applyTemplateToDraft(template: FloorTableTemplate, roomName: string) {
  return {
    name: '',
    capacity: template.capacity,
    shape: template.shape,
    section: roomName,
    width: template.width,
    height: template.height,
    templateId: template.id,
  };
}

export function buildBarLayout(
  seatCount?: number | null,
  options?: {
    style?: BarStyle | string | null;
    openingSide?: BarOpeningSide | string | null;
    aisleWidth?: number | null;
  }
) {
  const safeSeatCount = sanitizeBarSeatCount(seatCount);
  const style = sanitizeBarStyle(options?.style);
  const openingSide = sanitizeOpeningSide(options?.openingSide);
  const aisleWidth = clamp(Number(options?.aisleWidth || DEFAULT_BAR_AISLE_WIDTH), 64, 140);

  if (style === 'rectangle') {
    const counterWidth = clamp(220 + Math.min(10, safeSeatCount) * 8, 240, 360);
    const counterHeight = clamp(120 + Math.min(8, safeSeatCount) * 6, 150, 240);
    const width = counterWidth + aisleWidth * 2 + 150;
    const height = counterHeight + aisleWidth * 2 + 150;

    return {
      width,
      height,
      bar: {
        enabled: true,
        style,
        openingSide,
        aisleWidth,
        counterX: (width - counterWidth) / 2,
        counterY: (height - counterHeight) / 2,
        counterWidth,
        counterHeight,
        counterRadius: 28,
        seatCount: safeSeatCount,
      } as BarLayout,
    };
  }

  if (style === 'circle') {
    const diameter = clamp(170 + Math.min(10, safeSeatCount) * 6, 190, 270);
    const width = diameter + aisleWidth * 2 + 150;
    const height = diameter + aisleWidth * 2 + 150;

    return {
      width,
      height,
      bar: {
        enabled: true,
        style,
        openingSide,
        aisleWidth,
        counterX: (width - diameter) / 2,
        counterY: (height - diameter) / 2,
        counterWidth: diameter,
        counterHeight: diameter,
        counterRadius: diameter / 2,
        seatCount: safeSeatCount,
      } as BarLayout,
    };
  }

  const columns = Math.min(MAX_BAR_SEATS_PER_ROW, safeSeatCount);
  const rows = Math.ceil(safeSeatCount / MAX_BAR_SEATS_PER_ROW);
  const counterWidth = clamp(180 + columns * 48, 240, 540);
  const counterHeight = 56;
  const width = counterWidth + 72;
  const height = counterHeight + aisleWidth + 98 + Math.max(0, rows - 1) * 54;

  return {
    width,
    height,
    bar: {
      enabled: true,
      style,
      openingSide: 'south',
      aisleWidth,
      counterX: 36,
      counterY: 28,
      counterWidth,
      counterHeight,
      counterRadius: 24,
      seatCount: safeSeatCount,
    } as BarLayout,
  };
}

function createEmptyRoom(name: string, order: number, type: FloorRoomType): FloorPlanRoom {
  return {
    name,
    order,
    x: 0,
    y: 0,
    width: 420,
    height: 320,
    type,
    bar: null,
  };
}

export function createFloorRoom(
  roomName: string,
  order: number,
  type: FloorRoomType = inferRoomType(roomName),
  options?: {
    seatCount?: number | null;
    barStyle?: BarStyle | string | null;
    openingSide?: BarOpeningSide | string | null;
    aisleWidth?: number | null;
  }
): FloorPlanRoom {
  if (type !== 'bar') {
    return createEmptyRoom(roomName, order, type);
  }

  const barLayout = buildBarLayout(options?.seatCount, {
    style: options?.barStyle,
    openingSide: options?.openingSide,
    aisleWidth: options?.aisleWidth,
  });

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

function normalizeSavedRoom(savedRoom: any, fallbackName: string, fallbackOrder: number): FloorPlanRoom {
  const type =
    savedRoom?.type === 'bar' || savedRoom?.type === 'room'
      ? savedRoom.type
      : inferRoomType(fallbackName);
  const baseRoom = createFloorRoom(fallbackName, fallbackOrder, type, {
    seatCount: savedRoom?.bar?.seatCount,
    barStyle: savedRoom?.bar?.style,
    openingSide: savedRoom?.bar?.openingSide,
    aisleWidth: savedRoom?.bar?.aisleWidth,
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
            style: sanitizeBarStyle(savedRoom?.bar?.style),
            openingSide: sanitizeOpeningSide(savedRoom?.bar?.openingSide),
            aisleWidth: clamp(
              Number(savedRoom?.bar?.aisleWidth || baseRoom.bar?.aisleWidth || DEFAULT_BAR_AISLE_WIDTH),
              64,
              140
            ),
            counterX: Number.isFinite(Number(savedRoom?.bar?.counterX))
              ? Number(savedRoom.bar.counterX)
              : (baseRoom.bar?.counterX || 0),
            counterY: Number.isFinite(Number(savedRoom?.bar?.counterY))
              ? Number(savedRoom.bar.counterY)
              : (baseRoom.bar?.counterY || 0),
            counterWidth: Number.isFinite(Number(savedRoom?.bar?.counterWidth))
              ? Number(savedRoom.bar.counterWidth)
              : Math.max(160, width - 80),
            counterHeight: Number.isFinite(Number(savedRoom?.bar?.counterHeight))
              ? Number(savedRoom.bar.counterHeight)
              : Math.max(56, (baseRoom.bar?.counterHeight || 56)),
            counterRadius: Number.isFinite(Number(savedRoom?.bar?.counterRadius))
              ? Number(savedRoom.bar.counterRadius)
              : Number(savedRoom?.bar?.counterWidth || baseRoom.bar?.counterWidth || 160) / 2,
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
  const width = rooms.reduce((max, room) => Math.max(max, room.x + room.width), 0) + CANVAS_PADDING;
  const height = rooms.reduce((max, room) => Math.max(max, room.y + room.height), 0) + CANVAS_PADDING;

  return {
    width: Math.max(DEFAULT_CANVAS_WIDTH, width),
    height: Math.max(DEFAULT_CANVAS_HEIGHT, height),
  };
}

export function coerceFloorPlan(rawFloorPlan: any, tables: any[] = []): FloorPlanSettings {
  const savedRooms = Array.isArray(rawFloorPlan?.rooms) ? rawFloorPlan.rooms : [];
  const savedConnections = Array.isArray(rawFloorPlan?.connections) ? rawFloorPlan.connections : [];
  const inferredRooms = tables.map((table) => getTableRoomName(table)).filter(Boolean);
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
    .filter((connection, index, current) => current.findIndex((item) => item!.id === connection!.id) === index) as FloorPlanConnection[];
  const tableTemplates = getFloorTemplates(rawFloorPlan?.tableTemplates);
  const tableAssignments = (Array.isArray(rawFloorPlan?.tableAssignments) ? rawFloorPlan.tableAssignments : [])
    .map(normalizeAssignment)
    .filter(Boolean) as FloorTableAssignment[];
  const tableMetadata = (Array.isArray(rawFloorPlan?.tableMetadata) ? rawFloorPlan.tableMetadata : [])
    .map(normalizeTableMetadata)
    .filter(Boolean) as FloorTableMetadata[];
  const bounds = getCanvasBounds(positionedRooms);

  return {
    version: 2,
    layoutMode,
    canvasWidth: Math.max(Number(rawFloorPlan?.canvasWidth) || 0, bounds.width),
    canvasHeight: Math.max(Number(rawFloorPlan?.canvasHeight) || 0, bounds.height),
    rooms: positionedRooms,
    connections,
    tableTemplates,
    tableAssignments,
    tableMetadata,
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

export function resizeBarRoomForSeatCount(
  room: FloorPlanRoom,
  seatCount?: number | null,
  options?: {
    style?: BarStyle | string | null;
    openingSide?: BarOpeningSide | string | null;
    aisleWidth?: number | null;
  }
) {
  const nextRoom = createFloorRoom(room.name, room.order, 'bar', {
    seatCount,
    barStyle: options?.style || room.bar?.style,
    openingSide: options?.openingSide || room.bar?.openingSide,
    aisleWidth: options?.aisleWidth || room.bar?.aisleWidth,
  });

  return {
    ...room,
    width: Math.max(room.width, nextRoom.width),
    height: Math.max(room.height, nextRoom.height),
    type: 'bar' as FloorRoomType,
    bar: {
      ...(nextRoom.bar as BarLayout),
      ...(room.bar || {}),
      style: sanitizeBarStyle(options?.style || room.bar?.style),
      openingSide: sanitizeOpeningSide(options?.openingSide || room.bar?.openingSide),
      aisleWidth: clamp(Number(options?.aisleWidth || room.bar?.aisleWidth || DEFAULT_BAR_AISLE_WIDTH), 64, 140),
      seatCount: sanitizeBarSeatCount(seatCount ?? room.bar?.seatCount),
      counterWidth: nextRoom.bar?.counterWidth || room.bar?.counterWidth || 180,
      counterHeight: nextRoom.bar?.counterHeight || room.bar?.counterHeight || 56,
      counterRadius: nextRoom.bar?.counterRadius || room.bar?.counterRadius || 24,
      counterX: nextRoom.bar?.counterX || room.bar?.counterX || 0,
      counterY: nextRoom.bar?.counterY || room.bar?.counterY || 0,
    },
  };
}

function distributeSeats(totalSeats: number, edges: BarOpeningSide[]) {
  const counts = new Map<BarOpeningSide, number>();
  edges.forEach((edge) => counts.set(edge, 0));

  for (let index = 0; index < totalSeats; index += 1) {
    const edge = edges[index % edges.length];
    counts.set(edge, (counts.get(edge) || 0) + 1);
  }

  return counts;
}

function spreadPositions(count: number, length: number) {
  if (count <= 0) return [];
  if (count === 1) return [length / 2];

  const inset = 20;
  const usable = Math.max(length - inset * 2, count * 18);
  const step = usable / (count - 1);

  return Array.from({ length: count }).map((_, index) => inset + index * step);
}

export function getBarSeatDraftPositions(room: FloorPlanRoom, seatCount: number) {
  const bar = room.bar;
  if (!bar) return [];

  if (bar.style === 'circle') {
    const centerX = bar.counterX + bar.counterWidth / 2;
    const centerY = bar.counterY + bar.counterHeight / 2;
    const radius = bar.counterRadius + 34;
    const openingAngles: Record<BarOpeningSide, number> = {
      east: 0,
      south: 90,
      west: 180,
      north: 270,
    };
    const openingAngle = openingAngles[bar.openingSide];
    const walkwayGapDegrees = 78;
    const step = (360 - walkwayGapDegrees) / seatCount;

    return Array.from({ length: seatCount }).map((_, index) => {
      const angleDeg = openingAngle + walkwayGapDegrees / 2 + step / 2 + index * step;
      const angle = (angleDeg * Math.PI) / 180;

      return {
        x: centerX + Math.cos(angle) * radius - BAR_SEAT_SIZE / 2,
        y: centerY + Math.sin(angle) * radius - BAR_SEAT_SIZE / 2,
      };
    });
  }

  if (bar.style === 'rectangle') {
    const seatOffset = 18;
    const allowedEdges = (['north', 'east', 'south', 'west'] as BarOpeningSide[]).filter(
      (edge) => edge !== bar.openingSide
    );
    const seatCounts = distributeSeats(seatCount, allowedEdges);
    const positions: Array<{ x: number; y: number }> = [];

    const topPositions = spreadPositions(seatCounts.get('north') || 0, bar.counterWidth);
    topPositions.forEach((positionX) => {
      positions.push({
        x: bar.counterX + positionX - BAR_SEAT_SIZE / 2,
        y: bar.counterY - BAR_SEAT_SIZE - seatOffset,
      });
    });

    const rightPositions = spreadPositions(seatCounts.get('east') || 0, bar.counterHeight);
    rightPositions.forEach((positionY) => {
      positions.push({
        x: bar.counterX + bar.counterWidth + seatOffset,
        y: bar.counterY + positionY - BAR_SEAT_SIZE / 2,
      });
    });

    const bottomPositions = spreadPositions(seatCounts.get('south') || 0, bar.counterWidth);
    bottomPositions.forEach((positionX) => {
      positions.push({
        x: bar.counterX + positionX - BAR_SEAT_SIZE / 2,
        y: bar.counterY + bar.counterHeight + seatOffset,
      });
    });

    const leftPositions = spreadPositions(seatCounts.get('west') || 0, bar.counterHeight);
    leftPositions.forEach((positionY) => {
      positions.push({
        x: bar.counterX - BAR_SEAT_SIZE - seatOffset,
        y: bar.counterY + positionY - BAR_SEAT_SIZE / 2,
      });
    });

    return positions;
  }

  const columns = Math.min(MAX_BAR_SEATS_PER_ROW, seatCount);
  const rows = Math.ceil(seatCount / MAX_BAR_SEATS_PER_ROW);
  const startX = bar.counterX + 12;
  const startY = bar.counterY + bar.counterHeight + 28;
  const positions: Array<{ x: number; y: number }> = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const seatIndex = row * MAX_BAR_SEATS_PER_ROW + column;
      if (seatIndex >= seatCount) break;

      positions.push({
        x: startX + column * 52,
        y: startY + row * 54,
      });
    }
  }

  return positions;
}

export function buildBarSeatDrafts(
  roomOrName: string | FloorPlanRoom,
  existingSeatCount: number,
  seatCount: number,
  options?: {
    style?: BarStyle | string | null;
    openingSide?: BarOpeningSide | string | null;
    aisleWidth?: number | null;
  }
) {
  const safeSeatCount = sanitizeBarSeatCount(seatCount);
  const totalSeats = existingSeatCount + safeSeatCount;
  const room =
    typeof roomOrName === 'string'
      ? createFloorRoom(roomOrName, 1, 'bar', {
          seatCount: totalSeats,
          barStyle: options?.style,
          openingSide: options?.openingSide,
          aisleWidth: options?.aisleWidth,
        })
      : resizeBarRoomForSeatCount(roomOrName, totalSeats, options);
  const positions = getBarSeatDraftPositions(room, totalSeats);
  const prefix = /bar/i.test(room.name) ? room.name : `${room.name} Seat`;

  return Array.from({ length: safeSeatCount }).map((_, index) => {
    const seatNumber = existingSeatCount + index + 1;
    const seatPosition = positions[seatNumber - 1] || { x: 48, y: 120 };

    return {
      name: `${prefix} ${seatNumber}`,
      capacity: 1,
      shape: 'circle',
      section: room.name,
      width: BAR_SEAT_SIZE,
      height: BAR_SEAT_SIZE,
      positionX: Math.round(seatPosition.x),
      positionY: Math.round(seatPosition.y),
    };
  });
}

export function getRoomCenter(room: FloorPlanRoom) {
  return {
    x: room.x + room.width / 2,
    y: room.y + room.height / 2,
  };
}
