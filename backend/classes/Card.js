class Card {
    constructor(type, color, value, pirateName = null) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.type = type;
        this.color = color;
        this.value = value;
        this.pirateName = pirateName;
    }
}

module.exports = Card;

