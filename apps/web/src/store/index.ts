
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ââ Auth Store ââââââââââââââââââââââââââââââââââââââââââââââââ
interface AuthUser {
  id: string;
  name: string;
  role: string;
  restaurantId: string;
  locationId?: string;
  locationIds: string[];
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  restaurantId: string | null;
  locationId: string | null;
  isAuthenticated: boolean;
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  setLocation: (locationId: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      restaurantId: null,
      locationId: null,
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('pos_access_token', accessToken);
          localStorage.setItem('pos_refresh_token', refreshToken);
          localStorage.setItem('pos_user', JSON.stringify(user));
        }
        set({
          user,
          accessToken,
          refreshToken,
          restaurantId: user.restaurantId,
          locationId: user.locationId || user.locationIds[0],
          isAuthenticated: true,
        });
      },

      setLocation: (locationId) => set({ locationId }),

      clearAuth: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('pos_access_token');
          localStorage.removeItem('pos_refresh_token');
          localStorage.removeItem('pos_user');
        }
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          restaurantId: null,
          locationId: null,
          isAuthenticated: false,
        });
      },
    }),
    { name: 'pos-auth', partialize: (s) => ({ user: s.user, accessToken: s.accessToken, refreshToken: s.refreshToken, restaurantId: s.restaurantId, locationId: s.locationId, isAuthenticated: s.isAuthenticated }) }
  )
);

// ââ Order Store (active order being built) ââââââââââââââââââ
interface OrderItem {
  id: string;
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  modifiers: any[];
  notes?: string;
  courseNumber: number;
  seatNumber?: number;
}

interface ActiveOrderState {
  orderId: string | null;
  tableId: string | null;
  tableName: string | null;
  locationId: string | null;
  orderType: string;
  items: OrderItem[];
  guestCount: number;
  notes: string;
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  tipTotal: number;
  total: number;
  setOrder: (order: any) => void;
  clearOrder: () => void;
  setOrderId: (id: string) => void;
}

export const useOrderStore = create<ActiveOrderState>((set) => ({
  orderId: null,
  tableId: null,
  tableName: null,
  locationId: null,
  orderType: 'DINE_IN',
  items: [],
  guestCount: 1,
  notes: '',
  subtotal: 0,
  taxTotal: 0,
  discountTotal: 0,
  tipTotal: 0,
  total: 0,

  setOrder: (order) =>
    set({
      orderId: order.id,
      tableId: order.tableId,
      tableName: order.tableName,
      locationId: order.locationId,
      orderType: order.type,
      items: order.items || [],
      guestCount: order.guestCount || 1,
      notes: order.notes || '',
      subtotal: order.subtotal || 0,
      taxTotal: order.taxTotal || 0,
      discountTotal: order.discountTotal || 0,
      tipTotal: order.tipTotal || 0,
      total: order.total || 0,
    }),

  clearOrder: () =>
    set({
      orderId: null,
      tableId: null,
      tableName: null,
      locationId: null,
      orderType: 'DINE_IN',
      items: [],
      guestCount: 1,
      notes: '',
      subtotal: 0,
      taxTotal: 0,
      discountTotal: 0,
      tipTotal: 0,
      total: 0,
    }),

  setOrderId: (id) => set({ orderId: id }),
}));

// ââ UI Store ââââââââââââââââââââââââââââââââââââââââââââââââââ
interface UIState {
  sidebarOpen: boolean;
  theme: 'dark' | 'light';
  currentView: string;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setCurrentView: (view: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: 'dark',
      currentView: 'pos',
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setTheme: (theme) => set({ theme }),
      setCurrentView: (view) => set({ currentView: view }),
    }),
    { name: 'pos-ui' }
  )
);

// ââ Notification Store ââââââââââââââââââââââââââââââââââââââââ
interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'order';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (n) =>
    set((state) => {
      const notification: Notification = {
        ...n,
        id: Math.random().toString(36).slice(2),
        timestamp: new Date(),
        read: false,
      };
      return {
        notifications: [notification, ...state.notifications].slice(0, 50),
        unreadCount: state.unreadCount + 1,
      };
    }),

  markRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) => n.id === id ? { ...n, read: true } : n),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),

  clearAll: () => set({ notifications: [], unreadCount: 0 }),
}));
