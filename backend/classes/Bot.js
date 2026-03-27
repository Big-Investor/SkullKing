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
            if (card.type === 'skullking') expectedTricks += 1.0;
            else if (card.type === 'pirate') expectedTricks += 1.0;
            else if (card.type === 'tigress') expectedTricks += 1.0;
            else if (card.type === 'mermaid') expectedTricks += 0.9;
            else if (card.type === 'suit' && card.color === 'black') {
                if (card.value >= 10) expectedTricks += 0.8;
                else if (card.value >= 5) expectedTricks += 0.4;
                else expectedTricks += 0.2;
            }
            else if (card.type === 'suit') {
                if (card.value >= 13) expectedTricks += 0.5;
                else if (card.value >= 10) expectedTricks += 0.2;
            }
            else if (card.type === 'escape' || card.type === 'kraken') {
                expectedTricks -= 0.2; // Decreases chance of winning, making 0 bid more viable
            }
        }

        let bid = Math.round(expectedTricks);
        if (expectedTricks < 0.5) bid = 0; // Better null-bid detection
        
        // Difficulty adjustments
        if (this.difficulty === 'easy') {
            // Random error +/- 1
            if (Math.random() > 0.5) bid += Math.floor(Math.random() * 3) - 1; 
        } else if (this.difficulty === 'hard') {
            // More conservative logic
             if (round > 5 && bid > 2) bid--;
        }

        return Math.max(0, Math.min(bid, round));
    }

    // Choose card to play
    chooseCard(currentTrick, leadSuit) {
        // 1. Determine valid cards to play (following suit)
        let validCards = [...this.hand];
        if (leadSuit) {
             const hasLead = this.hand.some(c => c.type === 'suit' && c.color === leadSuit);
             if (hasLead) {
                 validCards = this.hand.filter(c => 
                     (c.type === 'suit' && c.color === leadSuit) || 
                     c.type !== 'suit' // Specials can always be played
                 );
             }
        }

        if (this.difficulty === 'easy') {
            return validCards[Math.floor(Math.random() * validCards.length)];
        }

        // 2. Evaluate current trick
        const needToWin = this.tricksWon < this.bid;
        
        let maxTrickPower = -1;
        let hasMermaid = false;
        let hasPirate = false;
        let hasSK = false;
        
        for (const t of currentTrick) {
            let type = t.card.type;
            if (type === 'tigress') type = t.playedAs || 'pirate';
            
            if (type === 'mermaid') hasMermaid = true;
            if (type === 'pirate') hasPirate = true;
            if (type === 'skullking') hasSK = true;
            
            // For already played cards, we must respect their playedAs choice
            let cardCopy = { ...t.card, type: type }; 
            let power = this.getCardPower(cardCopy, leadSuit, true); // True since type is already resolved
            if (power > maxTrickPower) maxTrickPower = power;
        }

        // Sort our valid cards from lowest power to highest
        validCards.sort((a, b) => this.getCardPower(a, leadSuit, needToWin) - this.getCardPower(b, leadSuit, needToWin));

        if (needToWin) {
             // We WANT to win.
             if (currentTrick.length === 0) {
                 // We are leading the trick! Play our highest card to try and secure it.
                 // (Or a high suit to force out specials)
                 return validCards[validCards.length - 1];
             }

             // Find the lowest card that still beats the current highest card.
             let winningCard = validCards.find(c => {
                 let power = this.getCardPower(c, leadSuit, needToWin);
                 
                 // RPS interaction logic overrides
                 if (hasSK && !hasMermaid) return c.type === 'mermaid'; 
                 if (hasMermaid && !hasPirate && !hasSK) return c.type === 'pirate' || c.type === 'skullking' || c.type === 'tigress';
                 if (hasPirate && !hasSK) return c.type === 'skullking';
                 
                 // Standard highest power check
                 return power > maxTrickPower && maxTrickPower < 130; // 130+ means special card zone where RPS applies
             });
             
             if (winningCard) {
                 return winningCard; // Play the cheapest card that wins
             } else {
                 // We CANNOT win this trick (or it's too costly).
                 // Dump the lowest card to save high cards for later.
                 return validCards[0];
             }
        } else { 
             // We WANT to LOSE.
             if (currentTrick.length === 0) {
                 // We are leading, we want to lose, play absolute lowest.
                 return validCards[0];
             }

             // Can we safely dump a high card? (e.g. someone already played a Pirate, so our 13 is useless anyway -> throw it away!)
             let safeDumpCards = validCards.filter(c => {
                 // Card must NOT win against what's already on the table
                 if (hasSK) return c.type !== 'mermaid'; 
                 if (hasMermaid) return c.type !== 'pirate' && c.type !== 'skullking' && c.type !== 'tigress';
                 if (hasPirate) return c.type !== 'skullking';
                 
                 let power = this.getCardPower(c, leadSuit, needToWin);
                 return power < maxTrickPower;
             });
             
             if (safeDumpCards.length > 0) {
                 // Dump the highest safe card we have!
                 return safeDumpCards[safeDumpCards.length - 1];
             } else {
                 // No strictly safe dump (maybe we are first player).
                 // Just play the absolute lowest card.
                 return validCards[0];
             }
        }
    }

    getCardPower(card, leadSuit, needToWin = true) {
        if (!card) return 0;
        if (card.type === 'skullking') return 200;
        if (card.type === 'pirate') return 150;
        if (card.type === 'tigress') {
            return needToWin ? 150 : -1; // Tigress mimics pirate when wanting to win, escape otherwise
        }
        if (card.type === 'mermaid') return 130;
        
        if (card.type === 'suit') {
            if (card.color === 'black') return 100 + card.value;
            // If lead suit is provided, and this is a off-color suit (not black), it has 0 power
            if (leadSuit && card.color !== leadSuit && card.color !== 'black') {
                return 0;
            }
            return card.value; // 1 to 14
        }
        if (card.type === 'escape') return -1;
        
        // kraken, white_whale, loot handling (treat as 0 power heuristically)
        return 0; 
    }
}

module.exports = Bot;