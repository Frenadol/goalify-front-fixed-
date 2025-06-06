import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Habit, HabitClientPayload } from '../models/habit.model';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth.service';

@Injectable({
  providedIn: 'root'
})
export class HabitService {
  private apiUrl = `${environment.apiUrl}/habits`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getMyHabits(): Observable<Habit[]> {
    return this.http.get<Habit[]>(this.apiUrl).pipe( // Llama a GET http://51.20.183.5:8080/habits
      map(habits => habits.map(habit => ({
        ...habit,
        // Asumimos que el backend podría devolver 'fechaUltimaCompletacion'
        // y calculamos 'isCompletedToday' en el frontend si es necesario,
        // o el backend ya lo incluye. Por ahora, no lo añadimos aquí.
      })))
    );
  }

  getHabitById(id: number): Observable<Habit> {
    return this.http.get<Habit>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  // Modificar el método createHabit para usar authToken en lugar de token
  createHabit(habitData: HabitClientPayload): Observable<Habit> {
    // Asegurarnos de que el formato de la hora es correcto
    if (habitData.horaProgramada) {
      habitData.horaProgramada = this.formatTimeForApi(habitData.horaProgramada);
    }

    // Usar getAuthToken en lugar de getToken para ser consistente
    const token = this.authService.getAuthToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    console.log('Enviando datos al servidor:', JSON.stringify(habitData, null, 2));

    return this.http.post<Habit>(this.apiUrl, habitData, { headers })
      .pipe(
        tap(response => console.log('Respuesta del servidor:', response)),
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
      tap(() => {
        // Después de completar el hábito exitosamente,
        // le pedimos al AuthService que refresque los datos del usuario actual.
        this.authService.refreshCurrentUserData().subscribe({
          next: () => console.log('User data refreshed after habit completion.'),
          error: err => console.error('Error refreshing user data after habit completion:', err)
        });
      }),
      catchError(this.handleError)
    );
  }

  // NUEVO MÉTODO para obtener estadísticas de hábitos (para el perfil)
  getHabitStatsForUser(): Observable<{ totalCompletionsToday: number; totalOverallCompletions: number; activeHabits: number; longestStreakOverall: number }> {
    return this.http.get<{ totalCompletionsToday: number; totalOverallCompletions: number; activeHabits: number; longestStreakOverall: number }>(`${this.apiUrl}/user-stats`).pipe(
      catchError(this.handleError)
    );
  }

  getAllUserHabits(): Observable<Habit[]> {
    // Este método debe obtener los hábitos del usuario actual.
    // El endpoint GET /habits en el backend ya hace esto.
    return this.http.get<Habit[]>(this.apiUrl).pipe( // Llama a GET http://51.20.183.5:8080/habits
      map(habits => habits.map(habit => ({
        ...habit,
        // Puedes añadir transformaciones aquí si es necesario,
        // como asegurar que las fechas sean objetos Date, etc.
      })))
    );
  }


  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Ha ocurrido un error en el servidor.';
    
    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Error del lado del servidor
      if (error.status === 403) {
        errorMessage = 'No tienes permiso para realizar esta acción. Verifica tu sesión o contacta al administrador.';
        
        // Intentar renovar el token automáticamente
        console.log('Intentando renovar token...');
        // this.authService.refreshToken(); // Si tienes esta función implementada
      } else if (error.status === 400) {
        errorMessage = 'Error en los datos enviados. Por favor verifica la información.';
        if (error.error && error.error.message) {
          errorMessage += ` Detalle: ${error.error.message}`;
        }
      } else {
        errorMessage = `Error del servidor: ${error.status}. ${error.error?.message || 'Detalles no disponibles'}`;
      }
    }
    
    console.error('Error en la solicitud HTTP:', error);
    console.error('Mensaje de error:', errorMessage);
    
    return throwError(() => new Error(errorMessage));
  }

  // Reemplaza el método formatTimeForApi existente con esta versión corregida:
  private formatTimeForApi(time: string): string {
    // Asegurar que el formato sea HH:mm (sin segundos) como lo espera la API
    if (!time) return '';
    
    if (time.includes('AM') || time.includes('PM')) {
      // Convertir de formato 12h a 24h
      const [timePart, ampm] = time.split(' ');
      let [hours, minutes] = timePart.split(':').map(Number);
      
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      
      // Devolver en formato HH:mm (sin segundos)
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } else {
      // Ya está en formato 24h, asegurarnos de quitar los segundos si existen
      const parts = time.split(':');
      // Devolver solo las horas y minutos
      return `${parts[0]}:${parts[1]}`;
    }
  }
}