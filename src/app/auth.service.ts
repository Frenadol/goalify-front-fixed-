import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, of, Subject, timer, Subscription, firstValueFrom } from 'rxjs'; // AÑADE firstValueFrom
import { catchError, map, switchMap, tap, delay, finalize, filter, take } from 'rxjs/operators'; // AÑADE filter, take
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { MarketItem } from './market/market-item.model';
import { environment } from '../environments/environment';

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
  showPointsOnCard?: boolean;
  showLevelOnCard?: boolean;
  cardColor?: string;
  showChallengeCategoryOnCard?: boolean;
  showChallengePointsOnCard?: boolean;
  showChallengeDatesOnCard?: boolean;
  showRecordPoints?: boolean;
  unlockedItems?: string[];
  selectedAvatarUrl?: string;
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
  puntosRecord?: number;
  nivel?: number;
  biografia?: string;
  totalHabitosCompletados?: number;
  totalDesafiosCompletados?: number;
  preferences?: BackendUserProfilePreferences;
  fechasRangosConseguidos?: { [key: string]: string };
  rangosConseguidos?: string[]; // Add this property
}

// Definición de AuthEvent
export interface AuthEvent {
  type: 'LOGIN_SUCCESS' | 'LOGOUT_SUCCESS' | 'REGISTRATION_SUCCESS' | 'USER_UPDATED' | 'TOKEN_REFRESHED' | 'AUTH_ERROR';
  payload?: any;
}

// Definición de LoginResponse (¡IMPORTANTE!)
export interface LoginResponse {
  token: string;
  user: User;
  // Puedes añadir más campos si tu backend los devuelve, como 'expiresIn', etc.
}


