const Card = require('./Card');

const DEFAULT_DECK_RULE_SETTINGS = Object.freeze({
  enableLootCards: true,
  enableSeaMonsters: true,
  enablePirateAbilities: true
});

class Deck {
  constructor(options = {}) {
    this.cards = [];
    this.ruleSettings = {
      ...DEFAULT_DECK_RULE_SETTINGS,
      ...(options.ruleSettings && typeof options.ruleSettings === 'object' ? options.ruleSettings : {})
    };
    this.reset();
  }

  getRuleSettings(overrideOptions = {}) {
    const overrideRuleSettings = (overrideOptions.ruleSettings && typeof overrideOptions.ruleSettings === 'object')
      ? overrideOptions.ruleSettings
      : {};

    return {
      ...DEFAULT_DECK_RULE_SETTINGS,
      ...this.ruleSettings,
      ...overrideRuleSettings
    };
  }

  reset(options = {}) {
    const ruleSettings = this.getRuleSettings(options);
    this.ruleSettings = ruleSettings;
    this.cards = [];
    const colors = ['yellow', 'green', 'purple', 'black'];

    // 1-14 for each color (Classic Skull King Rules)
    for (const color of colors) {
      for (let v = 1; v <= 14; v++) { 
        this.cards.push(new Card('suit', color, v));
      }
    }

    // Special cards
    for (let i = 0; i < 5; i++) this.cards.push(new Card('escape')); // 5 Flag Cards (Escapes)
    this.cards.push(new Card('mermaid')); // 1 Mermaid (geändert von 2 auf 1)

    // 5 pirates: either named ability pirates or regular pirates without abilities.
    if (ruleSettings.enablePirateAbilities) {
      this.cards.push(new Card('pirate', null, null, 'Rosie D\'Laney'));
      this.cards.push(new Card('pirate', null, null, 'Bahij the Bandit'));
      this.cards.push(new Card('pirate', null, null, 'Rascal of Roatan'));
      this.cards.push(new Card('pirate', null, null, 'Harry the Giant'));
      this.cards.push(new Card('pirate', null, null, 'Tortuga Jack'));
    } else {
      for (let i = 0; i < 5; i++) this.cards.push(new Card('pirate'));
    }

    if (ruleSettings.enableLootCards) {
      for (let i = 0; i < 2; i++) this.cards.push(new Card('loot')); // 2 Loot Cards (Beute)
    }
    this.cards.push(new Card('skullking')); // 1 Skull King
    this.cards.push(new Card('tigress')); // 1 Tigress
    if (ruleSettings.enableSeaMonsters) {
      this.cards.push(new Card('kraken')); // 1 Kraken
      this.cards.push(new Card('white_whale')); // 1 White Whale (Weißer Wal)
    }
    
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
