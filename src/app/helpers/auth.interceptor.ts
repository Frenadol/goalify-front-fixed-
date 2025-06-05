// filepath: src/app/auth.interceptor.ts
import { Injectable, Injector } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
  HttpResponse
} from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private injector: Injector) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    // Obtén AuthService de forma perezosa usando el Injector
    const authService = this.injector.get(AuthService);
    const authToken = authService.getAuthToken();
    
    console.log(`AuthInterceptor procesando: ${req.url}, Token disponible: ${!!authToken}`);
    
    // URLs públicas que no requieren autenticación
    const publicUrls = [
      '/api/login', 
      '/api/register', 
      '/api/public'
    ];
    
    // Comprueba si es una URL pública
    const isPublicUrl = publicUrls.some(url => req.url.includes(url));
    
    if (authToken) {
      const authReq = req.clone({
        headers: req.headers.set('Authorization', `Bearer ${authToken}`)
      });
      console.log(`AuthInterceptor: Añadiendo token a ${req.url}`);
      return next.handle(authReq).pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 401 || error.status === 403) {
            console.warn(`AuthInterceptor: Error ${error.status} en ${req.url}`, error);
            // Si es un error de compras, devolvemos array vacío
            if (req.url.includes('mis-compras')) {
              return of(new HttpResponse<any>({ status: 200, body: [] }));
            }
          }
          return throwError(() => error);
        })
      );
    } else if (isPublicUrl) {
      return next.handle(req);
    } else {
      console.warn(`AuthInterceptor: Petición sin token a ${req.url}`);
      
      if (req.url.includes('mis-compras') || req.url.includes('articulos-tienda')) {
        console.log(`AuthInterceptor: Devolviendo respuesta vacía simulada para ${req.url}`);
        return of(new HttpResponse({ 
          status: 200, 
          body: [] 
        })) as Observable<HttpEvent<any>>;
      }
      
      return next.handle(req);
    }
  }
}