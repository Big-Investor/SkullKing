import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface OpenRoomInfo {
  roomId: string;
  phase: string;
  round: number;
  gameModeId?: string;
  gameModeName?: string;
  ruleSettings?: RuleSettings;
  playerCount: number;
  botCount: number;
  humanCount: number;
  maxPlayers: number;
  canJoin: boolean;
  joinMode: 'open_slot' | 'replace_bot' | 'closed';
}

export interface RuleSettings {
  enableBonusPoints: boolean;
  enablePirateAbilities: boolean;
  enableLootCards: boolean;
  enableSeaMonsters: boolean;
}

export interface GameModeInfo {
  id: string;
  name: string;
  cardsPerRound: number[];
}

export interface GameModeListResponse {
  defaultGameModeId: string;
  modes: GameModeInfo[];
}

@Injectable({ providedIn: 'root' })
export class RoomService {
  constructor(private http: HttpClient) {}

  createRoom(config?: { withBots: boolean, botCount: number, difficulty: string, gameModeId?: string, ruleSettings?: RuleSettings }): Observable<{ roomId: string; gameModeId?: string; ruleSettings?: RuleSettings }> {
    return this.http.post<{ roomId: string; gameModeId?: string; ruleSettings?: RuleSettings }>('/api/rooms', config || {});
  }

  getGameModes(): Observable<GameModeListResponse> {
    return this.http.get<GameModeListResponse>('/api/game-modes');
  }

  checkRoom(id: string): Observable<{ exists: boolean }> {
    return this.http.get<{ exists: boolean }>(`/api/rooms/${id}`);
  }

  getOpenRooms(): Observable<OpenRoomInfo[]> {
    return this.http.get<OpenRoomInfo[]>('/api/rooms');
  }

  register(username: string, password: string): Observable<any> {
    return this.http.post('/api/register', { username, password });
  }

  login(username: string, password: string): Observable<any> {
    return this.http.post('/api/login', { username, password });
  }

  getLeaderboard(): Observable<any[]> {
    return this.http.get<any[]>('/api/leaderboard');
  }

  getAccount(username: string): Observable<any> {
    return this.http.get<any>(`/api/account/${encodeURIComponent(username)}`);
  }

  updateAccount(
    username: string,
    password: string,
    changes: { newUsername?: string; newPassword?: string }
  ): Observable<any> {
    return this.http.post('/api/account/update', { username, password, ...changes });
  }
}
