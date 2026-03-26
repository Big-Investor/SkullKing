export interface Card {
    id: string;
    type: 'suit' | 'skullking' | 'pirate' | 'mermaid' | 'escape' | 'kraken' | 'tigress' | 'loot' | 'white_whale';
    color?: 'yellow' | 'green' | 'purple' | 'black';
    value?: number;
}

export interface Player {
    id: string;
    name: string;
    score: number;
    lastRoundScore?: number;
    bid: number | null;
    tricksWon: number;
    isTurn: boolean;
    handCount: number;
}

export interface GameState {
    roomId: string;
    round: number;
    maxRounds: number;
    phase: 'lobby' | 'bidding' | 'playing' | 'roundSummary' | 'finished';
    hand: Card[];
    currentTrick: { playerId: string; card: Card; playedAs?: string }[];
    me: { id: string; bid: number | null; score: number; tricksWon: number; lastRoundScore?: number };
    players: Player[];
    lastWinnerId: string | null;
    turnIndex: number;
}
