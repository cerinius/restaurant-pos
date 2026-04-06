
// ============================================
// SHARED TYPES FOR THE ENTIRE POS SYSTEM
// ============================================

// ---- Enums ----
export enum UserRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  SERVER = 'SERVER',
  BARTENDER = 'BARTENDER',
  CASHIER = 'CASHIER',
  EXPO = 'EXPO',
  KDS = 'KDS',
}

export enum OrderStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  SENT = 'SENT',
  IN_PROGRESS = 'IN_PROGRESS',
  READY = 'READY',
  SERVED = 'SERVED',
  PAID = 'PAID',
  VOID = 'VOID',
  REFUNDED = 'REFUNDED',
}

export enum OrderType {
  DINE_IN = 'DINE_IN',
  TAKEOUT = 'TAKEOUT',
  DELIVERY = 'DELIVERY',
  BAR = 'BAR',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  GIFT_CARD = 'GIFT_CARD',
  SPLIT = 'SPLIT',
  COMP = 'COMP',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  AUTHORIZED = 'AUTHORIZED',
  CAPTURED = 'CAPTURED',
  FAILED = 'FAILED',
  VOIDED = 'VOIDED',
  REFUNDED = 'REFUNDED',
}

export enum KDSItemStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  READY = 'READY',
  SERVED = 'SERVED',
  VOIDED = 'VOIDED',
}

export enum TableStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  RESERVED = 'RESERVED',
  DIRTY = 'DIRTY',
  BLOCKED = 'BLOCKED',
}

export enum MenuItemStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
}

export enum ModifierType {
  SINGLE = 'SINGLE',
  MULTIPLE = 'MULTIPLE',
}

export enum DayPart {
  BREAKFAST = 'BREAKFAST',
  LUNCH = 'LUNCH',
  DINNER = 'DINNER',
  LATE_NIGHT = 'LATE_NIGHT',
  ALL_DAY = 'ALL_DAY',
}

export enum ServiceMode {
  FULL_SERVICE = 'FULL_SERVICE',
  QUICK_SERVICE = 'QUICK_SERVICE',
  BAR = 'BAR',
  FOOD_TRUCK = 'FOOD_TRUCK',
}

export enum TaxType {
  PERCENTAGE = 'PERCENTAGE',
  FLAT = 'FLAT',
}

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FLAT = 'FLAT',
  COMP = 'COMP',
}

export enum StationType {
  KITCHEN = 'KITCHEN',
  BAR = 'BAR',
  EXPO = 'EXPO',
  GRILL = 'GRILL',
  FRY = 'FRY',
  DESSERT = 'DESSERT',
  CUSTOM = 'CUSTOM',
}

export enum ReservationStatus {
  CONFIRMED = 'CONFIRMED',
  ARRIVED = 'ARRIVED',
  SEATED = 'SEATED',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW',
  CANCELLED = 'CANCELLED',
  WAITLIST = 'WAITLIST',
}

export enum ReservationSource {
  PHONE = 'PHONE',
  ONLINE = 'ONLINE',
  WALK_IN = 'WALK_IN',
  APP = 'APP',
}

// ---- Core Interfaces ----

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  address?: string;
  phone?: string;
  email?: string;
  timezone: string;
  currency: string;
  serviceMode: ServiceMode;
  settings: RestaurantSettings;
  createdAt: string;
  updatedAt: string;
}

export interface RestaurantSettings {
  requireTableForDineIn: boolean;
  allowSplitBills: boolean;
  defaultTipPercentages: number[];
  autoFireDelay: number; // seconds
  receiptFooter?: string;
  loyaltyEnabled: boolean;
  onlineOrderingEnabled: boolean;
  kdsEnabled: boolean;
  printerEnabled: boolean;
  taxIncluded: boolean;
}

export interface Location {
  id: string;
  restaurantId: string;
  name: string;
  address: string;
  phone?: string;
  timezone: string;
  isActive: boolean;
  settings?: Partial<RestaurantSettings>;
}

export interface User {
  id: string;
  restaurantId: string;
  name: string;
  email?: string;
  pin: string;
  role: UserRole;
  isActive: boolean;
  locationIds: string[];
  createdAt: string;
}

export interface MenuCategory {
  id: string;
  restaurantId: string;
  name: string;
  description?: string;
  image?: string;
  sortOrder: number;
  isActive: boolean;
  dayParts: DayPart[];
  items?: MenuItem[];
}

