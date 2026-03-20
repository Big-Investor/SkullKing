export interface Card {
    id: string;
    type: 'suit' | 'skullking' | 'pirate' | 'mermaid' | 'escape' | 'kraken' | 'tigress' | 'loot';
    color?: 'yellow' | 'green' | 'purple' | 'black';
    value?: number;
}

export interface Player {
    id: string;
    name: string;
    score: number;
    bid: number | null;
    tricksWon: number;
    isTurn: boolean;
    handCount: number;
}

export interface GameState {
    roomId: string;
    round: number;
    maxRounds: number;
    phase: 'lobby' | 'bidding' | 'playing' | 'finished';
    hand: Card[];
    currentTrick: { playerId: string; card: Card }[];
    turnIndex: number;
    me: {
        id: string;
        bid: number | null;
        score: number;
        tricksWon: number;
    };
    players: Player[];
    lastWinnerId: string | null;
}
