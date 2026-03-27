import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SocketService } from '../services/socket.service';
import { Subscription } from 'rxjs';
import { CardComponent } from './card/card.component';
import { FormsModule } from '@angular/forms';
import { GameState, Card, Player } from '../models/game-types';
import { FindPlayerPipe, ActivePlayerPipe } from './game-pipes';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule, CardComponent, FormsModule, FindPlayerPipe, ActivePlayerPipe],
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss']
})
export class GameComponent implements OnInit, OnDestroy {
  roomId: string | null = null;
  gameState: GameState | null = null;
  notifications: string[] = [];
  error: string | null = null;
  
  bidInput: number = 0;
  showHelp: boolean = false;
  
  trickWinnerId: string | null = null;
  private lastRound = 0;
  isProcessingMove: boolean = false;

  // Tigress
  selectedTigress: Card | null = null;
  showTigressModal = false;

  // Pirate Actions
  showBahijModal = false;
  bahijDiscards: string[] = [];

  showHarryModal = false;
  showRascalModal = false;
  showRosieModal = false;
  showTortugaModal = false;
  tortugaDeck: Card[] = [];

  helpCards: { [key: string]: Card } = {
    skullking: { id: 'help-sk', type: 'skullking' },
    pirate: { id: 'help-pi', type: 'pirate' },
    mermaid: { id: 'help-me', type: 'mermaid' },
    tigress: { id: 'help-ti', type: 'tigress' },
    kraken: { id: 'help-kr', type: 'kraken' },
    white_whale: { id: 'help-ww', type: 'white_whale' },
    loot: { id: 'help-lo', type: 'loot' },
    escape: { id: 'help-esc', type: 'escape' },
    black: { id: 'help-bl', type: 'suit', color: 'black', value: 13 },
    yellow: { id: 'help-ye', type: 'suit', color: 'yellow', value: 7 }, 
  };

