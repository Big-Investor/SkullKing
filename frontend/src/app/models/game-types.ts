export interface Card {
    id: string;
    type: 'suit' | 'skullking' | 'pirate' | 'mermaid' | 'escape' | 'kraken' | 'tigress' | 'loot' | 'white_whale';
    color?: 'yellow' | 'green' | 'purple' | 'black';
    value?: number;
    pirateName?: string;
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
    phase: 'lobby' | 'bidding' | 'playing' | 'roundSummary' | 'finished' | 'pirate_action';
    hand: Card[];
    currentTrick: { playerId: string; card: Card; playedAs?: string }[];
    me: { id: string; bid: number | null; score: number; tricksWon: number; lastRoundScore?: number; bonusPoints?: number };
    players: Player[];
    lastWinnerId: string | null;
    turnIndex: number;
    pirateActionData?: any;
}
