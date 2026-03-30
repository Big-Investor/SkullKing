import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RoomService } from '../services/room.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  activeTab: 'play' | 'scoreboard' | 'account' = 'play';

  // Play Tab
  username = '';
  joinCode = '';
  withBots = false;
  botCount = 1;
  difficulty = 'medium';
  loading = false;
  error = '';
  isLoggedIn = false;

  // Account Tab
  accUsername = '';
  accPassword = '';
  accError = '';
  accSuccess = '';
  accMode: 'login' | 'register' = 'login';

  // Scoreboard
  leaderboard: any[] = [];

  constructor(
    private router: Router,
    private roomService: RoomService,
  ) {
    this.checkLoginStatus();
  }

  ngOnInit() {
      this.loadLeaderboard();
  }

  checkLoginStatus() {
    const savedName = sessionStorage.getItem('username');
    const guest = sessionStorage.getItem('isGuest');
    if (savedName) {
        this.username = savedName;
        this.isLoggedIn = (guest !== 'true');
    }
  }

  switchTab(tab: 'play' | 'scoreboard' | 'account') {
      this.activeTab = tab;
      if (tab === 'scoreboard') {
          this.loadLeaderboard();
      }
  }

  loadLeaderboard() {
      this.roomService.getLeaderboard().subscribe({
          next: (data) => this.leaderboard = data,
          error: (err) => console.error('Error loading leaderboard', err)
      });
  }

  doLogin() {
      if (!this.accUsername || !this.accPassword) {
          this.accError = "Bitte fülle beide Felder aus."; return;
      }
      this.roomService.login(this.accUsername, this.accPassword).subscribe({
          next: (res) => {
              sessionStorage.setItem('username', res.username);
              sessionStorage.setItem('isGuest', 'false');
              this.username = res.username;
              this.isLoggedIn = true;
              this.accSuccess = `Willkommen zurück, ${res.username}!`;
              this.accError = '';
              setTimeout(() => this.switchTab('play'), 1500);
          },
          error: (err) => {
              this.accError = err.error.error || "Login fehlgeschlagen.";
              this.accSuccess = '';
          }
      });
  }

  doRegister() {
      if (!this.accUsername || !this.accPassword) {
          this.accError = "Bitte fülle beide Felder aus."; return;
      }
      this.roomService.register(this.accUsername, this.accPassword).subscribe({
          next: (res) => {
              sessionStorage.setItem('username', res.username);
              sessionStorage.setItem('isGuest', 'false');
              this.username = res.username;
              this.isLoggedIn = true;
              this.accSuccess = `Account ${res.username} erfolgreich erstellt!`;
              this.accError = '';
              setTimeout(() => this.switchTab('play'), 1500);
          },
          error: (err) => {
              this.accError = err.error.error || "Registrierung fehlgeschlagen.";
              this.accSuccess = '';
          }
      });
  }

  logout() {
      sessionStorage.removeItem('username');
      sessionStorage.removeItem('isGuest');
      this.username = '';
      this.isLoggedIn = false;
      this.accSuccess = "Du wurdest ausgeloggt.";
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
    if (!this.isLoggedIn) sessionStorage.setItem('isGuest', 'true');
    
    this.loading = true;
    this.error = '';

    const config = this.withBots ? {
        withBots: true,
        botCount: this.botCount,
        difficulty: this.difficulty
    } : undefined;

    this.roomService.createRoom(config).subscribe({
      next: ({ roomId }) => {
        this.router.navigate(['/game', roomId]);
      },
      error: () => {
        this.error = 'Fehler beim Erstellen des Raums';
        this.loading = false;
      }
    });
  }

  joinRoom() {
    if (!this.isValidName()) {
       this.error = 'Bitte gib einen gültigen Namen ein!';
       return;
    }
    if (!this.joinCode || !this.joinCode.trim()) return;

    sessionStorage.setItem('username', this.username.trim());
    if (!this.isLoggedIn) sessionStorage.setItem('isGuest', 'true');

    this.loading = true;
    this.error = '';

    // Remove ALL whitespaces and case-normalize
    const id = this.joinCode.replace(/\s/g, '').toLowerCase();
    this.roomService.checkRoom(id).subscribe({
      next: ({ exists }) => {
        if (exists) {
          this.router.navigate(['/game', id]);
        } else {
          this.error = 'Raum nicht gefunden';
          this.loading = false;
        }
      },
      error: () => {
        this.error = 'Server-Fehler';
        this.loading = false;
      }
    });
  }
}