  private subs: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private socketService: SocketService,
    private router: Router
  ) {}

  ngOnInit() {
    // 1. Check for player name
    const playerName = sessionStorage.getItem('username');
    if (!playerName) {
        this.router.navigate(['/']);
        return;
    }

    const rawId = this.route.snapshot.paramMap.get('id');
    this.roomId = rawId ? rawId.toLowerCase() : null;

    // 2. Connect and Join
    this.socketService.connect();
    if (this.roomId) {
        const isGuest = sessionStorage.getItem('isGuest') === 'true';
        this.socketService.joinRoom(this.roomId, playerName, isGuest);
    } 

    this.subs.add(
        this.socketService.onTrickResult().subscribe((data: { winnerId: string }) => {
            this.trickWinnerId = data.winnerId;
            // Highlight is cleared when next trick starts or after delay
            setTimeout(() => this.trickWinnerId = null, 4000); 
        })
    );

    this.subs.add(
        this.socketService.onPirateActionJack().subscribe((data: { deck: Card[] }) => {
            this.tortugaDeck = data.deck;
            this.showTortugaModal = true;
            // Automatically hide after 5 seconds
            setTimeout(() => {
                this.showTortugaModal = false;
            }, 5000);
        })
    );

    this.subs.add(
      this.socketService.onGameState().subscribe((state: GameState) => {
        console.log('Game State Update:', state);
        
        // Reset bid input when round changes (e.g. Round 1 starts, Round 2 starts)
        // Check strict equality to avoid re-triggering on same round updates
        if (state.round !== this.lastRound && state.phase === 'bidding') {
             this.lastRound = state.round;
             this.bidInput = 0; 
        }

        this.gameState = state;
        this.isProcessingMove = false; // Reset processing flag on new state

        // Check if pirate_action is required for me
        if (state.phase === 'pirate_action' && state.pirateActionData?.playerId === state.me.id) {
            const pName = state.pirateActionData.pirate;
            if (pName === 'Rosie D\'Laney') this.showRosieModal = true;
            if (pName === 'Bahij the Bandit') {
                this.showBahijModal = true;
                this.bahijDiscards = []; 
            }
            if (pName === 'Rascal of Roatan') this.showRascalModal = true;
            if (pName === 'Harry the Giant') this.showHarryModal = true;
        } else {
            this.showRosieModal = false;
            this.showBahijModal = false;
            this.showRascalModal = false;
            this.showHarryModal = false;
        }

        // Auto-Play Last Card if not round 1
        if (this.gameState.round > 1 && 
            this.gameState.phase === 'playing' && 
            this.gameState.hand.length === 1 &&
            this.gameState.players[this.gameState.turnIndex]?.id === this.gameState.me.id) {
            
            // Wait a short moment for better UX
            setTimeout(() => {
                if (this.gameState && this.gameState.hand.length === 1) {
                    this.playCard(this.gameState.hand[0]);
                }
            }, 500);
        }
      })
    );

    this.subs.add(
        this.socketService.onNotification().subscribe((msg: string) => {
            this.showNotification(msg);
            this.isProcessingMove = false; // Reset on notification (e.g., error or success)
        })
    );

    this.subs.add(
        this.socketService.onErrorNotification().subscribe((msg: string) => {
            this.error = msg;
            this.isProcessingMove = false; // Reset on error
            setTimeout(() => this.error = null, 3000);
        })
    );
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  startGame() {
    if (this.roomId) {
        this.socketService.startGame(this.roomId);
    }
  }

  addBot(difficulty: string) {
    if (this.roomId) {
        this.socketService.addBot(this.roomId, difficulty);
    }
  }

  submitBid() {
    if (this.roomId && this.gameState) {
      if (this.bidInput < 0 || this.bidInput > this.gameState.round) return;
      this.socketService.submitBid(this.roomId, this.bidInput);
    }
  }

  playCard(card: Card) {
    if (this.isProcessingMove) return;

    const state = this.gameState;
    // Basic validation
    if (!state?.me) return;
    
    // Check if it's my turn
    const activePlayer = state.players[state.turnIndex];
    if (!activePlayer || activePlayer.id !== state.me.id) {
        this.showNotification("Du bist nicht am Zug!");
        return;
    }
    
    // Check for Tigress
    if (card.type === 'tigress') {
        this.selectedTigress = card;
        this.showTigressModal = true;
        return;
    }

    if (this.roomId) {
      this.isProcessingMove = true;
      this.socketService.playCard(this.roomId, card.id);
    }
  }

  confirmTigressPlay(choice: 'pirate' | 'escape') {
      if (this.roomId && this.selectedTigress) {
          this.isProcessingMove = true;
          this.socketService.playCard(this.roomId, this.selectedTigress.id, choice);
          this.showTigressModal = false;
          this.selectedTigress = null;
      }
  }

  cancelTigressPlay() {
      this.showTigressModal = false;
      this.selectedTigress = null;
  }

  // --- Pirate Action Handlers ---

  submitRosieAction(playerId: string) {
      if (this.roomId) {
          this.socketService.submitPirateAction(this.roomId, { nextPlayerId: playerId });
          this.showRosieModal = false;
      }
  }

  toggleBahijDiscard(cardId: string) {
      const idx = this.bahijDiscards.indexOf(cardId);
      if (idx > -1) {
          this.bahijDiscards.splice(idx, 1);
      } else {
          if (this.bahijDiscards.length < 2) {
              this.bahijDiscards.push(cardId);
          }
      }
  }

  submitBahijAction() {
      if (this.roomId && this.bahijDiscards.length === 2) {
          this.socketService.submitPirateAction(this.roomId, { discardIds: this.bahijDiscards });
          this.showBahijModal = false;
      }
  }

  submitRascalAction(wager: number) {
      if (this.roomId) {
          this.socketService.submitPirateAction(this.roomId, { wager });
          this.showRascalModal = false;
      }
  }

  submitHarryAction(change: number) {
      if (this.roomId) {
          this.socketService.submitPirateAction(this.roomId, { bidChange: change });
          this.showHarryModal = false;
      }
  }

  get opponents() {
      const state = this.gameState;
      if (!state) return [];
      return state.players.filter(p => p.id !== state.me.id);
  }

  get myPlayer(): Player | undefined {
      const state = this.gameState;
      if (!state) return undefined;
      return state.players.find(p => p.id === state.me.id);
  }

  getRange(n: number): any[] {
    return Array(n).fill(0);
  }

  get sortedPlayers(): Player[] {
      if (!this.gameState) return [];
      return [...this.gameState.players].sort((a, b) => b.score - a.score);
  }

  showNotification(msg: string) {
      this.notifications.push(msg);
      setTimeout(() => this.notifications.shift(), 4000);
  }

  // Animation helper
  getCardRotation(index: number, total: number): string {
      if (total <= 1) return 'rotate(0deg) translateY(0)';
      
      const maxAngle = 20; // Max rotation angle
      const angleStep = (maxAngle * 2) / (total - 1);
      const angle = -maxAngle + (index * angleStep);
      
      const yOffset = Math.abs(angle) * 1.5; // Arc effect
      
      return `rotate(${angle}deg) translateY(${yOffset}px)`; 
  }
}
