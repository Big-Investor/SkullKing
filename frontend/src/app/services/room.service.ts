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
}
