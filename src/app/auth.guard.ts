// filepath: src/app/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service'; // Asegúrate que esta ruta sea correcta

export const AuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  } else {
    console.warn('AuthGuard: Acceso denegado. Usuario no autenticado.');
    router.navigate(['/login']); // O a '/home' si prefieres
    return false;
  }
};