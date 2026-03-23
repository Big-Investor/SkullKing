const Deck = require('./Deck');
const Player = require('./Player');
const Bot = require('./Bot');

class Game {
  constructor(roomId, io) {
    this.id = roomId;
    this.io = io;
    this.players = [];
    this.deck = new Deck();
    this.round = 0;
    this.maxRounds = 10;
    this.phase = 'lobby'; // lobby, bidding, playing, finished
    this.currentTrick = []; // { playerId, card }
    this.startPlayerIndex = 0;
    this.currentPlayerIndex = 0;
    this.lastTrickWinner = null;
  }

  addPlayer(id, name, isBot = false, difficulty = 'medium') {
    if (this.phase !== 'lobby') return false;
    if (this.players.length >= 8) return false;
    
    if (isBot) {
        this.players.push(new Bot(id, name, difficulty));
    } else {
        this.players.push(new Player(id, name));
    }
    return true;
  }

  addBots(count, difficulty) {
      if (this.phase !== 'lobby') return;
      const names = ['Blackbeard', 'Hook', 'Sparrow', 'Morgan', 'Drake', 'Barbossa', 'Jones', 'Silver'];
      let currentBotCount = this.players.filter(p => p.isBot).length;
      
      for (let i = 0; i < count; i++) {
          const nameIndex = (currentBotCount + i) % names.length;
          const name = names[nameIndex] + ' (Bot)';
          const id = 'bot-' + Date.now() + '-' + i;
          this.addPlayer(id, name, true, difficulty);
      }
      this.emitState();
  }

  removePlayer(id) {
    this.players = this.players.filter(p => p.id !== id);
  }

  start() {
    if (this.players.length < 2) return; // Minimum 2 players
    
    // Adjust max rounds based on player count (Total 69 cards)
    // 7 players: Max 9 rounds
    // 8 players: Max 8 rounds
    const deckSize = 69;
    this.maxRounds = Math.min(10, Math.floor(deckSize / this.players.length));

    this.round = 1;
    this.startRound();
  }

  startRound() {
    this.deck.reset();
    
    // Deal cards
    this.players.forEach(p => {
        p.resetRound();
        p.hand = this.deck.deal(this.round);
    });

    this.phase = 'bidding';
    this.startPlayerIndex = (this.round - 1) % this.players.length;
    this.currentPlayerIndex = this.startPlayerIndex;
    
    // Trigger Bots to Bid
    this.players.forEach(p => {
        if (p.isBot) {
            // Simulate "thinking" delay
            setTimeout(() => {
                const bid = p.calculateBid(this.round);
                this.handleBid(p.id, bid);
            }, 1000 + Math.random() * 2000);
        }
    });

    this.emitState();
  }

  handleBid(playerId, bid) {
    const player = this.players.find(p => p.id === playerId);
    if (!player || this.phase !== 'bidding') return;
    
    // Ensure bid is a number
    player.bid = parseInt(bid, 10);

    // Check if everyone has bid
    if (this.players.every(p => p.bid !== null)) {
      this.phase = 'playing';
      this.currentTrick = [];
      this.currentPlayerIndex = this.startPlayerIndex;
      this.emitState(); // Everyone has bid, ready to play
      
      // Delay before first bot plays to let users see "Game Start" state first
      setTimeout(() => this.checkNextToPlay(), 500);
    } else {
        this.emitState(); 
    }
  }

  checkNextToPlay() {
      if (this.phase !== 'playing') return;
      
      const currentPlayer = this.players[this.currentPlayerIndex];
      
      if (currentPlayer && currentPlayer.isBot) {
          // If bot needs to play, wait a bit
          setTimeout(() => {
              // Re-check phase to prevent race conditions
              if (this.phase !== 'playing' || this.players[this.currentPlayerIndex].id !== currentPlayer.id) return;

              // Determine lead suit if not first
              let leadSuit = null;
              for (const t of this.currentTrick) {
                  if (t.card.type === 'suit') {
                      leadSuit = t.card.color;
                      break;
                  }
              }

              // Use Bot's chooseCard method
              const cardToPlay = currentPlayer.chooseCard(this.currentTrick, leadSuit);
              
              if (cardToPlay) {
                   this.handlePlayCard(currentPlayer.id, cardToPlay.id);
              }

          }, 1500 + Math.random() * 1000); // Variable delay for realism
      }
  }

