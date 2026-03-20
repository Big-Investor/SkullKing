import { Pipe, PipeTransform } from '@angular/core';
import { Player } from '../models/game-types';

@Pipe({ name: 'w_findPlayer', standalone: true })
export class FindPlayerPipe implements PipeTransform {
  transform(players: Player[], id: string | null | undefined): Player | undefined {
    if (!id) return undefined;
    return players?.find(p => p.id === id);
  }
}

@Pipe({ name: 'w_activePlayer', standalone: true })
export class ActivePlayerPipe implements PipeTransform {
    transform(players: Player[]): Player | undefined {
        return players?.find(p => p.isTurn);
    }
}