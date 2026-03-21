import { FastifyInstance } from 'fastify';
import { WebSocket } from 'ws';
import { wsManager } from '../websocket/manager';
import { v4 as uuidv4 } from 'uuid';

export default async function wsRoutes(app: FastifyInstance) {
  app.get('/live', { websocket: true }, async (socket: WebSocket, request) => {
    const clientId = uuidv4();
    let restaurantId = 'unknown';
    let authenticated = false;

    // Auth timeout — disconnect if no auth within 10s
    const authTimeout = setTimeout(() => {
      if (!authenticated) {
        socket.send(
          JSON.stringify({
            type: 'ERROR',
            payload: { message: 'Authentication timeout' },
          }),
        );
        socket.terminate();
      }
    }, 10000);

    socket.on('message', async (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        if (msg.type === 'AUTH') {
          try {
            const decoded = app.jwt.verify(msg.token) as any;
            restaurantId = decoded.restaurantId;
            authenticated = true;
            clearTimeout(authTimeout);

            wsManager.addClient(
              clientId,
              socket,
              decoded.restaurantId,
              decoded.locationId,
              decoded.id,
              decoded.role,
            );

            socket.send(
              JSON.stringify({
                type: 'AUTH_SUCCESS',
                payload: {
                  clientId,
                  restaurantId,
                  connectedClients: wsManager.getClientCount(restaurantId),
                },
              }),
            );
          } catch {
            socket.send(
              JSON.stringify({
                type: 'AUTH_ERROR',
                payload: { message: 'Invalid token' },
              }),
            );
            socket.terminate();
          }
          return;
        }

        if (!authenticated) {
          socket.send(
            JSON.stringify({
              type: 'ERROR',
              payload: { message: 'Not authenticated' },
            }),
          );
          return;
        }

        if (msg.type === 'PONG') {
          return;
        }

        if (msg.type === 'PING') {
          socket.send(JSON.stringify({ type: 'PONG' }));
          return;
        }

        socket.send(
          JSON.stringify({
            type: 'ACK',
            payload: { received: msg.type ?? 'UNKNOWN' },
          }),
        );
      } catch {
        socket.send(
          JSON.stringify({
            type: 'ERROR',
            payload: { message: 'Invalid message format' },
          }),
        );
      }
    });

    socket.on('close', () => {
      clearTimeout(authTimeout);
      wsManager.removeClient(clientId);
    });

    socket.on('error', () => {
      clearTimeout(authTimeout);
      wsManager.removeClient(clientId);
    });
  });
}