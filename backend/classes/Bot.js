const Player = require('./Player');

class Bot extends Player {
    constructor(id, name, difficulty) {
        super(id, name);
        this.isBot = true;
        this.difficulty = difficulty; // 'easy', 'medium', 'hard'
        this.hand = [];
    }
  
    // Determine how many tricks to bid
    calculateBid(round) {
        // Count potential winners
        let expectedTricks = 0;
        
        // Analyze hand
        for (const card of this.hand) {
            if (card.type === 'skullking') expectedTricks += 1;
            else if (card.type === 'pirate') expectedTricks += 1;
            else if (card.type === 'tigress') expectedTricks += 0.9;
            else if (card.type === 'mermaid') expectedTricks += 0.8;
            else if (card.color === 'black') expectedTricks += 0.6; // High cards
            else if (card.value >= 12) expectedTricks += 0.5;
        }

        let bid = Math.round(expectedTricks);
        
        // Difficulty adjustments
        if (this.difficulty === 'easy') {
            // Random error +/- 1
            bid += Math.floor(Math.random() * 3) - 1; 
        } else if (this.difficulty === 'hard') {
            // More conservative
             if (round > 5 && bid > 2) bid--;
        }

        return Math.max(0, Math.min(bid, round));
    }

    // Choose card to play
    chooseCard(currentTrick, leadSuit) {
        // Get valid cards
        let validCards = this.hand;
        if (leadSuit) {
             const hasLead = this.hand.some(c => c.type === 'suit' && c.color === leadSuit);
             if (hasLead) {
                 validCards = this.hand.filter(c => 
                     (c.type === 'suit' && c.color === leadSuit) || 
                     c.type !== 'suit' // Specials can always be played (except specific rule variants)
                 );
             }
        }

        // Strategy
        if (this.difficulty === 'easy') {
            return validCards[Math.floor(Math.random() * validCards.length)];
        }

        // Medium/Hard: Try to match bid
        const needToWin = this.tricksWon < this.bid;
        
        // Sort by power
        validCards.sort((a, b) => this.getCardPower(a) - this.getCardPower(b));

        if (needToWin) {
             // Play strongest card
             return validCards[validCards.length - 1];
        } else {
             // Play weakest card (dump)
             return validCards[0];
        }
    }

    getCardPower(card) {
        if (card.type === 'skullking') return 100;
        if (card.type === 'pirate') return 90;
        if (card.type === 'tigress') return 89;
        if (card.type === 'mermaid') return 80;
        if (card.type === 'suit' && card.color === 'black') return 50 + (card.value || 0);
        if (card.type === 'suit') return (card.value || 0);
        return 0; // Escape/Kraken treated as low for now
    }
}

module.exports = Bot;