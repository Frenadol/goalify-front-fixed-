// filepath: src/app/auth.interceptor.ts
import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor // Asegúrate que HttpInterceptor esté importado de @angular/common/http
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../auth.service';

@Injectable() // Los interceptores suelen ser Injectable
export class AuthInterceptor implements HttpInterceptor { // Exporta la CLASE

  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const authToken = this.authService.getAuthToken();

    console.log('AuthInterceptor: Interceptando petición a:', request.url);
    console.log('AuthInterceptor: Token recuperado:', authToken);

    // Solo añadir el token si existe y si la URL no es la de login/registro
    // Ajusta '/auth/' si tu URL de autenticación es diferente (en tu caso es /auth/login)
    if (authToken && !request.url.includes('/auth/')) {
      const authReq = request.clone({
        setHeaders: {
          Authorization: `Bearer ${authToken}`
        }
      });
      console.log('AuthInterceptor: Cabecera Authorization añadida:', authReq.headers.get('Authorization'));
      return next.handle(authReq);
    }

    console.log('AuthInterceptor: No se añadió token o es ruta de autenticación.');
    return next.handle(request);
  }
}