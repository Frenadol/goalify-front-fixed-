// filepath: src/app/auth.interceptor.ts
import { Injectable, Injector } from '@angular/core'; // Importa Injector
import {
  HttpEvent,
  HttpInterceptor,
  HttpHandler,
  HttpRequest,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../auth.service'; // Mantén la importación para el tipado si quieres

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  // Elimina la inyección directa de AuthService del constructor si la tenías
  constructor(private injector: Injector) {} // Inyecta Injector

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    // Obtén AuthService de forma perezosa usando el Injector
    const authService = this.injector.get(AuthService);
    console.log('AuthInterceptor: Interceptando petición a:', req.url); // LOG

    const authToken = authService.getAuthToken();
    console.log('AuthInterceptor: Token recuperado:', authToken); // LOG

    let authReq = req;
    if (authToken) {
      authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      console.log('AuthInterceptor: Cabecera Authorization añadida:', authReq.headers.get('Authorization')); // LOG
    } else {
      console.warn('AuthInterceptor: No se encontró token de autenticación.'); // LOG
    }

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('AuthInterceptor: Error en la petición HTTP:', error); // LOG
        if (error.status === 401) {
          console.log('AuthInterceptor: Error 401, deslogueando y redirigiendo a login.'); // LOG
          // Podrías intentar refrescar el token aquí si tienes esa lógica
          // o simplemente desloguear.
          authService.logout(); // Asegúrate de que logout no cause otra circularidad
          // Considera no recargar la página aquí directamente, sino manejarlo en el componente
          // o a través de un evento para evitar problemas con el ciclo de vida de Angular.
          // window.location.reload(); // Comentado para evitar recarga abrupta
        }
        return throwError(() => error);
      })
    );
  }
}