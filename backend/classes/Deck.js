const Card = require('./Card');

class Deck {
  constructor() {
    this.cards = [];
    this.reset();
  }

  reset() {
    this.cards = [];
    const colors = ['yellow', 'green', 'purple', 'black'];

    // 1-13 for each color (Classic Skull King Rules)
    for (const color of colors) {
      for (let v = 1; v <= 13; v++) { 
        this.cards.push(new Card('suit', color, v));
      }
    }

    // Special cards
    for (let i = 0; i < 5; i++) this.cards.push(new Card('escape')); // 5 Flag Cards (Escapes)
    for (let i = 0; i < 2; i++) this.cards.push(new Card('mermaid')); // 2 Mermaids
    for (let i = 0; i < 5; i++) this.cards.push(new Card('pirate')); // 5 Pirates
    for (let i = 0; i < 2; i++) this.cards.push(new Card('loot')); // 2 Loot Cards (Beute)
    this.cards.push(new Card('skullking')); // 1 Skull King
    this.cards.push(new Card('tigress')); // 1 Tigress
    this.cards.push(new Card('kraken')); // 1 Kraken 
    
    this.shuffle();
  }

  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  deal(count) {
    return this.cards.splice(0, count);
  }
}

module.exports = Deck;
