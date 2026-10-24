import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { AuthService } from '../services/auth.service.js';
import { StorageService } from '../services/storage.service.js';

interface ClientConnection {
  ws: WebSocket;
  roomId: string;
  userId: string;
  role: string;
}

export class WebRTCSignalingServer {
  private static rooms: Map<string, ClientConnection[]> = new Map();

  public static initialize(server: HttpServer): WebSocketServer {
    const wss = new WebSocketServer({ server, path: '/ws/signaling' });

    wss.on('connection', (ws: WebSocket) => {
      let currentClient: ClientConnection | null = null;

      ws.on('message', (data: string) => {
        try {
          const message = JSON.parse(data.toString());

          switch (message.type) {
            case 'join-room': {
              const { roomId, token, demoRole, userId: fallbackUserId, role: fallbackRole } = message;

              // 1. Authorization Verification
              let authenticatedUser = token ? AuthService.verifyToken(token) : null;
              if (!authenticatedUser && demoRole && process.env.NODE_ENV !== 'production') {
                const demo = AuthService.getDemoUserByRole(demoRole);
                if (demo) {
                  authenticatedUser = {
                    userId: demo.user.id,
                    email: demo.user.email,
                    role: demoRole,
                    clinicId: demo.clinicId,
                    isPlatformAdmin: demoRole === 'platform_owner'
                  };
                }
              }

              if (!authenticatedUser) {
                ws.send(JSON.stringify({
                  type: 'error',
                  code: 'UNAUTHORIZED',
                  message: 'WebRTC Signaling Authorization Failed: Missing or invalid JWT credentials.'
                }));
                return;
              }

              // 2. Room Access Verification
              const storage = StorageService.getInstance();
              const session = storage.consultationSessions.find(s => s.room_sid === roomId || s.id === roomId);

              // If a known clinical consultation session exists, verify patient/doctor/staff bounds
              if (session) {
                const isPlatformAdmin = authenticatedUser.isPlatformAdmin;
                const isClinicStaff = session.clinic_id === authenticatedUser.clinicId;
                const isAssignedDoctor = session.doctor_id === (authenticatedUser.userId || fallbackUserId);
                const isAssignedPatient = session.patient_id === (authenticatedUser.userId || fallbackUserId);

                if (!isPlatformAdmin && !isClinicStaff && !isAssignedDoctor && !isAssignedPatient) {
                  ws.send(JSON.stringify({
                    type: 'error',
                    code: 'FORBIDDEN',
                    message: 'Access Denied: You are not authorized to access this consultation room.'
                  }));
                  return;
                }
              }

              const resolvedUserId = authenticatedUser.userId || fallbackUserId || 'anonymous';
              const resolvedRole = authenticatedUser.role || fallbackRole || 'attendee';

              currentClient = { ws, roomId, userId: resolvedUserId, role: resolvedRole };

              if (!this.rooms.has(roomId)) {
                this.rooms.set(roomId, []);
              }

              const roomClients = this.rooms.get(roomId)!;
              roomClients.push(currentClient);

              // Notify existing peers
              const otherClients = roomClients.filter(c => c.ws !== ws);
              ws.send(JSON.stringify({
                type: 'room-joined',
                roomId,
                peerCount: roomClients.length,
                isInitiator: roomClients.length > 1
              }));

              otherClients.forEach(peer => {
                peer.ws.send(JSON.stringify({
                  type: 'peer-joined',
                  userId: resolvedUserId,
                  role: resolvedRole
                }));
              });
              break;
            }

            case 'offer':
            case 'answer':
            case 'ice-candidate':
            case 'media-state': {
              if (currentClient) {
                const roomClients = this.rooms.get(currentClient.roomId) || [];
                roomClients.forEach(peer => {
                  if (peer.ws !== ws && peer.ws.readyState === WebSocket.OPEN) {
                    peer.ws.send(JSON.stringify(message));
                  }
                });
              }
              break;
            }

            case 'leave-room': {
              if (currentClient) {
                this.removeClient(currentClient);
                currentClient = null;
              }
              break;
            }
          }
        } catch (err) {
          console.error('Signaling message error:', err);
        }
      });

      ws.on('close', () => {
        if (currentClient) {
          this.removeClient(currentClient);
        }
      });

      ws.on('error', (err) => {
        console.error('WebSocket client error:', err);
        if (currentClient) {
          this.removeClient(currentClient);
        }
      });
    });

    console.log('WebRTC Signaling WebSocket attached on /ws/signaling');
    return wss;
  }

  private static removeClient(client: ClientConnection) {
    const roomClients = this.rooms.get(client.roomId);
    if (!roomClients) return;

    const remaining = roomClients.filter(c => c.ws !== client.ws);
    if (remaining.length === 0) {
      this.rooms.delete(client.roomId);
    } else {
      this.rooms.set(client.roomId, remaining);
      remaining.forEach(peer => {
        if (peer.ws.readyState === WebSocket.OPEN) {
          peer.ws.send(JSON.stringify({
            type: 'peer-left',
            userId: client.userId,
            role: client.role
          }));
        }
      });
    }
  }
}
