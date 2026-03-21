
import { WebSocket } from 'ws';
import { WSEventType } from '@pos/shared';

interface WSClient {
  id: string;
  socket: WebSocket;
  restaurantId: string;
  locationId?: string;
  userId?: string;
  role?: string;
  subscribedRooms: Set<string>;
  lastPing: number;
}

class WebSocketManager {
  private clients: Map<string, WSClient> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startPingInterval();
  }

  addClient(
    id: string,
    socket: WebSocket,
    restaurantId: string,
    locationId?: string,
    userId?: string,
    role?: string,
  ) {
    const client: WSClient = {
      id,
      socket,
      restaurantId,
      locationId,
      userId,
      role,
      subscribedRooms: new Set([restaurantId]),
      lastPing: Date.now(),
    };

    if (locationId) client.subscribedRooms.add(`${restaurantId}:${locationId}`);

    this.clients.set(id, client);
    console.log(`ð WS Client connected: ${id} (restaurant: ${restaurantId})`);
  }

  removeClient(id: string) {
    this.clients.delete(id);
    console.log(`ð WS Client disconnected: ${id}`);
  }

  subscribeToRoom(clientId: string, room: string) {
    const client = this.clients.get(clientId);
    if (client) client.subscribedRooms.add(room);
  }

  broadcast(
    restaurantId: string,
    type: WSEventType,
    payload: unknown,
    locationId?: string,
    excludeClientId?: string,
  ) {
    const room = locationId ? `${restaurantId}:${locationId}` : restaurantId;
    const message = JSON.stringify({
      type,
      payload,
      restaurantId,
      locationId,
      timestamp: new Date().toISOString(),
    });

    let sent = 0;
    this.clients.forEach((client) => {
      if (client.id === excludeClientId) return;
      if (!client.subscribedRooms.has(room) && !client.subscribedRooms.has(restaurantId)) return;
      if (client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(message);
        sent++;
      }
    });

    return sent;
  }

  broadcastToRole(
    restaurantId: string,
    roles: string[],
    type: WSEventType,
    payload: unknown,
  ) {
    const message = JSON.stringify({
      type,
      payload,
      restaurantId,
      timestamp: new Date().toISOString(),
    });

    this.clients.forEach((client) => {
      if (client.restaurantId !== restaurantId) return;
      if (client.role && !roles.includes(client.role)) return;
      if (client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(message);
      }
    });
  }

  sendToClient(clientId: string, type: WSEventType, payload: unknown) {
    const client = this.clients.get(clientId);
    if (client && client.socket.readyState === WebSocket.OPEN) {
      client.socket.send(JSON.stringify({ type, payload, timestamp: new Date().toISOString() }));
    }
  }

  updateClientPing(clientId: string) {
    const client = this.clients.get(clientId);
    if (client) client.lastPing = Date.now();
  }

  getClientCount(restaurantId?: string): number {
    if (!restaurantId) return this.clients.size;
    let count = 0;
    this.clients.forEach((c) => { if (c.restaurantId === restaurantId) count++; });
    return count;
  }

  private startPingInterval() {
    this.pingInterval = setInterval(() => {
      const now = Date.now();
      this.clients.forEach((client, id) => {
        if (now - client.lastPing > 60000) {
          client.socket.terminate();
          this.clients.delete(id);
          return;
        }
        if (client.socket.readyState === WebSocket.OPEN) {
          client.socket.ping();
        }
      });
    }, 30000);
  }

  destroy() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.clients.forEach((client) => client.socket.terminate());
    this.clients.clear();
  }
}

export const wsManager = new WebSocketManager();
