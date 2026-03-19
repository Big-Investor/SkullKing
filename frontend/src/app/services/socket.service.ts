import { Injectable, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private socket: Socket;

  constructor() {
    this.socket = io({ autoConnect: false, transports: ['websocket', 'polling'] });
  }

  connect() {
    if (!this.socket.connected) this.socket.connect();
  }

  disconnect() {
    if (this.socket.connected) this.socket.disconnect();
  }

  joinRoom(roomId: string, playerName: string) {
    this.socket.emit('room:join', { roomId, playerName });
  }

  leaveRoom() {
    this.socket.emit('room:leave');
  }

  sendMessage(message: string) {
    this.socket.emit('chat:send', { message });
  }

  onRoomJoined(): Observable<{ players: string[] }> {
    return this.fromEvent('room:joined');
  }

  onRoomFull(): Observable<{ message: string }> {
    return this.fromEvent('room:full');
  }

  onRoomNotFound(): Observable<{ message: string }> {
    return this.fromEvent('room:not_found');
  }

  onUserJoined(): Observable<{ playerName: string; players: string[] }> {
    return this.fromEvent('room:user_joined');
  }

  onUserLeft(): Observable<{ playerName: string; players: string[] }> {
    return this.fromEvent('room:user_left');
  }

  onChatMessage(): Observable<{ playerName: string; message: string; timestamp: number }> {
    return this.fromEvent('chat:message');
  }

  private fromEvent<T>(event: string): Observable<T> {
    return new Observable<T>((observer) => {
      const handler = (data: T) => observer.next(data);
      this.socket.on(event, handler);
      return () => this.socket.off(event, handler);
    });
  }

  ngOnDestroy() {
    this.socket.disconnect();
  }
}
