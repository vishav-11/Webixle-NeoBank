/**
 * socketService.ts
 * Socket.IO client — platform safe (web + mobile)
 * Connects after login, disconnects after logout
 */

import { Platform } from 'react-native';
import { TokenStorage } from './apiClient';

const SOCKET_URL =process.env.EXPO_PUBLIC_API_URL || 'https://metaapi.yourmetavault.com';


// ─── Event types ───────────────────────────────────────────────────────────────
export type SocketEvent =
  | 'new_notification'
  | 'notification'
  | 'notifications_updated'
  | 'notification:read'
  | 'notification:all-read'
  | 'transaction:update'
  | 'p2p:order-update'
  | 'connect'
  | 'disconnect'
  | 'connect_error'
  | 'notification:new'

export type SocketListener = (data: any) => void;

// ─── SocketService class ───────────────────────────────────────────────────────
class SocketService {
  private socket: any = null;
  private listeners: Map<string, Set<SocketListener>> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isConnecting = false;
  private shouldBeConnected = false;
  private io: any = null;

  // ── Load socket.io-client ──────────────────────────────────────────────────
  private async loadIO() {
    if (this.io) return this.io;
    try {
      // Works on both web and RN
      const mod = await import('socket.io-client');
      this.io = mod.default || mod.io || mod;
      return this.io;
    } catch (e) {
      console.warn('[Socket] socket.io-client not installed:', e);
      return null;
    }
  }

  // ── Connect ────────────────────────────────────────────────────────────────
  async connect(): Promise<void> {
    if (this.isConnecting || this.socket?.connected) return;

    this.shouldBeConnected = true;
    this.isConnecting = true;

    try {
      const token = await TokenStorage.get();
      if (!token) {
        console.warn('[Socket] No token — skip connect');
        this.isConnecting = false;
        return;
      }

      const io = await this.loadIO();
      if (!io) {
        this.isConnecting = false;
        return;
      }

      // Disconnect old socket if any
      if (this.socket) {
        this.socket.removeAllListeners();
        this.socket.disconnect();
        this.socket = null;
      }

      this.socket = io(SOCKET_URL, {
        auth:              { token },
        transports:        [ 'polling'],
        reconnection:      true,
        reconnectionDelay: 2000,
        reconnectionAttempts: 10,
        timeout:           10000,
        forceNew:          true,
      });

      this.attachCoreListeners();
    } catch (e) {
      console.error('[Socket] connect error:', e);
    } finally {
      this.isConnecting = false;
    }
  }

  // ── Core listeners ─────────────────────────────────────────────────────────
  private attachCoreListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {

  this.emit('connect', { id: this.socket.id });
});

    this.socket.on('disconnect', (reason: string) => {
      this.emit('disconnect', { reason });

      // Auto reconnect if we should be connected
      if (this.shouldBeConnected && reason !== 'io client disconnect') {
        this.scheduleReconnect();
      }
    });

    this.socket.on('connect_error', (err: Error) => {
      console.warn('[Socket] connect_error:', err.message);
      this.emit('connect_error', { message: err.message });
    });

    // ── App events ─────────────────────────────────────────────────────────
   const appEvents: SocketEvent[] = [
  'new_notification',
  'notification',
  'notifications_updated',
  'notification:read',
  'notification:all-read',
  'transaction:update',
  'p2p:order-update',
  'notification:new'
];

    appEvents.forEach((event) => {
      this.socket.on(event, (data: any) => {
        this.emit(event, data);
      });
    });
  }

  // ── Internal emit to local listeners ──────────────────────────────────────
  private emit(event: string, data: any) {
    const set = this.listeners.get(event);
    if (set) set.forEach((fn) => { try { fn(data); } catch {} });
  }

  // ── Public: subscribe ──────────────────────────────────────────────────────
  on(event: SocketEvent, fn: SocketListener): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(fn);

    // Return unsubscribe
    return () => { this.listeners.get(event)?.delete(fn); };
  }

  // ── Public: emit to server ─────────────────────────────────────────────────
  send(event: string, data?: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('[Socket] Not connected — cannot send:', event);
    }
  }

  // ── Disconnect ─────────────────────────────────────────────────────────────
  disconnect() {
    this.shouldBeConnected = false;
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // ── Reconnect ──────────────────────────────────────────────────────────────
  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      if (this.shouldBeConnected) await this.connect();
    }, 3000);
  }

  // ── Getters ────────────────────────────────────────────────────────────────
  get isConnected(): boolean {
    return this.socket?.connected === true;
  }

  get socketId(): string | undefined {
    return this.socket?.id;
  }
}

// Singleton
export const socketService = new SocketService();
export default socketService;