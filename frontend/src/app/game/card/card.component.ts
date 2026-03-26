import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Card } from '../../models/game-types';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss']
})
export class CardComponent {
  @Input() card!: Card;
  @Input() playedAs?: string;
  @Input() selectable: boolean = false;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  
  hasImage = false;

  get cardClass(): string {
    if (!this.card) return 'card-back';
    
    let cls = `card-${this.size} `;
    if (this.card.type === 'suit') {
      cls += (this.card.color || '');
    } else {
      cls += this.card.type;
    }

    if (this.playedAs) {
        cls += ` as-${this.playedAs}`;
    }
    
    if (this.selectable) cls += ' selectable';
    return cls;
  }

  get displayValue(): string {
    if (!this.card) return '';
    if (this.card.type === 'suit') {
       return this.card.value != null ? this.card.value.toString() : '';
    }
    return '';
  }

  get icon(): string {
    if (!this.card) return '🏴‍☠️';
    
    if (this.card.type === 'tigress') {
        if (this.playedAs === 'pirate') return '☠️';
        if (this.playedAs === 'escape') return '🏳️';
    }

    if (this.card.type === 'suit') {
      switch (this.card.color) {
        case 'green': return '🦜';
        case 'yellow': return '💰';
        case 'purple': return '🗺️';
        case 'black': return '💀';
        default: return '';
      }
    }
    switch (this.card.type) {
      case 'skullking': return '👑'; 
      case 'pirate': return '⚔️';
      case 'mermaid': return '🧜‍♀️';
      case 'tigress': return '🐯';
      case 'kraken': return '🦑';
      case 'white_whale': return '🐋';
      case 'loot': return '💎';
      case 'escape': return '🏳️';
      default: return '';
    }
  }

  get imagePath(): string {
    if (!this.card) return 'assets/cards/back.png';
    if (this.card.type === 'suit') {
        return `assets/cards/${this.card.color}-${this.card.value}.png`;
    }
    return `assets/cards/${this.card.type}.png`;
  }

  get fallbackIcon(): string {
     return this.icon;
  }
}