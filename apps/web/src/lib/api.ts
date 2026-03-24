
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

import { resolveLoginPathFromPathname } from '@/lib/paths';
import { getSaasAdminToken } from '@/lib/saas-auth';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

function setSessionCookie(name: string, value: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${SESSION_COOKIE_MAX_AGE}; samesite=lax`;
}

function clearSessionCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
}

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    });

    // Request interceptor â attach token
    this.client.interceptors.request.use((config) => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('pos_access_token');
        if (token) config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor â handle 401
    this.client.interceptors.response.use(
      (res) => res,
      async (error) => {
        const original = error.config as AxiosRequestConfig & { _retry?: boolean };
        if (error.response?.status === 401 && !original._retry) {
          original._retry = true;
          try {
            const refreshToken = localStorage.getItem('pos_refresh_token');
            if (!refreshToken) throw new Error('No refresh token');
            const { data } = await axios.post(`${BASE_URL}/api/auth/refresh`, { refreshToken });
            const newToken = data.data.accessToken;
            localStorage.setItem('pos_access_token', newToken);
            setSessionCookie('pos_token', newToken);
            this.client.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
            return this.client(original);
          } catch {
            localStorage.removeItem('pos_access_token');
            localStorage.removeItem('pos_refresh_token');
            localStorage.removeItem('pos_user');
            clearSessionCookie('pos_token');
            clearSessionCookie('pos_refresh_token');
            clearSessionCookie('pos_restaurant_id');
            clearSessionCookie('pos_location_id');
            if (typeof window !== 'undefined') {
              window.location.href = resolveLoginPathFromPathname(window.location.pathname);
            }
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth
  async pinLogin(pin: string, restaurantId: string, locationId: string) {
    const { data } = await this.client.post('/api/auth/pin-login', { pin, restaurantId, locationId });
    return data;
  }
  async login(email: string, password: string, restaurantSlug: string) {
    const { data } = await this.client.post('/api/auth/login', { email, password, restaurantSlug });
    return data;
  }
  async requestDemoOtp(payload: any) {
    const { data } = await this.client.post('/api/auth/demo/request-otp', payload);
    return data;
  }
  async verifyDemoOtp(payload: any) {
    const { data } = await this.client.post('/api/auth/demo/verify-otp', payload);
    return data;
  }
  async contactSales(payload: any) {
    const { data } = await this.client.post('/api/auth/contact-sales', payload);
    return data;
  }
  async getMe() {
    const { data } = await this.client.get('/api/auth/me');
    return data;
  }
  async logout() {
    const { data } = await this.client.post('/api/auth/logout');
    return data;
  }
  async changePin(currentPin: string, newPin: string) {
    const { data } = await this.client.put('/api/auth/change-pin', { currentPin, newPin });
    return data;
  }

  // Restaurant
  async getRestaurant(id: string) {
    const { data } = await this.client.get(`/api/restaurants/${id}`);
    return data;
  }
  async getPublicRestaurant(id: string) {
    const { data } = await this.client.get(`/api/restaurants/public/${id}`);
    return data;
  }
  async getPublicRestaurantSite(id: string) {
    const { data } = await this.client.get(`/api/restaurants/public/${id}/site`);
    return data;
  }
  async updateRestaurant(id: string, payload: any) {
    const { data } = await this.client.put(`/api/restaurants/${id}`, payload);
    return data;
  }
  async saasAdminLogin(email: string, password: string) {
    const { data } = await this.client.post('/api/saas/login', { email, password });
    return data;
  }
  async getSaasRestaurants() {
    const token = getSaasAdminToken();
    const { data } = await this.client.get('/api/saas/restaurants', {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    return data;
  }
  async updateSaasRestaurant(id: string, payload: any) {
    const token = getSaasAdminToken();
    const { data } = await this.client.patch(`/api/saas/restaurants/${id}`, payload, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    return data;
  }

  // Locations
  async getLocations() {
    const { data } = await this.client.get('/api/locations');
    return data;
  }
  async createLocation(payload: any) {
    const { data } = await this.client.post('/api/locations', payload);
    return data;
  }
  async updateLocation(id: string, payload: any) {
    const { data } = await this.client.put(`/api/locations/${id}`, payload);
    return data;
  }

  // Menu
  async getFullMenu(dayPart?: string) {
    const { data } = await this.client.get('/api/menu/full', { params: { dayPart } });
    return data;
  }
  async getCategories(includeItems = false) {
    const { data } = await this.client.get('/api/menu/categories', { params: { includeItems } });
    return data;
  }
  async createCategory(payload: any) {
    const { data } = await this.client.post('/api/menu/categories', payload);
    return data;
  }
  async updateCategory(id: string, payload: any) {
    const { data } = await this.client.put(`/api/menu/categories/${id}`, payload);
    return data;
  }
  async deleteCategory(id: string) {
    const { data } = await this.client.delete(`/api/menu/categories/${id}`);
    return data;
  }
  async getMenuItems(params?: any) {
    const { data } = await this.client.get('/api/menu/items', { params });
    return data;
  }
  async getMenuItem(id: string) {
    const { data } = await this.client.get(`/api/menu/items/${id}`);
    return data;
  }
  async createMenuItem(payload: any) {
    const { data } = await this.client.post('/api/menu/items', payload);
    return data;
  }
  async updateMenuItem(id: string, payload: any) {
    const { data } = await this.client.put(`/api/menu/items/${id}`, payload);
    return data;
  }
  async deleteMenuItem(id: string) {
    const { data } = await this.client.delete(`/api/menu/items/${id}`);
    return data;
  }
  async eightySixItem(id: string, restore = false) {
    const { data } = await this.client.patch(`/api/menu/items/${id}/86`, { restore });
    return data;
  }
  async getModifierGroups() {
    const { data } = await this.client.get('/api/menu/modifier-groups');
    return data;
  }
  async createModifierGroup(payload: any) {
    const { data } = await this.client.post('/api/menu/modifier-groups', payload);
    return data;
  }
  async updateModifierGroup(id: string, payload: any) {
    const { data } = await this.client.put(`/api/menu/modifier-groups/${id}`, payload);
    return data;
  }
  async addModifier(groupId: string, payload: any) {
    const { data } = await this.client.post(`/api/menu/modifier-groups/${groupId}/modifiers`, payload);
    return data;
  }
  async updateModifier(id: string, payload: any) {
    const { data } = await this.client.put(`/api/menu/modifiers/${id}`, payload);
    return data;
  }
  async deleteModifier(id: string) {
    const { data } = await this.client.delete(`/api/menu/modifiers/${id}`);
    return data;
  }
  async createPricingOverride(itemId: string, payload: any) {
    const { data } = await this.client.post(`/api/menu/items/${itemId}/pricing-overrides`, payload);
    return data;
  }
  async updatePricingOverride(id: string, payload: any) {
    const { data } = await this.client.put(`/api/menu/pricing-overrides/${id}`, payload);
    return data;
  }
  async deletePricingOverride(id: string) {
    const { data } = await this.client.delete(`/api/menu/pricing-overrides/${id}`);
    return data;
  }

  // Orders
  async getOrders(params?: any) {
    const { data } = await this.client.get('/api/orders', { params });
    return data;
  }
  async getOpenOrders(locationId?: string) {
    const { data } = await this.client.get('/api/orders/open', { params: { locationId } });
    return data;
  }
  async getOrder(id: string) {
    const { data } = await this.client.get(`/api/orders/${id}`);
    return data;
  }
  async createOrder(payload: any) {
    const { data } = await this.client.post('/api/orders', payload);
    return data;
  }
  async createPublicOrder(restaurantId: string, payload: any) {
    const { data } = await this.client.post(`/api/orders/public/${restaurantId}`, payload);
    return data;
  }
  async addItemsToOrder(orderId: string, items: any[]) {
    const { data } = await this.client.post(`/api/orders/${orderId}/items`, { items });
    return data;
  }
  async updateOrderItem(orderId: string, itemId: string, payload: any) {
    const { data } = await this.client.put(`/api/orders/${orderId}/items/${itemId}`, payload);
    return data;
  }
  async voidOrderItem(orderId: string, itemId: string, reason?: string) {
    const { data } = await this.client.delete(`/api/orders/${orderId}/items/${itemId}`, { data: { reason } });
    return data;
  }
  async fireOrder(orderId: string, courseNumber?: number, priority?: string) {
    const { data } = await this.client.post(`/api/orders/${orderId}/fire`, { courseNumber, priority });
    return data;
  }
  async addDiscount(orderId: string, payload: any) {
    const { data } = await this.client.post(`/api/orders/${orderId}/discounts`, payload);
    return data;
  }
  async removeDiscount(orderId: string, discountLineId: string) {
    const { data } = await this.client.delete(`/api/orders/${orderId}/discounts/${discountLineId}`);
    return data;
  }
  async updateOrder(orderId: string, payload: any) {
    const { data } = await this.client.patch(`/api/orders/${orderId}`, payload);
    return data;
  }
  async transferTable(orderId: string, newTableId: string) {
    const { data } = await this.client.post(`/api/orders/${orderId}/transfer`, { newTableId });
    return data;
  }
  async voidOrder(orderId: string, reason: string) {
    const { data } = await this.client.post(`/api/orders/${orderId}/void`, { reason });
    return data;
  }
  async splitOrder(orderId: string, splitType: string, seats?: number) {
    const { data } = await this.client.post(`/api/orders/${orderId}/split`, { splitType, seats });
    return data;
  }
  async serveOrder(orderId: string) {
    const { data } = await this.client.post(`/api/orders/${orderId}/serve`);
    return data;
  }

  // Payments
  async processPayment(payload: any) {
    const { data } = await this.client.post('/api/payments', payload);
    return data;
  }
  async refundPayment(paymentId: string, amount?: number, reason?: string) {
    const { data } = await this.client.post(`/api/payments/${paymentId}/refund`, { amount, reason });
    return data;
  }
  async getOrderPayments(orderId: string) {
    const { data } = await this.client.get(`/api/payments/order/${orderId}`);
    return data;
  }
  async getCashSummary(locationId?: string, date?: string) {
    const { data } = await this.client.get('/api/payments/cash-summary', { params: { locationId, date } });
    return data;
  }
  async checkGiftCard(code: string) {
    const { data } = await this.client.get(`/api/payments/gift-cards/${code}`);
    return data;
  }

  // Tables
  async getTables(params?: any) {
    const { data } = await this.client.get('/api/tables', { params });
    return data;
  }
  async getTable(id: string) {
    const { data } = await this.client.get(`/api/tables/${id}`);
    return data;
  }
  async createTable(payload: any) {
    const { data } = await this.client.post('/api/tables', payload);
    return data;
  }
  async updateTable(id: string, payload: any) {
    const { data } = await this.client.put(`/api/tables/${id}`, payload);
    return data;
  }
  async updateTablePositions(positions: any[]) {
    const { data } = await this.client.put('/api/tables/bulk-positions', { positions });
    return data;
  }
  async updateTableStatus(id: string, status: string) {
    const { data } = await this.client.patch(`/api/tables/${id}/status`, { status });
    return data;
  }
  async deleteTable(id: string) {
    const { data } = await this.client.delete(`/api/tables/${id}`);
    return data;
  }

  // KDS
  async getKDSTickets(params?: any) {
    const { data } = await this.client.get('/api/kds/tickets', { params });
    return data;
  }
  async bumpTicket(id: string) {
    const { data } = await this.client.post(`/api/kds/tickets/${id}/bump`);
    return data;
  }
  async recallTicket(id: string) {
    const { data } = await this.client.post(`/api/kds/tickets/${id}/recall`);
    return data;
  }
  async setTicketPriority(id: string, priority: string) {
    const { data } = await this.client.patch(`/api/kds/tickets/${id}/priority`, { priority });
    return data;
  }
  async getKDSStats(locationId?: string) {
    const { data } = await this.client.get('/api/kds/stats', { params: { locationId } });
    return data;
  }

  // Staff
  async getStaff() {
    const { data } = await this.client.get('/api/staff');
    return data;
  }
  async getStaffMember(id: string) {
    const { data } = await this.client.get(`/api/staff/${id}`);
    return data;
  }
  async createStaff(payload: any) {
    const { data } = await this.client.post('/api/staff', payload);
    return data;
  }
  async updateStaff(id: string, payload: any) {
    const { data } = await this.client.put(`/api/staff/${id}`, payload);
    return data;
  }
  async resetPin(id: string, newPin: string) {
    const { data } = await this.client.post(`/api/staff/${id}/reset-pin`, { newPin });
    return data;
  }
  async deleteStaff(id: string) {
    const { data } = await this.client.delete(`/api/staff/${id}`);
    return data;
  }
  async clockIn(notes?: string) {
    const { data } = await this.client.post('/api/staff/clock-in', { notes });
    return data;
  }
  async clockOut(notes?: string) {
    const { data } = await this.client.post('/api/staff/clock-out', { notes });
    return data;
  }

  // Workforce
  async getWorkforceOverview(params?: any) {
    const { data } = await this.client.get('/api/workforce', { params });
    return data;
  }
  async updateWorkforceProfile(userId: string, payload: any) {
    const { data } = await this.client.put(`/api/workforce/profiles/${userId}`, payload);
    return data;
  }
  async saveWorkforceAvailability(payload: any) {
    const { data } = await this.client.post('/api/workforce/availability', payload);
    return data;
  }
  async deleteWorkforceAvailability(id: string, locationId?: string) {
    const { data } = await this.client.delete(`/api/workforce/availability/${id}`, { params: { locationId } });
    return data;
  }
  async autoBuildSchedule(payload: any) {
    const { data } = await this.client.post('/api/workforce/schedule/auto-build', payload);
    return data;
  }
  async publishSchedule(payload: any) {
    const { data } = await this.client.post('/api/workforce/schedule/publish', payload);
    return data;
  }
  async createWorkforceShift(payload: any) {
    const { data } = await this.client.post('/api/workforce/shifts', payload);
    return data;
  }
  async updateWorkforceShift(id: string, payload: any) {
    const { data } = await this.client.put(`/api/workforce/shifts/${id}`, payload);
    return data;
  }
  async deleteWorkforceShift(id: string, locationId?: string) {
    const { data } = await this.client.delete(`/api/workforce/shifts/${id}`, { params: { locationId } });
    return data;
  }
  async createShiftRequest(payload: any) {
    const { data } = await this.client.post('/api/workforce/requests', payload);
    return data;
  }
  async reviewShiftRequest(id: string, payload: any) {
    const { data } = await this.client.post(`/api/workforce/requests/${id}/review`, payload);
    return data;
  }
  async startWorkforceShift(payload: any) {
    const { data } = await this.client.post('/api/workforce/attendance/start', payload);
    return data;
  }
  async endWorkforceShift(payload: any) {
    const { data } = await this.client.post('/api/workforce/attendance/end', payload);
    return data;
  }
  async autoAssignSections(payload: any) {
    const { data } = await this.client.post('/api/workforce/section-assignments/auto-assign', payload);
    return data;
  }
  async saveSectionAssignments(payload: any) {
    const { data } = await this.client.post('/api/workforce/section-assignments/save', payload);
    return data;
  }

  // Reports
  async getSalesReport(params?: any) {
    const { data } = await this.client.get('/api/reports/sales', { params });
    return data;
  }
  async getStaffReport(params?: any) {
    const { data } = await this.client.get('/api/reports/staff', { params });
    return data;
  }
  async getItemMixReport(params?: any) {
    const { data } = await this.client.get('/api/reports/item-mix', { params });
    return data;
  }
  async getVoidsDiscountsReport(params?: any) {
    const { data } = await this.client.get('/api/reports/voids-discounts', { params });
    return data;
  }
  async getEndOfDayReport(date?: string, locationId?: string) {
    const { data } = await this.client.get('/api/reports/end-of-day', { params: { date, locationId } });
    return data;
  }

  // Inventory
  async getInventory(params?: any) {
    const { data } = await this.client.get('/api/inventory', { params });
    return data;
  }
  async createInventoryItem(payload: any) {
    const { data } = await this.client.post('/api/inventory', payload);
    return data;
  }
  async updateInventoryItem(id: string, payload: any) {
    const { data } = await this.client.put(`/api/inventory/${id}`, payload);
    return data;
  }
  async restockItem(id: string, quantity: number, notes?: string) {
    const { data } = await this.client.post(`/api/inventory/${id}/restock`, { quantity, notes });
    return data;
  }
  async getLowStockAlerts() {
    const { data } = await this.client.get('/api/inventory/alerts/low-stock');
    return data;
  }

  // Taxes
  async getTaxes() {
    const { data } = await this.client.get('/api/taxes');
    return data;
  }
  async createTax(payload: any) {
    const { data } = await this.client.post('/api/taxes', payload);
    return data;
  }
  async updateTax(id: string, payload: any) {
    const { data } = await this.client.put(`/api/taxes/${id}`, payload);
    return data;
  }
  async deleteTax(id: string) {
    const { data } = await this.client.delete(`/api/taxes/${id}`);
    return data;
  }

  // Discounts
  async getDiscounts() {
    const { data } = await this.client.get('/api/discounts');
    return data;
  }
  async createDiscount(payload: any) {
    const { data } = await this.client.post('/api/discounts', payload);
    return data;
  }
  async updateDiscount(id: string, payload: any) {
    const { data } = await this.client.put(`/api/discounts/${id}`, payload);
    return data;
  }

  // Happy Hours
  async getHappyHours() {
    const { data } = await this.client.get('/api/happy-hours');
    return data;
  }
  async createHappyHour(payload: any) {
    const { data } = await this.client.post('/api/happy-hours', payload);
    return data;
  }
  async updateHappyHour(id: string, payload: any) {
    const { data } = await this.client.put(`/api/happy-hours/${id}`, payload);
    return data;
  }
  async deleteHappyHour(id: string) {
    const { data } = await this.client.delete(`/api/happy-hours/${id}`);
    return data;
  }

  // Stations
  async getStations(locationId?: string) {
    const { data } = await this.client.get('/api/stations', { params: { locationId } });
    return data;
  }
  async createStation(payload: any) {
    const { data } = await this.client.post('/api/stations', payload);
    return data;
  }
  async updateStation(id: string, payload: any) {
    const { data } = await this.client.put(`/api/stations/${id}`, payload);
    return data;
  }
  async deleteStation(id: string) {
    const { data } = await this.client.delete(`/api/stations/${id}`);
    return data;
  }

  // Combos
  async getCombos() {
    const { data } = await this.client.get('/api/combos');
    return data;
  }
  async createCombo(payload: any) {
    const { data } = await this.client.post('/api/combos', payload);
    return data;
  }
  async updateCombo(id: string, payload: any) {
    const { data } = await this.client.put(`/api/combos/${id}`, payload);
    return data;
  }
  async deleteCombo(id: string) {
    const { data } = await this.client.delete(`/api/combos/${id}`);
    return data;
  }

  // Gift Cards
  async getGiftCards() {
    const { data } = await this.client.get('/api/gift-cards');
    return data;
  }
  async createGiftCard(payload: any) {
    const { data } = await this.client.post('/api/gift-cards', payload);
    return data;
  }
  async getGiftCardBalance(code: string) {
    const { data } = await this.client.get(`/api/gift-cards/${code}/balance`);
    return data;
  }
  async deactivateGiftCard(id: string) {
    const { data } = await this.client.patch(`/api/gift-cards/${id}/deactivate`);
    return data;
  }

  // Workflows
  async getWorkflows() {
    const { data } = await this.client.get('/api/workflows');
    return data;
  }
  async getWorkflowByRole(role: string) {
    const { data } = await this.client.get(`/api/workflows/role/${role}`);
    return data;
  }
  async saveWorkflow(payload: any) {
    const { data } = await this.client.post('/api/workflows', payload);
    return data;
  }

  // Audit
  async getAuditLogs(params?: any) {
    const { data } = await this.client.get('/api/audit', { params });
    return data;
  }
}

export const api = new ApiClient();
export default api;