  handlePlayCard(playerId, cardId) {
    if (this.phase !== 'playing') return;
    
    // Validate Current Trick State (Prevent playing if trick is already full/resolving)
    if (this.currentTrick.length >= this.players.length) return;

    const playerIndex = this.players.findIndex(p => p.id === playerId);
    if (playerIndex !== this.currentPlayerIndex) return;

    const player = this.players[playerIndex];
    const cardIndex = player.hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return;

    const card = player.hand[cardIndex];

    // Validation: Must serve suit
    if (!this.isValidMove(player, card)) {
        this.io.to(playerId).emit('errorNotification', 'Du musst Farbe bedienen!');
        return;
    }

    // Play card
    player.hand.splice(cardIndex, 1);
    this.currentTrick.push({ playerId, card });

    // Broadcast play to all
    this.io.in(this.id).emit('cardPlayed', { playerId, card });

    // Check if trick complete
    if (this.currentTrick.length === this.players.length) {
        
        // Emit full state update so the frontend sees the last card!
        this.emitState(); 

        // Determine winner immediately for visual feedback
        let winnerId = null;
        const krakenIndex = this.currentTrick.findIndex(t => t.card.type === 'kraken');
        if (krakenIndex !== -1) {
            winnerId = this.currentTrick[krakenIndex].playerId; // Provisional winner for next lead
            this.io.in(this.id).emit('notification', 'KRAKEN! Stich zerstört.');
        } else {
            winnerId = this.determineTrickWinner(this.currentTrick);
            const winner = this.players.find(p => p.id === winnerId);
            if (winner) {
                 this.io.in(this.id).emit('notification', `${winner.name} gewinnt den Stich!`);
            }
        }
        
        // Emit result for highlighting
        this.io.in(this.id).emit('trickResult', { winnerId });

        // Delay clearing the trick so players can see the result
        setTimeout(() => this.resolveTrick(), 4000); 
    } else {
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        this.emitState();
        this.checkNextToPlay(); // Check next player
    }
  }

  isValidMove(player, card) {
    if (this.currentTrick.length === 0) return true; // Lead player can play anything

    // Find lead color (first non-special suit card determines color)
    let leadColor = null;
    for (const t of this.currentTrick) {
        // Skull King, Mermaid, Pirate, Escape, Kraken have no color suit to serve
        // Wait, standard rules:
        // A player leading a trick determines the suit of the color played.
        // If a special card is led, there is no suit to follow (usually).
        // Let's check standard rule for leading special cards:
        // If Escape/Special is led -> next player determines suit?
        // Simplification: If first card is Suit, that is the leadColor.
        if (t.card.type === 'suit') {
            leadColor = t.card.color;
            break;
        }
    }

    // Special cards can always be played
    // Note: Some variants say you must serve suit if you have it, unless you play special.
    // Standard: You can ALWAYS play a special card.
    if (card.type !== 'suit') return true;

    // If a suit was led, and you are playing a suit card...
    if (leadColor && card.type === 'suit') {
        // If you play a different color...
        if (card.color !== leadColor) {
             // You must not have the lead color in hand
             const hasLeadSuit = player.hand.some(c => c.type === 'suit' && c.color === leadColor);
             if (hasLeadSuit) return false;
        }
    }
    
    return true;
  }

  resolveTrick() {
    // 1. Check Kraken (Destroys trick)
    const krakenIndex = this.currentTrick.findIndex(t => t.card.type === 'kraken');
    let winnerId = null;

    if (krakenIndex !== -1) {
        this.io.in(this.id).emit('notification', 'KRAKEN! Stich zerstört.');
        // No one wins the trick.
        winnerId = this.currentTrick[krakenIndex].playerId;
    } else {
        winnerId = this.determineTrickWinner(this.currentTrick);
        const winner = this.players.find(p => p.id === winnerId);
        if (winner) {
            winner.tricksWon++;
            this.io.in(this.id).emit('notification', `${winner.name} gewinnt den Stich!`);

            // Apply Loot Bonus: +20 to Loot player and +20 to Trick Winner
            this.currentTrick.forEach(t => {
                if (t.card.type === 'loot') {
                    const lootPlayer = this.players.find(p => p.id === t.playerId); // Corrected to use t.playerId
                    if (lootPlayer) lootPlayer.bonusPoints += 20;
                    winner.bonusPoints += 20;
                }
            });
        }
    }

    // Set next player
    if (winnerId) {
        this.currentPlayerIndex = this.players.findIndex(p => p.id === winnerId);
        this.lastTrickWinner = winnerId;
    } else {
        // Fallback if something went wrong, stick to current (shouldn't happen with Kraken logic above)
    }

    this.currentTrick = [];
    
    // Check Round End
    if (this.players[0].hand.length === 0) {
        this.calculateScores();
        if (this.round >= this.maxRounds) {
            this.phase = 'finished';
        } else {
            this.round++;
            this.startRound();
        }
        this.emitState(); // Emit state after round end
    } else {
        this.emitState(); // Emit state for next trick
        this.checkNextToPlay(); // Trigger next player if bot
    }
  }

