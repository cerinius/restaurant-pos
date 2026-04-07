import { useEffect, useRef } from 'react';
import { WSEventType } from '@pos/shared';

import { useNotificationStore } from '@/store';
import { useAuthStore } from '@/store';

type WSMessageHandler = (event: WSEventType, payload: any) => void;

function normalizeWebSocketBaseUrl(rawUrl: string) {
  const trimmed = rawUrl.trim().replace(/\/+$/, '');
  const isSecurePage = typeof window !== 'undefined' && window.location.protocol === 'https:';

  if (trimmed.startsWith('ws://') || trimmed.startsWith('wss://')) {
    if (isSecurePage && trimmed.startsWith('ws://')) {
      return `wss://${trimmed.slice('ws://'.length)}`;
    }
    return trimmed;
  }

  if (trimmed.startsWith('http://')) {
    return `ws://${trimmed.slice('http://'.length)}`;
  }

  if (trimmed.startsWith('https://')) {
    return `wss://${trimmed.slice('https://'.length)}`;
  }

  return trimmed;
}

function getWebSocketBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_WS_URL;

  if (configuredUrl) {
    return normalizeWebSocketBaseUrl(configuredUrl);
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl) {
    return normalizeWebSocketBaseUrl(apiUrl);
  }

  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
  }

  return 'ws://localhost:3001';
}

class POSWebSocket {
  private ws: WebSocket | null = null;
  private handlers: Map<string, Set<WSMessageHandler>> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectDelay = 2000;
  private maxReconnectDelay = 30000;
  private token: string | null = null;
  private isConnecting = false;

  connect(token: string) {
    if (typeof window === 'undefined') return;
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) return;

    this.token = token;
    this.isConnecting = true;

    try {
      const wsBaseUrl = getWebSocketBaseUrl();
      this.ws = new WebSocket(`${wsBaseUrl}/ws/live`);

      this.ws.onopen = () => {
        this.isConnecting = false;
        this.reconnectDelay = 2000;
        this.ws?.send(JSON.stringify({ type: 'AUTH', token }));
        this.startPing();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.emit(message.type, message.payload);
        } catch {
          console.warn('WS: Failed to parse message');
        }
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        this.stopPing();
        this.ws = null;
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.isConnecting = false;
      };
    } catch {
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  disconnect() {
    this.stopPing();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
    this.token = null;
  }

  on(event: string, handler: WSMessageHandler) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)?.add(handler);
    return () => this.off(event, handler);
  }

  off(event: string, handler: WSMessageHandler) {
    this.handlers.get(event)?.delete(handler);
  }

  private emit(event: string, payload: any) {
    this.handlers.get(event)?.forEach((handler) => handler(event as WSEventType, payload));
    this.handlers.get('*')?.forEach((handler) => handler(event as WSEventType, payload));
  }

  private startPing() {
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'PING' }));
      }
    }, 25000);
  }

  private stopPing() {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = null;
  }

  private scheduleReconnect() {
    if (!this.token) return;
    this.reconnectTimer = setTimeout(() => {
      if (this.token) this.connect(this.token);
      this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, this.maxReconnectDelay);
    }, this.reconnectDelay);
  }

  get isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const posWS = new POSWebSocket();

export function useWebSocket(
  events: Partial<Record<WSEventType | '*', (payload: any) => void>>,
  deps: any[] = []
) {
  const { accessToken } = useAuthStore();
  const handlersRef = useRef(events);
  handlersRef.current = events;

  useEffect(() => {
    if (!accessToken) return;
    posWS.connect(accessToken);
  }, [accessToken]);

  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    Object.entries(handlersRef.current).forEach(([event, handler]) => {
      if (handler) {
        const unsub = posWS.on(event, (_type, payload) => handler(payload));
        unsubscribers.push(unsub);
      }
    });

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, deps);

  return { isConnected: posWS.isConnected };
}

export function useGlobalWSNotifications() {
  const { addNotification } = useNotificationStore();

  useWebSocket({
    [WSEventType.ORDER_CREATED]: (payload) => {
      addNotification({
        type: 'order',
        title: 'New Order',
        message: `Order created for ${payload?.tableName || payload?.type || 'table'}`,
      });
    },
    [WSEventType.ORDER_FIRED]: () => {
      addNotification({
        type: 'info',
        title: 'Order Fired',
        message: 'Order sent to kitchen',
      });
    },
    [WSEventType.ITEM_86]: (payload) => {
      addNotification({
        type: 'warning',
        title: "86'd Item",
        message: `${payload?.itemName} is now out of stock`,
      });
    },
    [WSEventType.LOW_STOCK_ALERT]: (payload) => {
      addNotification({
        type: 'warning',
        title: 'Low Stock',
        message: `${payload?.name || 'Inventory item'} hit its low-stock threshold`,
      });
    },
    [WSEventType.PAYMENT_CAPTURED]: (payload) => {
      if (payload?.isPaid) {
        addNotification({
          type: 'success',
          title: 'Payment Received',
          message: `Order paid - $${payload?.totalPaid?.toFixed(2)}`,
        });
      }
    },
  });
}
