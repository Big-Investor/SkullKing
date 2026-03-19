import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RoomService } from '../services/room.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  joinCode = '';
  loading = false;
  error = '';

  constructor(
    private router: Router,
    private roomService: RoomService,
  ) {}

  createRoom() {
    this.loading = true;
    this.error = '';
    this.roomService.createRoom().subscribe({
      next: ({ roomId }) => this.router.navigate(['/game', roomId]),
      error: () => {
        this.error = 'Raum konnte nicht erstellt werden. Ist der Server erreichbar?';
        this.loading = false;
      },
    });
  }

  joinRoom() {
    const code = this.joinCode.trim();
    if (!code) return;
    this.router.navigate(['/game', code]);
  }
}
