import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

// Define la interfaz User aquí o impórtala si está en otro archivo
export interface User {
  id?: number | string;
  name: string;
  email?: string;
  avatarUrl?: string;
  esAdministrador?: boolean;
  rango?: string;
  fechaRegistro?: string | Date;
  ultimaActualizacion?: string | Date;
  fechaUltimoIngreso?: string | Date;
  puntosTotales?: number;
  nivel?: number;
  biografia?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8080'; // URL base de tu API
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;
  private isBrowser: boolean;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) platformId: Object,
    private router: Router
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    let storedUser = null;
    if (this.isBrowser) {
      // CAMBIO: Leer de sessionStorage
      const userJson = sessionStorage.getItem('currentUser');
      if (userJson) {
        try {
          storedUser = JSON.parse(userJson);
        } catch (e) {
          console.error('Error al parsear currentUser de sessionStorage', e);
          sessionStorage.removeItem('currentUser'); // Limpiar si está corrupto
          sessionStorage.removeItem('authToken');
        }
      }
    }
    this.currentUserSubject = new BehaviorSubject<User | null>(storedUser);
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  registerUser(userData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/register`, userData).pipe(
      tap(response => {
        console.log('Respuesta del registro:', response);
      }),
      catchError(this.handleError)
    );
  }

  loginUser(credentials: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/login`, credentials).pipe(
      tap(response => {
        console.log('Respuesta completa del login:', response);
        if (response && response.token && response.user) {
          if (this.isBrowser) {
            // CAMBIO: Guardar en sessionStorage
            sessionStorage.setItem('authToken', response.token);
            const userToStore: User = {
              id: response.user.id,
              name: response.user.nombre,
              email: response.user.email,
              avatarUrl: response.user.fotoPerfil,
              esAdministrador: response.user.esAdministrador,
              rango: response.user.rango
            };
            sessionStorage.setItem('currentUser', JSON.stringify(userToStore));
            this.currentUserSubject.next(userToStore);
            console.log('Usuario y token guardados en sessionStorage.');
          }
        } else {
          console.error('Respuesta de login incompleta:', response);
          // Considera lanzar un error o manejarlo de forma que el usuario sepa que algo falló
          // throw new Error('Respuesta de autenticación inválida del servidor.');
        }
      }),
      catchError(this.handleError)
    );
  }

  logout(): void {
    if (this.isBrowser) {
      // CAMBIO: Remover de sessionStorage
      sessionStorage.removeItem('authToken');
      sessionStorage.removeItem('currentUser');
    }
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']); // O a '/home' si prefieres
  }

  isAuthenticated(): boolean {
    if (!this.isBrowser) {
      return false;
    }
    // CAMBIO: Leer de sessionStorage
    const token = sessionStorage.getItem('authToken');
    return !!token;
  }

  isAdmin(): boolean {
    const user = this.currentUserValue;
    return !!user && !!user.esAdministrador;
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Ocurrió un error desconocido.';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      if (error.status === 0) {
        errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión o que el servidor esté en línea.';
      } else if (error.error && typeof error.error === 'string' && error.error.length < 200) {
        errorMessage = error.error;
      } else if (error.error && error.error.message) {
        errorMessage = error.error.message;
      } else {
        errorMessage = `Error del servidor: ${error.status}. ${error.message || 'Inténtalo de nuevo más tarde.'}`;
      }
    }
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  public getAuthToken(): string | null {
    if (this.isBrowser) {
      // CAMBIO: Leer de sessionStorage
      return sessionStorage.getItem('authToken');
    }
    return null;
  }
}