export interface MenuItem {
  id: string;
  categoryId: string;
  restaurantId: string;
  name: string;
  description?: string;
  image?: string;
  basePrice: number;
  status: MenuItemStatus;
  isPopular: boolean;
  prepTime: number; // minutes
  sortOrder: number;
  sku?: string;
  barcode?: string;
  calories?: number;
  allergens?: string[];
  tags?: string[];
  modifierGroups?: ModifierGroup[];
  taxIds?: string[];
  stationId?: string;
  dayParts: DayPart[];
  pricingOverrides?: PricingOverride[];
}

export interface ModifierGroup {
  id: string;
  restaurantId: string;
  name: string;
  description?: string;
  type: ModifierType;
  isRequired: boolean;
  minSelections: number;
  maxSelections: number;
  sortOrder: number;
  modifiers: Modifier[];
}

export interface Modifier {
  id: string;
  groupId: string;
  name: string;
  priceAdjustment: number;
  isDefault: boolean;
  isAvailable: boolean;
  sortOrder: number;
}

export interface PricingOverride {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  daysOfWeek: number[]; // 0=Sunday
  isActive: boolean;
}

export interface Table {
  id: string;
  locationId: string;
  name: string;
  capacity: number;
  status: TableStatus;
  position: { x: number; y: number };
  shape: 'circle' | 'rectangle' | 'square';
  section?: string;
  currentOrderId?: string;
}

export interface Order {
  id: string;
  restaurantId: string;
  locationId: string;
  tableId?: string;
  tableName?: string;
  serverId: string;
  serverName: string;
  status: OrderStatus;
  type: OrderType;
  guestCount?: number;
  items: OrderItem[];
  payments: Payment[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  tipTotal: number;
  total: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  firedAt?: string;
  paidAt?: string;
  customerName?: string;
  customerPhone?: string;
}

export interface Reservation {
  id: string;
  restaurantId: string;
  locationId: string;
  tableId?: string | null;
  orderId?: string | null;
  guestName: string;
  guestPhone: string;
  guestEmail?: string | null;
  partySize: number;
  reservationAt: string;
  status: ReservationStatus;
  source: ReservationSource;
  confirmationCode: string;
  notes?: string | null;
  specialRequests?: string | null;
  tags: string[];
  isVip: boolean;
  visitCount: number;
  quotedWaitMinutes?: number | null;
  seatedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  noShowAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  modifiers: OrderItemModifier[];
  notes?: string;
  status: KDSItemStatus;
  courseNumber: number;
  seatNumber?: number;
  isFired: boolean;
  firedAt?: string;
  isVoided: boolean;
  voidReason?: string;
  voidedBy?: string;
}

export interface OrderItemModifier {
  modifierId: string;
  modifierName: string;
  groupName: string;
  priceAdjustment: number;
}

export interface Payment {
  id: string;
  orderId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  tipAmount: number;
  referenceId?: string;
  processedAt?: string;
  processedBy: string;
  notes?: string;
}

export interface KDSTicket {
  id: string;
  orderId: string;
  orderType: OrderType;
  tableName?: string;
  serverName: string;
  stationId: string;
  items: KDSTicketItem[];
  status: KDSItemStatus;
  priority: 'normal' | 'rush' | 'vip';
  courseNumber: number;
  createdAt: string;
  firedAt?: string;
  bumpedAt?: string;
  elapsedSeconds: number;
}

export interface KDSTicketItem {
  id: string;
  name: string;
  quantity: number;
  modifiers: string[];
  notes?: string;
  status: KDSItemStatus;
  seatNumber?: number;
}

export interface Station {
  id: string;
  restaurantId: string;
  locationId: string;
  name: string;
  type: StationType;
  color: string;
  categoryIds: string[];
  isActive: boolean;
  displayOrder: number;
}

export interface Tax {
  id: string;
  restaurantId: string;
  name: string;
  type: TaxType;
  rate: number;
  isDefault: boolean;
  appliesToAll: boolean;
  categoryIds?: string[];
}

export interface Discount {
  id: string;
  restaurantId: string;
  name: string;
  type: DiscountType;
  value: number;
  requiresManagerApproval: boolean;
  isActive: boolean;
  code?: string;
}

// ---- WebSocket Events ----

export interface WSEvent {
  type: WSEventType;
  payload: unknown;
  restaurantId: string;
  locationId?: string;
  timestamp: string;
}

export enum WSEventType {
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_UPDATED = 'ORDER_UPDATED',
  ORDER_FIRED = 'ORDER_FIRED',
  ORDER_PAID = 'ORDER_PAID',
  ORDER_VOIDED = 'ORDER_VOIDED',
  ITEM_STATUS_CHANGED = 'ITEM_STATUS_CHANGED',
  TABLE_STATUS_CHANGED = 'TABLE_STATUS_CHANGED',
  MENU_UPDATED = 'MENU_UPDATED',
  ITEM_86 = 'ITEM_86',
  LOW_STOCK_ALERT = 'LOW_STOCK_ALERT',
  KDS_BUMP = 'KDS_BUMP',
  KDS_RECALL = 'KDS_RECALL',
  KDS_RUSH = 'KDS_RUSH',
  PAYMENT_CAPTURED = 'PAYMENT_CAPTURED',
  STAFF_CLOCKED_IN = 'STAFF_CLOCKED_IN',
  STAFF_CLOCKED_OUT = 'STAFF_CLOCKED_OUT',
  TABLE_UPDATED = 'TABLE_UPDATED',
  RESERVATION_UPDATED = 'RESERVATION_UPDATED',
  // Support / Live Chat
  SUPPORT_MESSAGE = 'SUPPORT_MESSAGE',
  SUPPORT_TICKET_UPDATE = 'SUPPORT_TICKET_UPDATE',
  SUPPORT_AGENT_PRESENCE = 'SUPPORT_AGENT_PRESENCE',
  SUPPORT_TYPING = 'SUPPORT_TYPING',
}

// ---- API Response Types ----

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: Pagination;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ---- Report Types ----

export interface SalesReport {
  period: { from: string; to: string };
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  totalTips: number;
  totalDiscounts: number;
  totalRefunds: number;
  salesByHour: HourlySales[];
  topItems: ItemSales[];
  paymentBreakdown: PaymentBreakdown[];
  orderTypeBreakdown: OrderTypeBreakdown[];
}

export interface HourlySales {
  hour: number;
  sales: number;
  orders: number;
}

export interface ItemSales {
  itemId: string;
  name: string;
  quantity: number;
  revenue: number;
  category: string;
}

export interface PaymentBreakdown {
  method: PaymentMethod;
  amount: number;
  count: number;
}

export interface OrderTypeBreakdown {
  type: OrderType;
  amount: number;
  count: number;
}

export interface StaffReport {
  userId: string;
  name: string;
  role: UserRole;
  totalSales: number;
  totalOrders: number;
  totalTips: number;
  totalDiscounts: number;
  totalVoids: number;
  hoursWorked: number;
}

// ---- Auth Types ----

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    role: UserRole;
    restaurantId: string;
    locationIds: string[];
  };
}

