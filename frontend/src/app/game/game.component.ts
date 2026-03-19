import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewChecked,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { SocketService } from '../services/socket.service';
import { RoomService } from '../services/room.service';

interface ChatMessage {
  playerName: string;
  message: string;
  timestamp: number;
  isSystem?: boolean;
}

type State = 'loading' | 'name-prompt' | 'joining' | 'chat' | 'error';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink],
  templateUrl: './game.component.html',
  styleUrl: './game.component.scss',
})
export class GameComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesEnd') messagesEnd!: ElementRef;

  roomId = '';
  playerName = '';
  nameInput = '';
  messageInput = '';

  state: State = 'loading';
  errorMessage = '';
  players: string[] = [];
  messages: ChatMessage[] = [];
  showPlayerList = false;

  private subs: Subscription[] = [];
  private hasLeft = false;
  private shouldScroll = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private socketService: SocketService,
    private roomService: RoomService,
  ) {}

  ngOnInit() {
    this.roomId = this.route.snapshot.paramMap.get('id') ?? '';
    this.setupSocketListeners();

    this.roomService.checkRoom(this.roomId).subscribe({
      next: ({ exists }) => {
        if (!exists) {
          this.showError(`Raum "${this.roomId}" wurde nicht gefunden.`);
          return;
        }
        const storedName = localStorage.getItem(`sk_player_${this.roomId}`);
        if (storedName) {
          this.nameInput = storedName;
          this.connectAndJoin(storedName);
        } else {
          this.state = 'name-prompt';
        }
      },
      error: () => this.showError('Verbindung zum Server fehlgeschlagen.'),
    });
  }

  private showError(msg: string) {
    this.errorMessage = msg;
    this.state = 'error';
    setTimeout(() => this.router.navigate(['/']), 3000);
  }

  private setupSocketListeners() {
    this.subs.push(
      this.socketService.onRoomJoined().subscribe(({ players }) => {
        this.players = players;
        this.state = 'chat';
        this.shouldScroll = true;
      }),

      this.socketService.onRoomFull().subscribe(({ message }) => {
        localStorage.removeItem(`sk_player_${this.roomId}`);
        this.socketService.disconnect();
        this.showError(message);
      }),

      this.socketService.onRoomNotFound().subscribe(({ message }) => {
        localStorage.removeItem(`sk_player_${this.roomId}`);
        this.socketService.disconnect();
        this.showError(message);
      }),

      this.socketService.onUserJoined().subscribe(({ playerName, players }) => {
        this.players = players;
        this.addSystemMessage(`${playerName} hat den Raum betreten.`);
      }),

      this.socketService.onUserLeft().subscribe(({ playerName, players }) => {
        this.players = players;
        this.addSystemMessage(`${playerName} hat den Raum verlassen.`);
      }),

      this.socketService.onChatMessage().subscribe((msg) => {
        this.messages.push(msg);
        this.shouldScroll = true;
      }),
    );
  }

  private addSystemMessage(text: string) {
    this.messages.push({ playerName: '', message: text, timestamp: Date.now(), isSystem: true });
    this.shouldScroll = true;
  }

  connectAndJoin(name: string) {
    this.playerName = name.trim();
    if (!this.playerName) return;
    this.state = 'joining';
    localStorage.setItem(`sk_player_${this.roomId}`, this.playerName);
    this.socketService.connect();
    this.socketService.joinRoom(this.roomId, this.playerName);
  }

  submitName() {
    const name = this.nameInput.trim();
    if (!name) return;
    this.connectAndJoin(name);
  }

  sendMessage() {
    const msg = this.messageInput.trim();
    if (!msg) return;
    this.socketService.sendMessage(msg);
    this.messageInput = '';
  }

  leaveRoom() {
    this.hasLeft = true;
    this.socketService.leaveRoom();
    this.socketService.disconnect();
    localStorage.removeItem(`sk_player_${this.roomId}`);
    this.router.navigate(['/']);
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      try {
        this.messagesEnd?.nativeElement.scrollIntoView({ behavior: 'smooth' });
      } catch {}
      this.shouldScroll = false;
    }
  }

  ngOnDestroy() {
    this.subs.forEach((s) => s.unsubscribe());
    if (['joining', 'chat'].includes(this.state) && !this.hasLeft) {
      this.socketService.leaveRoom();
    }
    this.socketService.disconnect();
  }
}
