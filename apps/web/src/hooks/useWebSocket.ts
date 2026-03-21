
import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/store';
import { useNotificationStore } from '@/store';
import { WSEventType } from '@pos/shared';

type WSMessageHandler = (event: WSEventType, payload: any) => void;

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';

class POSWebSocket {
  private ws: WebSocket | null = null;
  private handlers: Map<string, Set<WSMessageHandler>> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectDelay = 2000;
  private maxReconnectDelay = 30000;
  private token: string | null = null;
  private isConnecting = false;

  // connect(token: string) {
  //   if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) return;
  //   this.token = token;
  //   this.isConnecting = true;

  //   try {
  //     this.ws = new WebSocket(`${WS_URL}/ws/live`);

  //     this.ws.onopen = () => {
  //       this.isConnecting = false;
  //       this.reconnectDelay = 2000;
  //       this.ws!.send(JSON.stringify({ type: 'AUTH', token }));
  //       this.startPing();
  //     };

  //     this.ws.onmessage = (event) => {
  //       try {
  //         const msg = JSON.parse(event.data);
  //         this.emit(msg.type, msg.payload);
  //       } catch {
  //         console.warn('WS: Failed to parse message');
  //       }
  //     };

  //     this.ws.onclose = () => {
  //       this.isConnecting = false;
  //       this.stopPing();
  //       this.scheduleReconnect();
  //     };

  //     this.ws.onerror = () => {
  //       this.isConnecting = false;
  //     };
  //   } catch {
  //     this.isConnecting = false;
  //     this.scheduleReconnect();
  //   }
  // }


  // Inside your POSWebSocket class...
connect(token: string) {
  // Prevent execution during Next.js server-side rendering
  if (typeof window === 'undefined') return;

  if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) return;
  this.token = token;
  this.isConnecting = true;

  try {
    this.ws = new WebSocket(`${WS_URL}/ws/live`);
    // ... rest of your existing logic
  } catch (e) {
    this.isConnecting = false;
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
    this.handlers.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  off(event: string, handler: WSMessageHandler) {
    this.handlers.get(event)?.delete(handler);
  }

  private emit(event: string, payload: any) {
    this.handlers.get(event)?.forEach((h) => h(event as WSEventType, payload));
    this.handlers.get('*')?.forEach((h) => h(event as WSEventType, payload));
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

    return () => unsubscribers.forEach((u) => u());
  }, deps);

  return { isConnected: posWS.isConnected };
}

// Global WS listener for notifications
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
    [WSEventType.ORDER_FIRED]: (payload) => {
      addNotification({
        type: 'info',
        title: 'Order Fired',
        message: `Order sent to kitchen`,
      });
    },
    [WSEventType.ITEM_86]: (payload) => {
      addNotification({
        type: 'warning',
        title: '86\'d Item',
        message: `${payload?.itemName} is now out of stock`,
      });
    },
    [WSEventType.PAYMENT_CAPTURED]: (payload) => {
      if (payload?.isPaid) {
        addNotification({
          type: 'success',
          title: 'Payment Received',
          message: `Order paid â $${payload?.totalPaid?.toFixed(2)}`,
        });
      }
    },
  });
}