export interface PinLoginRequest {
  pin: string;
  locationId: string;
  restaurantId: string;
}

// ---- Inventory Types ----

export interface InventoryItem {
  id: string;
  restaurantId: string;
  menuItemId?: string;
  name: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  costPerUnit: number;
  vendorId?: string;
  lastRestockedAt?: string;
}

export interface Vendor {
  id: string;
  restaurantId: string;
  name: string;
  email?: string;
  phone?: string;
  website?: string;
  items: string[];
}

// ---- Workflow Builder Types ----

export interface WorkflowConfig {
  id: string;
  restaurantId: string;
  role: UserRole;
  screenLayout: ScreenLayout;
  quickButtons: QuickButton[];
  autoPrompts: AutoPrompt[];
  upsellRules: UpsellRule[];
}

export interface ScreenLayout {
  showTableMap: boolean;
  showOpenOrders: boolean;
  categoriesPosition: 'top' | 'left' | 'bottom';
  itemGridColumns: number;
  showItemImages: boolean;
  showItemDescriptions: boolean;
}

export interface QuickButton {
  id: string;
  menuItemId: string;
  name: string;
  position: number;
  color?: string;
}

export interface AutoPrompt {
  id: string;
  triggerItemId: string;
  modifierGroupId: string;
  message: string;
}

export interface UpsellRule {
  id: string;
  triggerItemId: string;
  suggestedItemIds: string[];
  message: string;
  isActive: boolean;
}

// ---- Happy Hour ----

export interface HappyHour {
  id: string;
  restaurantId: string;
  name: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  discountType: DiscountType;
  discountValue: number;
  categoryIds?: string[];
  itemIds?: string[];
  isActive: boolean;
}

// ---- Combo ----

export interface Combo {
  id: string;
  restaurantId: string;
  name: string;
  description?: string;
  price: number;
  items: ComboItem[];
  isActive: boolean;
}

export interface ComboItem {
  menuItemId: string;
  quantity: number;
  allowSubstitutions: boolean;
}

export type TimeRange = {
  start: string;
  end: string;
};

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;
