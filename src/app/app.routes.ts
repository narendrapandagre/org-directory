import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/directory/directory.component').then((m) => m.DirectoryComponent),
  },
  { path: '**', redirectTo: '' },
];
