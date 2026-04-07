import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { GameModeInfo, OpenRoomInfo, RoomService, RuleSettings } from '../services/room.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit, OnDestroy {
  activeTab: 'play' | 'scoreboard' | 'account' = 'play';

  // Play Tab
  username = '';
  joinCode = '';
  withBots = false;
  botCount = 1;
  difficulty = 'medium';
  gameModes: GameModeInfo[] = [];
  selectedGameModeId = 'normal';
  ruleSettings: RuleSettings = {
    enableBonusPoints: true,
    enablePirateAbilities: true,
    enableLootCards: true,
    enableSeaMonsters: true
  };
  loading = false;
  error = '';
  isLoggedIn = false;

  // Account Tab
  accUsername = '';
  accPassword = '';
  accError = '';
  accSuccess = '';
  accMode: 'login' | 'register' = 'login';

  accountData: { username: string; gamesPlayed: number; gamesWon: number; totalScore: number } | null = null;
  showAccountEditor = false;
  editUsername = '';
  editCurrentPassword = '';
  editNewPassword = '';
  accountUpdateError = '';
  accountUpdateSuccess = '';

  // Scoreboard
  leaderboard: any[] = [];
  openRooms: OpenRoomInfo[] = [];
  roomsLoading = false;
  private openRoomsTimer: any = null;

  constructor(
    private router: Router,
    private roomService: RoomService,
  ) {
    this.checkLoginStatus();
  }

  ngOnInit() {
      this.loadLeaderboard();
      this.loadGameModes();
      this.loadOpenRooms();
      if (this.isLoggedIn) {
        this.loadAccount();
      }

      this.openRoomsTimer = setInterval(() => {
        if (this.activeTab === 'play') {
          this.loadOpenRooms(true);
        }
      }, 5000);
  }

  ngOnDestroy() {
    if (this.openRoomsTimer) {
      clearInterval(this.openRoomsTimer);
      this.openRoomsTimer = null;
    }
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
      if (tab === 'play') {
        this.loadOpenRooms();
      }
      if (tab === 'scoreboard') {
          this.loadLeaderboard();
      }
      if (tab === 'account' && this.isLoggedIn) {
        this.loadAccount();
      }
  }

  loadLeaderboard() {
      this.roomService.getLeaderboard().subscribe({
          next: (data) => this.leaderboard = data,
          error: (err) => console.error('Error loading leaderboard', err)
      });
  }

    loadGameModes() {
      this.roomService.getGameModes().subscribe({
        next: (data) => {
          this.gameModes = Array.isArray(data?.modes) ? data.modes : [];
          const defaultId = data?.defaultGameModeId || this.selectedGameModeId;
          const selectedExists = this.gameModes.some(mode => mode.id === this.selectedGameModeId);
          if (!selectedExists) {
            this.selectedGameModeId = this.gameModes.some(mode => mode.id === defaultId)
              ? defaultId
              : (this.gameModes[0]?.id || this.selectedGameModeId);
          }
        },
        error: (err) => {
          console.error('Error loading game modes', err);
          if (this.gameModes.length === 0) {
            this.gameModes = this.getFallbackGameModes();
            this.selectedGameModeId = this.gameModes[0].id;
          }
        }
      });
    }

    get selectedGameMode(): GameModeInfo | null {
      return this.gameModes.find(mode => mode.id === this.selectedGameModeId) || null;
    }

      getModeDescription(mode: GameModeInfo | null): string {
        if (!mode) return '';

        const descriptions: Record<string, string> = {
          normal: '10 Durchgänge, mit 1 bis 10 Karten pro Hand.',
            volle_fahrt_voraus: '10 Durchgänge, je zwei mit 2, 4, 6, 8, 10 Karten pro Hand.',
            ueberraschungsangriff: '5 Durchgänge, je einen mit 6, 7, 8, 9, 10 Karten.',
            schuss_vor_den_bug: '5 Durchgänge à 5 Karten.',
            volle_breitseite: '10 Durchgänge à 10 Karten.',
            starker_wellengang: '10 Durchgänge, je zwei mit 9, 7, 5, 3, 1 Karten.',
          schlafenszeit: '1 Durchgang mit 1 Karte, plus einen Gute-Nacht-Kuss ... ;o)'
        };

        return descriptions[mode.id] || `${mode.cardsPerRound.length} Durchgang(e): ${mode.cardsPerRound.join(', ')} Karten`;
      }

    getRoomModeLabel(room: OpenRoomInfo): string {
      if (room.gameModeName) return room.gameModeName;
      const localMode = this.gameModes.find(mode => mode.id === room.gameModeId);
      return localMode?.name || 'Spielmodus unbekannt';
    }

    private getFallbackGameModes(): GameModeInfo[] {
      return [
        { id: 'normal', name: 'Normal', cardsPerRound: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
        { id: 'volle_fahrt_voraus', name: 'Volle Fahrt voraus', cardsPerRound: [2, 2, 4, 4, 6, 6, 8, 8, 10, 10] },
        { id: 'ueberraschungsangriff', name: 'Überraschungsangriff', cardsPerRound: [6, 7, 8, 9, 10] },
        { id: 'schuss_vor_den_bug', name: 'Schuss vor den Bug', cardsPerRound: [5, 5, 5, 5, 5] },
        { id: 'volle_breitseite', name: 'Volle Breitseite', cardsPerRound: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10] },
        { id: 'starker_wellengang', name: 'Starker Wellengang', cardsPerRound: [9, 9, 7, 7, 5, 5, 3, 3, 1, 1] },
        { id: 'schlafenszeit', name: 'Schlafenszeit (mit Gute-Nacht-Kuss)', cardsPerRound: [1] }
      ];
    }

    loadOpenRooms(silent = false) {
      if (!silent) {
        this.roomsLoading = true;
      }

      this.roomService.getOpenRooms().subscribe({
        next: (rooms) => {
          this.openRooms = rooms;
          this.roomsLoading = false;
        },
        error: (err) => {
          console.error('Error loading open rooms', err);
          this.roomsLoading = false;
        }
      });
    }

    joinOpenRoom(roomId: string) {
      this.joinCode = roomId;
      this.joinRoom();
    }

    getJoinModeLabel(room: OpenRoomInfo): string {
      if (room.joinMode === 'replace_bot') return 'Bot ersetzen';
      if (room.joinMode === 'open_slot') return 'Freier Platz';
      return 'Geschlossen';
    }

    loadAccount() {
      if (!this.isLoggedIn || !this.username) {
        this.accountData = null;
        return;
      }

      this.roomService.getAccount(this.username).subscribe({
        next: (data) => this.accountData = data,
        error: (err) => {
          console.error('Error loading account', err);
          this.accountData = null;
        }
      });
    }

  doLogin() {
      const u = (this.accUsername || '').trim();
      if (!u || !this.accPassword) {
          this.accError = "Bitte fülle beide Felder aus."; return;
      }
      if (u.length < 2 || u.length > 20) {
        this.accError = 'Benutzername muss zwischen 2 und 20 Zeichen lang sein.';
        return;
      }

      this.roomService.login(u, this.accPassword).subscribe({
          next: (res) => {
              sessionStorage.setItem('username', res.username);
              sessionStorage.setItem('isGuest', 'false');
              this.username = res.username;
              this.isLoggedIn = true;
              this.accSuccess = `Willkommen zurück, ${res.username}!`;
              this.accError = '';
          this.accPassword = '';
          this.loadAccount();
              setTimeout(() => this.switchTab('play'), 1500);
          },
          error: (err) => {
              this.accError = err.error.error || "Login fehlgeschlagen.";
              this.accSuccess = '';
          }
      });
  }

  doRegister() {
      const u = (this.accUsername || '').trim();
      if (!u || !this.accPassword) {
          this.accError = "Bitte fülle beide Felder aus."; return;
      }
      if (u.length < 2 || u.length > 20) {
        this.accError = 'Benutzername muss zwischen 2 und 20 Zeichen lang sein.';
        return;
      }

      this.roomService.register(u, this.accPassword).subscribe({
          next: (res) => {
              sessionStorage.setItem('username', res.username);
              sessionStorage.setItem('isGuest', 'false');
              this.username = res.username;
              this.isLoggedIn = true;
              this.accSuccess = `Account ${res.username} erfolgreich erstellt!`;
              this.accError = '';
          this.accPassword = '';
          this.loadAccount();
              setTimeout(() => this.switchTab('play'), 1500);
          },
          error: (err) => {
              this.accError = err.error.error || "Registrierung fehlgeschlagen.";
              this.accSuccess = '';
          }
      });
  }

    toggleAccountEditor() {
      this.showAccountEditor = !this.showAccountEditor;
      this.accountUpdateError = '';
      this.accountUpdateSuccess = '';
      if (this.showAccountEditor) {
        this.editUsername = this.username;
        this.editCurrentPassword = '';
        this.editNewPassword = '';
      }
    }

    saveAccountChanges() {
      this.accountUpdateError = '';
      this.accountUpdateSuccess = '';

      const currentPassword = this.editCurrentPassword;
      if (!currentPassword) {
        this.accountUpdateError = 'Bitte gib dein aktuelles Passwort ein.';
        return;
      }

      const newUsername = (this.editUsername || '').trim();
      const newPassword = (this.editNewPassword || '').toString();

      const changes: { newUsername?: string; newPassword?: string } = {};

      if (newUsername && newUsername !== this.username) {
        if (newUsername.length < 2 || newUsername.length > 20) {
          this.accountUpdateError = 'Benutzername muss zwischen 2 und 20 Zeichen lang sein.';
          return;
        }
        changes.newUsername = newUsername;
      }

      if (newPassword) {
        changes.newPassword = newPassword;
      }

      if (!changes.newUsername && !changes.newPassword) {
        this.accountUpdateError = 'Keine Änderungen angegeben.';
        return;
      }

      this.roomService.updateAccount(this.username, currentPassword, changes).subscribe({
        next: (res) => {
          const updatedName = res.username || this.username;
          sessionStorage.setItem('username', updatedName);
          sessionStorage.setItem('isGuest', 'false');

          this.username = updatedName;
          this.isLoggedIn = true;

          this.accountUpdateSuccess = 'Account wurde aktualisiert.';
          this.showAccountEditor = false;
          this.editCurrentPassword = '';
          this.editNewPassword = '';

          this.loadAccount();
          this.loadLeaderboard();
        },
        error: (err) => {
          this.accountUpdateError = err.error?.error || 'Update fehlgeschlagen.';
        }
      });
    }

  logout() {
      sessionStorage.removeItem('username');
      sessionStorage.removeItem('isGuest');
      this.username = '';
      this.isLoggedIn = false;
      this.accSuccess = "Du wurdest ausgeloggt.";

      this.accountData = null;
      this.showAccountEditor = false;
      this.editUsername = '';
      this.editCurrentPassword = '';
      this.editNewPassword = '';
      this.accountUpdateError = '';
      this.accountUpdateSuccess = '';
  }

  isValidName() {
    const n = (this.username || '').trim();
    return n.length >= 2 && n.length <= 20;
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

    const config = {
      withBots: this.withBots,
        botCount: this.botCount,
      difficulty: this.difficulty,
      gameModeId: this.selectedGameModeId,
      ruleSettings: this.ruleSettings
    };

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
          this.loadOpenRooms(true);
        }
      },
      error: () => {
        this.error = 'Server-Fehler';
        this.loading = false;
        this.loadOpenRooms(true);
      }
    });
  }
}