@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // private backendBaseUrl = 'http://51.20.183.5:8080'; // No es necesario si apiUrl ya lo incluye
  //private apiUrl = 'http://51.20.183.5:8080/api'; // URL base para los endpoints bajo /api
  private apiUrl = 'http://51.20.183.5:8080/api';
  //private apiUrl = 'http://51.20.183.5:8080/api';
  private usersApiUrl = `${this.apiUrl}/usuarios`; // Ejemplo para otros endpoints

  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;
  private readonly isBrowser: boolean;
  public readonly authEvents = new Subject<AuthEvent>();
  public isUserCurrentlyLoading: boolean = false;
  private tokenRefreshSubscription?: Subscription; // Ahora Subscription está importado


  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    // Cambiado a sessionStorage
    const storedUser = this.isBrowser ? sessionStorage.getItem('currentUser') : null;
    this.currentUserSubject = new BehaviorSubject<User | null>(storedUser ? JSON.parse(storedUser) : null);
    this.currentUser = this.currentUserSubject.asObservable(); // Esta es la propiedad correcta para el observable público

    if (this.currentUserValue) {
      this.isUserCurrentlyLoading = true;
      this.refreshCurrentUserData().subscribe({
        complete: () => this.isUserCurrentlyLoading = false,
        error: () => this.isUserCurrentlyLoading = false
      });
    }
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  public get token(): string | null {
    // Cambiado a sessionStorage
    return this.isBrowser ? sessionStorage.getItem('authToken') : null;
  }

  loginUser(credentials: any): Observable<User> {
    this.isUserCurrentlyLoading = true;
    const loginUrl = `${this.apiUrl}/auth/login`; // <--- ASÍ DEBE ESTAR
    console.log('AuthService: Intentando login a URL:', loginUrl);
    console.log('AuthService: Enviando credenciales:', JSON.stringify(credentials));

    return this.http.post<LoginResponse>(loginUrl, credentials)
      .pipe(
        map((response: LoginResponse) => {
          if (response.token && response.user) {
            console.log('Datos del usuario recibidos en login:', response.user);
            if (this.isBrowser) {
              // Cambiado a sessionStorage
              sessionStorage.setItem('authToken', response.token);
              sessionStorage.setItem('currentUser', JSON.stringify(response.user));
            }
            this.currentUserSubject.next(response.user);
            this.authEvents.next({ type: 'LOGIN_SUCCESS', payload: response.user });
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

  registerUser(userData: any): Observable<any> {
    const registerUrl = `${this.apiUrl}/auth/register`; // <--- ASÍ DEBE ESTAR
    return this.http.post<any>(registerUrl, userData).pipe(
      catchError(this.handleError)
    );
  }

  updateUserProfile(userId: string | number, profileData: Partial<User>): Observable<User> {
    const url = `${this.usersApiUrl}/${userId}`;
    return this.http.put<User>(url, profileData).pipe(
      tap(async updatedUser => { 
        if (this.currentUserSubject.value && updatedUser && this.currentUserSubject.value.id === updatedUser.id) { // Añadida comprobación de updatedUser
          await this.updateCurrentUserState(updatedUser); 
          this.authEvents.next({ type: 'USER_UPDATED', payload: this.currentUserValue }); 
        }
      }),
      catchError(this.handleError)
    );
  }

  updateUserDisplayPreferences(userId: string | number, preferencesData: BackendUserProfilePreferences): Observable<User> {
    const url = `${this.usersApiUrl}/${userId}/preferences`;
    return this.http.put<User>(url, preferencesData).pipe(
      tap(async updatedUser => { 
        if (this.currentUserSubject.value && updatedUser && this.currentUserSubject.value.id === updatedUser.id) { // Añadida comprobación de updatedUser
          await this.updateCurrentUserState(updatedUser); 
          this.authEvents.next({ type: 'USER_UPDATED', payload: this.currentUserValue }); 
        }
      }),
      catchError(this.handleError)
    );
  }

  refreshCurrentUserData(): Observable<User | null> {
    const user = this.currentUserValue;
    if (!user || !user.id) {
      return of(null);
    }
    this.isUserCurrentlyLoading = true;
    // Asumiendo que la info del usuario se obtiene de /api/usuarios/:id
    return this.http.get<User>(`${this.usersApiUrl}/${user.id}`).pipe(
      map(updatedUser => {
        // mergedUser.preferences = { ...user.preferences, ...updatedUser.preferences };
        // Asegurarse de que las preferencias también se fusionen si existen en ambos
        let mergedPreferences = { ...(user?.preferences ?? {}), ...(updatedUser?.preferences ?? {}) };
        // Si unlockedItems existe en updatedUser.preferences, usar ese. Si no, mantener el de user.preferences
        if (updatedUser.preferences && Array.isArray(updatedUser.preferences.unlockedItems)) {
            mergedPreferences.unlockedItems = updatedUser.preferences.unlockedItems;
        } else if (user?.preferences && Array.isArray(user.preferences.unlockedItems)) {
            mergedPreferences.unlockedItems = user.preferences.unlockedItems;
        }


        const finalUser = { ...user, ...updatedUser, preferences: mergedPreferences };
        
        // No llamar a updateCurrentUserState aquí para evitar bucles o doble emisión de evento.
        // Directamente actualizar el subject y localStorage.
        this.currentUserSubject.next(finalUser);
        if (this.isBrowser) {
          // Cambiado a sessionStorage
          sessionStorage.setItem('currentUser', JSON.stringify(finalUser));
        }
        this.authEvents.next({ type: 'USER_UPDATED', payload: finalUser });
        this.isUserCurrentlyLoading = false;
        return finalUser;
      }),
      catchError(error => {
        console.error('Error refreshing user data:', error);
        if (error.status === 401 || error.status === 403) {
          this.logout();
        }
        this.isUserCurrentlyLoading = false;
        return of(this.currentUserValue); // Devuelve el usuario actual si hay error para no romper la UI
      })
    );
  }

  // MODIFICADO: updateCurrentUserState ahora es async y devuelve Promise<void>
  public async updateCurrentUserState(updatedUser: User): Promise<void> {
    const currentUser = this.currentUserValue;
    let userToUpdate: User | null = null;

    // Lógica de fusión (parece correcta, la mantengo)
    if (currentUser && updatedUser && currentUser.id === updatedUser.id) {
      userToUpdate = { ...currentUser, ...updatedUser };
      if (currentUser.preferences && updatedUser.preferences) {
        userToUpdate.preferences = { ...currentUser.preferences, ...updatedUser.preferences };
      } else if (updatedUser.preferences) {
        userToUpdate.preferences = updatedUser.preferences;
      } else if (currentUser.preferences) { // Mantener las preferencias actuales si updatedUser no tiene
        userToUpdate.preferences = currentUser.preferences;
      }
    } else if (!currentUser && updatedUser) {
      userToUpdate = updatedUser;
    } else if (currentUser && updatedUser && currentUser.id !== updatedUser.id) {
      console.warn('AuthService: updateCurrentUserState llamado con un ID de usuario diferente. Ignorando actualización para el subject actual.');
      return;
    } else if (!updatedUser) {
        console.warn('AuthService: updateCurrentUserState llamado con updatedUser nulo o undefined.');
        return;
    }


    if (userToUpdate) {
      if (this.isBrowser) {
        // Cambiado a sessionStorage
        sessionStorage.setItem('currentUser', JSON.stringify(userToUpdate));
      }
      this.currentUserSubject.next(userToUpdate);
      console.log('AuthService: Estado del usuario (currentUserSubject.next) actualizado con:', userToUpdate);

      try {
        // CORRECCIÓN: Usar this.currentUser en lugar de this.currentUser$
        // y asegurar que se emita el valor correcto después de la actualización
        const emittedUser = await firstValueFrom(
          this.currentUser.pipe(
            filter(u => {
              if (!u && !userToUpdate) return true; // ambos null
              if (u && userToUpdate && u.id === userToUpdate.id) {
                // Comprobación más robusta para unlockedItems
                return JSON.stringify(u.preferences?.unlockedItems) === JSON.stringify(userToUpdate.preferences?.unlockedItems);
              }
              return false;
            }),
            take(1)
          )
        );
        console.log('AuthService: currentUser ha emitido el estado esperado después de updateCurrentUserState.', emittedUser);
      } catch (e) {
        console.warn('AuthService: Timeout o error esperando la emisión de currentUser después de updateCurrentUserState. El subject ya fue actualizado.', e);
      }
    }
    // El evento USER_UPDATED se emitirá desde el servicio que llama a updateCurrentUserState (ej. MarketService)
    // o desde updateUserProfile/updateUserDisplayPreferences DESPUÉS de que este Promise se resuelva.
  }

  logout(): void {
    if (this.isBrowser) {
      // Cambiado a sessionStorage
      sessionStorage.removeItem('authToken');
      sessionStorage.removeItem('currentUser');
      sessionStorage.removeItem('tokenExpiration'); // Si usas esto
    }
    this.currentUserSubject.next(null);
    this.authEvents.next({ type: 'LOGOUT_SUCCESS' });
    if (this.tokenRefreshSubscription) {
      this.tokenRefreshSubscription.unsubscribe();
    }
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return !!this.token && !!this.currentUserValue;
  }

  isAdmin(): boolean {
    return !!this.currentUserValue && this.currentUserValue.esAdministrador === true;
  }

  private handleError(HttpErrorResponse: any) { // El tipo debería ser HttpErrorResponse
    let errorMessage = 'Ocurrió un error desconocido.';
    if (HttpErrorResponse.error instanceof ErrorEvent) {
      errorMessage = `Error del cliente: ${HttpErrorResponse.error.message}`;
    } else {
      if (HttpErrorResponse.status === 0) {
        errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión.';
      } else if (HttpErrorResponse.error && typeof HttpErrorResponse.error === 'string' && HttpErrorResponse.error.length > 0 && HttpErrorResponse.error.length < 300) {
        errorMessage = HttpErrorResponse.error;
      } else if (HttpErrorResponse.error && HttpErrorResponse.error.message) {
        errorMessage = HttpErrorResponse.error.message;
      } else if (HttpErrorResponse.statusText && HttpErrorResponse.status !== 0) {
        errorMessage = `Error del servidor: ${HttpErrorResponse.status} ${HttpErrorResponse.statusText}`;
      }
    }
    console.error('AuthService Error:', errorMessage, HttpErrorResponse);
    return throwError(() => new Error(errorMessage));
  }

  public getAuthToken(): string | null {
    if (!this.isBrowser) return null;
    // Cambiado a sessionStorage
    return sessionStorage.getItem('authToken');
  }

  getIsUserLoading(): boolean {
    return this.isUserCurrentlyLoading;
  }

  // Añade estos métodos al AuthService
  getUserProfilePreferences(userId: number): Observable<BackendUserProfilePreferences> {
    return this.http.get<BackendUserProfilePreferences>(`${this.apiUrl}/usuarios/${userId}/preferences`);
  }

  updateUserProfilePreferences(userId: number, preferences: any): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/usuarios/${userId}/preferences`, preferences)
      .pipe(
        tap(updatedUser => {
          // Actualizar el usuario actual si es el mismo que el actualizado
          if (this.currentUserValue && this.currentUserValue.id === userId) {
            // Crear una copia para evitar cambios inesperados
            const updatedCurrentUser = { ...this.currentUserValue, ...updatedUser };
            // Actualizar el observable y el localStorage
            this.currentUserSubject.next(updatedCurrentUser);
            if (this.isBrowser) {
              // Cambiado a sessionStorage
              sessionStorage.setItem('currentUser', JSON.stringify(updatedCurrentUser));
            }
          }
        }),
        catchError(this.handleError)
      );
  }

  /**
 * Actualiza la foto de perfil del usuario actual
 * @param photoData URL de imagen o string base64 con la nueva foto de perfil
 * @returns Observable con el usuario actualizado
 */
public updateUserProfilePhoto(photoData: string): Observable<any> {
  if (!this.currentUserValue || !this.currentUserValue.id) {
    return throwError(() => new Error('No hay usuario autenticado'));
  }

  const userId = this.currentUserValue.id;
  
  // URL directa a la API sin depender de environment
  const url = `http://51.20.183.5:8080/api/usuarios/${userId}`; 
  
  // Token de autorización
  // Cambiado a sessionStorage
  const token = sessionStorage.getItem('auth_token');
  let headers = new HttpHeaders();
  if (token) {
    headers = headers.set('Authorization', `Bearer ${token}`);
  }

  // Crear un objeto con solo los campos que necesitamos actualizar
  const payload = {
    fotoPerfil: photoData,
    // Mantener los campos actuales que no queremos perder
    biografia: this.currentUserValue.biografia || '',
    nombre: this.currentUserValue.nombre || ''
  };

  console.log(`Enviando actualización de foto a: ${url}`);
  
  return this.http.put(url, payload, { headers }).pipe(
    tap(updatedUser => {
      console.log('Respuesta actualización de foto:', updatedUser);
      // Actualiza el usuario actual con la nueva foto
      const currentUser = this.currentUserValue;
      if (currentUser) {
        const updatedCurrentUser = {
          ...currentUser,
          fotoPerfil: photoData
        };
        
        this.updateCurrentUserState(updatedCurrentUser);
      }
    }),
    catchError(error => {
      console.error('Error al actualizar foto de perfil:', error);
      console.error('Estado HTTP:', error.status);
      console.error('Mensaje:', error.error || error.message);
      return throwError(() => new Error(error.message || 'Error al actualizar la foto de perfil'));
    })
  );
}

/**
 * Obtiene el token JWT almacenado localmente
 * @returns El token JWT o una cadena vacía si no existe
 */
public getToken(): string {
  // Cambiado a sessionStorage
  return sessionStorage.getItem('authToken') || '';
}

/**
 * Renueva el token JWT utilizando el refreshToken almacenado
 * @returns Un Observable con el nuevo token
 */
public refreshToken(): Observable<string> {
  // Cambiado a sessionStorage
  const refreshToken = sessionStorage.getItem('refreshToken');
  
  if (!refreshToken) {
    this.logout();
    return throwError(() => new Error('No hay refresh token disponible'));
  }
  
  return this.http.post<any>(`${this.apiUrl}/auth/refresh`, { refreshToken })
    .pipe(
      map(response => {
        // Guardar el nuevo token usando la misma clave que en el resto de la app
        // Cambiado a sessionStorage
        sessionStorage.setItem('authToken', response.token);
        if (response.refreshToken) {
          sessionStorage.setItem('refreshToken', response.refreshToken);
        }
        return response.token;
      }),
      catchError(error => {
        this.logout();
        return throwError(() => error);
      })
    );
}
}