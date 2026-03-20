class Player {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.hand = [];
    this.bid = null;
    this.tricksWon = 0;
    this.score = 0;
    this.bonusPoints = 0;
    this.scoresHistory = []; 
  }

  resetRound() {
    this.hand = [];
    this.bid = null;
    this.tricksWon = 0;
    this.bonusPoints = 0;
  }
}

module.exports = Player;