  determineTrickWinner(trick) {
      // Logic:
      // Skull King > Pirate > Mermaid > Skull King (Rock Paper Scissors)
      // Hierarchy:
      // 1. Skull King (beats all except Mermaid)
      // 2. Pirate (beats all except Skull King and bigger Pirates?)
      //    Wait, Pirates count as equal? The first played wins? Standard rule: First played wins.
      // 3. Mermaid (beats all suits/black, beaten by Pirate. BUT beats Skull King).
      // 4. Black (Trump Logic)
      // 5. Suit (Lead color)
      // 6. Escape (always loses)
      
      const sk = trick.find(t => t.card.type === 'skullking');
      const mermaid = trick.find(t => t.card.type === 'mermaid');
      const pirates = trick.filter(t => t.card.type === 'pirate' || t.card.type === 'tigress');

      // Mermaid beats Skull King
      if (sk && mermaid) {
          // If both present, Mermaid wins against SK instantly?
          // Rules: Mermaid beats Skull King. (And gets bonus points).
          // Does Pirate interfere? "Pirate beats Mermaid".
          // If SK, Mermaid, AND Pirate are in trick:
          // Pirate > Mermaid > Skull King > Pirate...
          // Usually strict hierarchy:
          // If Pirate is present, Pirate wins (unless SK is there? No, SK beats Pirate).
          // SK beats Pirate. Pirate beats Mermaid. Mermaid beats SK.
          // It's a cycle.
          // If all three:
          // Pirate beats Mermaid. SK beats Pirate. Mermaid beats SK.
          // This creates a conflict loop.
          // Standard Rule: Mermaid BEATS Skull King.
          // If Mermaid AND Skull King are played, Mermaid wins (and gets +50 bonus).
          // EXCEPT if a Pirate is played? Pirate beats Mermaid.
          // So if (Mermaid + Skull King + Pirate):
          // Pirate beats Mermaid?
          // Let's implement simplified standard priority if complex cycle:
          // 1. Mermaid wins IF Skull King is present.
          // 2. Skull King wins (if no Mermaid).
          // 3. Pirate wins (if no SK).
          // Let's verify:
          // A Pirate wins against Mermaid.
          // If (P, M, SK) -> Pirate beats Mermaid? SK beats Pirate?
          // Actually standard rule: "If a Mermaid and Skull King are in the same trick, the Mermaid wins".
          // "Pirate beats Mermaid". "Skull King beats Pirate".
          // Usually resolved by play order? No.
          // Let's assume:
          // If SK is present:
          //    If Mermaid is present -> Mermaid wins.
          //    Else -> SK wins.
          // (This ignores Pirate beating Mermaid, but in SK vs P vs M scenarios, M wins over SK is the "Special" interaction).
          if (mermaid) return mermaid.playerId;
          return sk.playerId;
      }
      
      // If SK present (and no Mermaid)
      if (sk) {
          return sk.playerId;
      }
      
      // If Pirate(s) present
      if (pirates.length > 0) {
           // First Pirate wins
           return pirates[0].playerId;
      }
      
      // If Mermaid(s) present
      const mermaids = trick.filter(t => t.card.type === 'mermaid');
      if (mermaids.length > 0) {
           // First Mermaid wins
           return mermaids[0].playerId;
      }
      
      // Black (Trump)
      // Check if Black was led? No, Black is trump, so it wins over other suits unless higher black.
      // Filter all black cards played
      const blacks = trick.filter(t => t.card.type === 'suit' && t.card.color === 'black');
      if (blacks.length > 0) {
          blacks.sort((a, b) => b.card.value - a.card.value);
          return blacks[0].playerId;
      }
      
      // Lead Color
      let leadColor = null;
      for (const t of trick) {
          if (t.card.type === 'suit') {
              leadColor = t.card.color;
              break;
          }
      }
      
      if (leadColor) {
         const suitCards = trick.filter(t => t.card.type === 'suit' && t.card.color === leadColor);
         if (suitCards.length > 0) {
             suitCards.sort((a, b) => b.card.value - a.card.value);
             return suitCards[0].playerId;
         }
      }
      
      // Fallback (only escapes?): First player wins
      return trick[0].playerId;
  }

  calculateScores() {
      this.players.forEach(p => {
          let roundScore = 0;
          const diff = Math.abs(p.tricksWon - p.bid);
          
          if (p.bid === 0) {
              // Zero bid: +10 * Round or -10 * Round
              if (diff === 0) roundScore = this.round * 10;
              else roundScore = this.round * -10;
          } else {
              // Normal: +20 per trick if exact, else -10 per diff
              if (diff === 0) roundScore = p.bid * 20;
              else roundScore = diff * -10;
          }
          
          const totalRoundScore = roundScore + (p.bonusPoints || 0);
          p.score += totalRoundScore;
          p.scoresHistory.push({ round: this.round, score: totalRoundScore, total: p.score, bid: p.bid, won: p.tricksWon });
      });
  }

  emitState() {
      // Build public player state
      const publicPlayers = this.players.map(pl => ({
          id: pl.id,
          name: pl.name,
          score: pl.score,
          bid: pl.bid, // Bid is public
          tricksWon: pl.tricksWon,
          isTurn: this.players[this.currentPlayerIndex] ? this.players[this.currentPlayerIndex].id === pl.id : false,
          handCount: pl.hand.length
      }));

      this.players.forEach(p => {
          this.io.to(p.id).emit('game:state', {
              roomId: this.id,
              round: this.round,
              maxRounds: this.maxRounds,
              phase: this.phase,
              hand: p.hand,
              currentTrick: this.currentTrick,
              turnIndex: this.currentPlayerIndex,
              me: { id: p.id, bid: p.bid, score: p.score, tricksWon: p.tricksWon },
              players: publicPlayers,
              lastWinnerId: this.lastTrickWinner
          });
      });
  }
}
module.exports = Game;