import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, finalize, map, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

// Interfaz para las preferencias de perfil tal como vienen/van al backend
export interface BackendUserProfilePreferences {
  themeColor?: string;
  showBio?: boolean;
  showHabitStats?: boolean;
  showCurrentChallenges?: boolean;
  showCompletedChallenges?: boolean;
  cardBackgroundColor?: string;
  cardTextColor?: string;
  showEmailOnCard?: boolean;
  showJoinDateOnCard?: boolean;
  showPointsOnCard?: boolean; // Para Puntos Actuales
  showLevelOnCard?: boolean;
  cardColor?: string;
  showChallengeCategoryOnCard?: boolean;
  showChallengePointsOnCard?: boolean;
  showChallengeDatesOnCard?: boolean;
  showRecordPoints?: boolean; // <<< NUEVA PREFERENCIA AÑADIDA AQUÍ
}

// Interfaz para el Usuario
export interface User {
  id?: number | string;
  nombre: string;
  email?: string;
  fotoPerfil?: string | null;
  esAdministrador?: boolean;
  rango?: string;
  fechaRegistro?: string | Date;
  ultimaActualizacion?: string | Date;
  fechaUltimoIngreso?: string | Date;
  puntosTotales?: number;
  puntosTotalesHistoricos?: number;
  puntosRecord?: number; // <<< NUEVO CAMPO AÑADIDO AQUÍ
  nivel?: number;  biografia?: string;
  totalHabitosCompletados?: number;
  totalDesafiosCompletados?: number;
  preferences?: BackendUserProfilePreferences;
  fechasRangosConseguidos?: { [key: string]: string };}

// Interfaz para la RESPUESTA DEL LOGIN que coincide con LoginResponseDTO.java
export interface LoginResponse {
  token: string;
  user: User; // Asegúrate que esta 'User' coincida con la interfaz User de arriba
}


