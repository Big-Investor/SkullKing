import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'game/:id',
    loadComponent: () => import('./game/game.component').then((m) => m.GameComponent),
  },
  { path: '**', redirectTo: '' },
];
