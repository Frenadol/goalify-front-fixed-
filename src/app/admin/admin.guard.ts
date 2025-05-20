import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth.service'; // Esta ruta asume que auth.service.ts está en src/app/

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated() && authService.isAdmin()) {
    return true;
  } else {
    // Si no es admin (o no está logueado), redirige a una página adecuada
    console.warn('AdminGuard: Acceso denegado. Usuario no es administrador o no está autenticado.');
    router.navigate(['/welcome']); // O a '/login' o '/home' si prefieres
    return false;
  }
};