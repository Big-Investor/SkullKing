import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RoomService {
  constructor(private http: HttpClient) {}

  createRoom(config?: { withBots: boolean, botCount: number, difficulty: string }): Observable<{ roomId: string }> {
    return this.http.post<{ roomId: string }>('/api/rooms', config || {});
  }

  checkRoom(id: string): Observable<{ exists: boolean }> {
    return this.http.get<{ exists: boolean }>(`/api/rooms/${id}`);
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
}
