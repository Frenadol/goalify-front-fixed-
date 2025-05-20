import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Habit, HabitClientPayload } from '../models/habit.model'; // Usar HabitClientPayload
// import { AuthService } from '../auth.service'; // No es necesario aquí si el backend usa @AuthenticationPrincipal

@Injectable({
  providedIn: 'root'
})
export class HabitService {
  private apiUrl = 'http://localhost:8080/habits'; // URL base de tu API de hábitos

  constructor(private http: HttpClient /*, private authService: AuthService*/) {}

  getMyHabits(): Observable<Habit[]> {
    // El backend (GET /habits) debería devolver solo los hábitos del usuario autenticado.
    // El token de autenticación se envía automáticamente por el interceptor.
    return this.http.get<Habit[]>(this.apiUrl).pipe(
      catchError(this.handleError)
    );
  }

  getHabitById(id: number): Observable<Habit> {
    // El backend (GET /habits/{id}) también verifica la pertenencia al usuario.
    return this.http.get<Habit>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  createHabit(habitData: HabitClientPayload): Observable<Habit> {
    // El backend obtiene el userId del AuthenticationPrincipal.
    // No necesitamos enviar 'idUsuario' en el payload.
    return this.http.post<Habit>(this.apiUrl, habitData).pipe(
      catchError(this.handleError)
    );
  }

  updateHabit(id: number, habitData: HabitClientPayload): Observable<Habit> {
    // El backend (PUT /habits/{id}) también verifica la pertenencia al usuario.
    return this.http.put<Habit>(`${this.apiUrl}/${id}`, habitData).pipe(
      catchError(this.handleError)
    );
  }

  deleteHabit(id: number): Observable<void> {
    // El backend (DELETE /habits/{id}) también verifica la pertenencia al usuario.
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Ocurrió un error desconocido.';
    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente o de red
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // El backend devolvió un código de respuesta insatisfactorio.
      console.error(
        `Backend retornó código ${error.status}, ` +
        `cuerpo del error: ${JSON.stringify(error.error)}`);
      
      if (error.status === 400) { // Bad Request (ej. validaciones)
        if (error.error && typeof error.error === 'string') {
          errorMessage = error.error;
        } else if (error.error && error.error.message) {
          errorMessage = error.error.message;
        } else if (error.error && error.error.errors) { // Para errores de validación de Spring Boot más detallados
          const errors = error.error.errors;
          errorMessage = errors.map((e: any) => `${e.field ? e.field + ': ' : ''}${e.defaultMessage}`).join(', ');
        } else {
          errorMessage = `Error de solicitud: ${error.status}. Verifique los datos enviados.`;
        }
      } else if (error.status === 401) {
          errorMessage = 'No autorizado. Por favor, inicia sesión de nuevo.';
          // Podrías querer desloguear al usuario aquí o redirigir
      } else if (error.status === 403) {
          errorMessage = 'No tienes permiso para realizar esta acción.';
      } else if (error.status === 404) {
          errorMessage = 'Recurso no encontrado.';
      } else {
        errorMessage = `Error del servidor: ${error.status}. ${error.error?.message || error.message || 'Inténtalo de nuevo más tarde.'}`;
      }
    }
    return throwError(() => new Error(errorMessage));
  }
}