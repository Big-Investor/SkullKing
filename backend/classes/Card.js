//Klasse Card
//Push
class Card {
    constructor(type, color, value) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.type = type;
        this.color = color;
        this.value = value;
    }
}

module.exports = Card;

