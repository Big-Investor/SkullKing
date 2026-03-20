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
  username = '';
  joinCode = '';
  
  withBots = false;
  botCount = 1;
  difficulty = 'medium';

  loading = false;
  error = '';

  constructor(
    private router: Router,
    private roomService: RoomService,
  ) {
    const savedName = sessionStorage.getItem('username');
    if (savedName) this.username = savedName;
  }

  isValidName() {
    return this.username && this.username.trim().length >= 2;
  }

  createRoom() {
    if (!this.isValidName()) {
       this.error = 'Bitte gib einen gültigen Namen ein!';
       return;
    }
    
    sessionStorage.setItem('username', this.username.trim());
    
    this.loading = true;
    this.error = '';

    const config = this.withBots ? {
        withBots: true,
        botCount: this.botCount,
        difficulty: this.difficulty
    } : undefined;

    this.roomService.createRoom(config).subscribe({
      next: ({ roomId }) => this.router.navigate(['/game', roomId]),
      error: () => {
        this.error = 'Raum konnte nicht erstellt werden. Ist der Server erreichbar?';
        this.loading = false;
      },
    });
  }

  joinRoom() {
    if (!this.isValidName()) {
        this.error = 'Bitte gib einen gültigen Namen ein!';
        return;
    }
    const code = this.joinCode.trim();
    if (!code) return;
    
    sessionStorage.setItem('username', this.username.trim());
    this.router.navigate(['/game', code]);
  }
}
