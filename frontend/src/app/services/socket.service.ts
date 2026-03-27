import { Injectable, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private socket: Socket;

  constructor() {
    this.socket = io({ autoConnect: false, transports: ['websocket', 'polling'] });
  }

  ngOnDestroy() {
    this.disconnect();
  }

  connect() {
    if (!this.socket.connected) this.socket.connect();
  }

  disconnect() {
    if (this.socket.connected) this.socket.disconnect();
  }

  // --- Room Events ---

  joinRoom(roomId: string, playerName: string, isGuest: boolean = true) {
    if (this.socket.connected) {
        this.socket.emit('room:join', { roomId, playerName, isGuest });
    } else {
        this.socket.once('connect', () => {
            this.socket.emit('room:join', { roomId, playerName, isGuest });
        });
        this.connect();
    }
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

  // --- Game Events ---
  
  startGame(roomId: string) {
    this.socket.emit('game:start', { roomId });
  }

  addBot(roomId: string, difficulty: string) {
    this.socket.emit('game:addBot', { roomId, difficulty });
  }

  submitBid(roomId: string, bid: number) {
    this.socket.emit('game:bid', { roomId, bid });
  }

  playCard(roomId: string, cardId: string, playedAs?: 'pirate' | 'escape') {
    this.socket.emit('game:play', { roomId, cardId, playedAs });
  }

  submitPirateAction(roomId: string, actionData: any) {
    this.socket.emit('game:pirate_action', { roomId, actionData });
  }

  onPirateActionJack(): Observable<any> {
    return this.fromEvent<any>('pirate_action_jack');
  }

  onGameState(): Observable<any> {
    return this.fromEvent('game:state');
  }

  onTrickResult(): Observable<{ winnerId: string }> {
      return this.fromEvent<{ winnerId: string }>('trickResult');
  }

  onNotification(): Observable<string> {
    return this.fromEvent<string>('notification');
  }

  onErrorNotification(): Observable<string> {
    return this.fromEvent<string>('errorNotification');
  }

  // --- Helper ---

  private fromEvent<T>(event: string): Observable<T> {
    return new Observable<T>(observer => {
      this.socket.on(event, (data: T) => observer.next(data));
    });
  }
}
