import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Habit, HabitClientPayload } from '../models/habit.model';

@Injectable({
  providedIn: 'root'
})
export class HabitService {
  private apiUrl = 'http://localhost:8080/habits';

  constructor(private http: HttpClient) {}

  getMyHabits(): Observable<Habit[]> {
    return this.http.get<Habit[]>(this.apiUrl).pipe(
      map(habits => habits.map(habit => ({
        ...habit,
        // Asumimos que el backend podría devolver 'fechaUltimaCompletacion'
        // y calculamos 'isCompletedToday' en el frontend si es necesario,
        // o el backend ya lo incluye. Por ahora, no lo añadimos aquí.
      }))),
      catchError(this.handleError)
    );
  }

  getHabitById(id: number): Observable<Habit> {
    return this.http.get<Habit>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  createHabit(habitData: HabitClientPayload): Observable<Habit> {
    return this.http.post<Habit>(this.apiUrl, habitData).pipe(
      catchError(this.handleError)
    );
  }

  updateHabit(id: number, habitData: HabitClientPayload): Observable<Habit> {
    return this.http.put<Habit>(`${this.apiUrl}/${id}`, habitData).pipe(
      catchError(this.handleError)
    );
  }

  deleteHabit(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  // NUEVO MÉTODO para completar un hábito
  completeHabit(habitId: number): Observable<Habit> {
    // El backend debería manejar la lógica de si ya se completó hoy,
    // actualizar puntos, rachas, etc.
    // Devuelve el hábito actualizado.
    return this.http.post<Habit>(`${this.apiUrl}/${habitId}/complete`, {}).pipe(
      catchError(this.handleError)
    );
  }

  // NUEVO MÉTODO para obtener estadísticas de hábitos (para el perfil)
  getHabitStatsForUser(): Observable<{ totalCompletionsToday: number; totalOverallCompletions: number; activeHabits: number; longestStreakOverall: number }> {
    return this.http.get<{ totalCompletionsToday: number; totalOverallCompletions: number; activeHabits: number; longestStreakOverall: number }>(`${this.apiUrl}/user-stats`).pipe(
      catchError(this.handleError)
    );
  }


  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Ocurrió un error desconocido en el servicio de hábitos.';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error del cliente: ${error.error.message}`;
    } else {
      if (error.status === 0) {
        errorMessage = 'No se pudo conectar con el servidor de hábitos.';
      } else if (error.error && error.error.message) {
        errorMessage = error.error.message;
      } else if (error.error && typeof error.error === 'string' && error.error.length < 300) {
        errorMessage = error.error;
      } else {
        errorMessage = `Error del servidor de hábitos: ${error.status}. ${error.message || ''}`;
      }
    }
    console.error('Error en HabitService:', errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }
}