@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8080'; // URL base de tu API
  private usersApiUrl = `${this.apiUrl}/users`; // URL específica para usuarios
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;
  private isBrowser: boolean;
  public isUserCurrentlyLoading: boolean = false;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) platformId: Object,
    private router: Router
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    let storedUser = null;
    if (this.isBrowser) {
      const userJson = localStorage.getItem('currentUser');
      if (userJson) {
        try {
          storedUser = JSON.parse(userJson);
        } catch (e) {
          console.error('Error al parsear usuario de localStorage', e);
          localStorage.removeItem('currentUser');
        }
      }
    }
    this.currentUserSubject = new BehaviorSubject<User | null>(storedUser);
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  public getIsUserLoading(): boolean {
    return this.isUserCurrentlyLoading;
  }

  loginUser(credentials: any): Observable<User> {
    this.isUserCurrentlyLoading = true;
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, credentials)
      .pipe(
        map((response: LoginResponse) => {
          if (response.token && response.user) {
            if (this.isBrowser) {
              localStorage.setItem('authToken', response.token);
              localStorage.setItem('currentUser', JSON.stringify(response.user));
            }
            this.currentUserSubject.next(response.user);
            console.log('AuthService: Login exitoso, usuario actualizado:', response.user);
            return response.user;
          } else {
            throw new Error('Respuesta de login inválida del servidor.');
          }
        }),
        catchError(this.handleError),
        finalize(() => {
          this.isUserCurrentlyLoading = false;
        })
      );
  }

  updateUserProfile(userId: string | number, profileData: Partial<User>): Observable<User> { // Este es para datos generales del perfil
    const url = `${this.usersApiUrl}/${userId}`;
    return this.http.put<User>(url, profileData).pipe(
      tap(updatedUser => {
        // Actualizar el usuario actual si el ID coincide
        if (this.currentUserSubject.value && this.currentUserSubject.value.id === updatedUser.id) {
          this.updateCurrentUserState(updatedUser);
        }
      }),
      catchError(this.handleError)
    );
  }

  // NUEVO MÉTODO para actualizar las preferencias de visualización del perfil
  updateUserDisplayPreferences(userId: string | number, preferencesData: BackendUserProfilePreferences): Observable<User> {
    const url = `${this.usersApiUrl}/${userId}/preferences`;
    return this.http.put<User>(url, preferencesData).pipe(
      tap(updatedUser => {
        // Actualizar el usuario actual si el ID coincide
        if (this.currentUserSubject.value && this.currentUserSubject.value.id === updatedUser.id) {
          this.updateCurrentUserState(updatedUser); // Esto actualizará el BehaviorSubject y notificará a los suscriptores
        }
      }),
      catchError(this.handleError)
    );
  }

  // Método para refrescar los datos del usuario actual desde el backend
  refreshCurrentUserData(): Observable<User | null> {
    const token = this.getAuthToken(); // Verificar si hay token
    if (!token) {
      // No hay token, no se puede llamar a /me o el usuario no está autenticado
      console.warn('AuthService: No hay token, no se puede refrescar datos del usuario.');
      return of(null); 
    }

    // Utilizar el endpoint /users/me si está disponible en el backend
    const fetchUrl = `${this.apiUrl}/users/me`; 

    this.isUserCurrentlyLoading = true;
    return this.http.get<User>(fetchUrl).pipe(
      tap(refreshedUser => {
        if (this.isBrowser) {
          localStorage.setItem('currentUser', JSON.stringify(refreshedUser));
        }
        this.currentUserSubject.next(refreshedUser);
        console.log('AuthService: Datos del usuario refrescados desde /users/me:', refreshedUser);
      }),
      catchError(err => {
        console.error('AuthService: Error al refrescar datos del usuario desde /users/me:', err);
        // Si falla (ej. token inválido, 401), podrías desloguear al usuario
        if (err.status === 401 || err.status === 403) {
          this.logout(); // Desloguear si el token ya no es válido o no tiene permisos
          return of(null);
        }
        // Para otros errores, devuelve el usuario actual para no romper la UI drásticamente
        return of(this.currentUserValue); 
      }),
      finalize(() => {
        this.isUserCurrentlyLoading = false;
      })
    );
  }

  // Método para actualizar el estado del usuario localmente si una operación devuelve el usuario actualizado
  public updateCurrentUserState(updatedUser: User): void {
    const currentUser = this.currentUserValue;
    // Solo actualiza si el ID coincide, para evitar sobrescribir con datos de otro usuario
    // si por error se llamara con un usuario incorrecto.
    if (currentUser && currentUser.id === updatedUser.id) {
      if (this.isBrowser) {
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      }
      this.currentUserSubject.next(updatedUser);
      console.log('AuthService: Estado del usuario actualizado localmente con nuevos datos:', updatedUser);
    } else if (!currentUser && updatedUser) { // Caso donde no había usuario y ahora sí (ej. después de login)
        if (this.isBrowser) {
          localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        }
        this.currentUserSubject.next(updatedUser);
    }
  }


  registerUser(userData: any): Observable<any> {
    // El endpoint de registro podría no devolver el token/usuario directamente,
    // sino un mensaje de éxito. El usuario luego haría login.
    return this.http.post<any>(`${this.apiUrl}/auth/register`, userData).pipe(
      catchError(this.handleError)
    );
  }

  logout(): void {
    if (this.isBrowser) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUser');
    }
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    if (!this.isBrowser) return false;
    const token = localStorage.getItem('authToken');
    // Aquí podrías añadir lógica para verificar la expiración del token si lo decodificas
    return !!token;
  }

  isAdmin(): boolean {
    const user = this.currentUserValue;
    return !!user && !!user.esAdministrador;
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Ocurrió un error desconocido.';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error del cliente: ${error.error.message}`;
    } else {
      if (error.status === 0) {
        errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión.';
      } else if (error.error && typeof error.error === 'string' && error.error.length > 0 && error.error.length < 300) {
        // Si el backend envía un mensaje de error simple como string
        errorMessage = error.error;
      } else if (error.error && error.error.message) {
        // Si el backend envía un objeto de error con una propiedad 'message'
        errorMessage = error.error.message;
      } else if (error.statusText && error.status !== 0) {
        errorMessage = `Error del servidor: ${error.status} ${error.statusText}`;
      }
    }
    console.error('AuthService Error:', errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }

  public getAuthToken(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem('authToken');
  }

  // getUserById ya no es necesario aquí si refreshCurrentUserData usa un endpoint /me o el ID del currentUser
  // Si lo necesitas para otros propósitos, mantenlo.
  // getUserById(userId: string | number): Observable<User> {
  //   const url = `${this.apiUrl}/users/${userId}`;
  //   return this.http.get<User>(url).pipe(catchError(this.handleError));
  // }
}