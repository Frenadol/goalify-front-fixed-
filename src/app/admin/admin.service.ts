import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { User } from '../auth.service'; // Asumiendo que User está aquí

// Interfaz para los datos del formulario del desafío que se envían al backend
// Asegúrate de que coincida con ChallengeFormDataDTO del backend
export interface FrontendChallengeFormData {
  nombre: string;
  descripcion?: string;
  puntosRecompensa: number;
  fechaInicio: string | null; // Formato YYYY-MM-DD
  fechaFin: string | null;    // Formato YYYY-MM-DD
  estado: string;
  tipo: string;
  categoria: string;
  imageUrl?: string; // Opcional
}

// Interfaz para la respuesta de asignación aleatoria (ya la deberías tener)
export interface RandomAssignmentResponse {
  success: boolean;
  message: string;
  assignedUserName?: string;
  assignedChallengeName?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = 'http://localhost:8080/api/admin';

  constructor(private http: HttpClient) { }

  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users`).pipe(
      catchError(this.handleError)
    );
  }

  // Asumo que tienes un método para obtener detalles de un usuario si lo usas en user-management
  getUserDetails(userId: number | string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/${userId}`).pipe(
      catchError(this.handleError)
    );
  }

  toggleAdminStatus(userId: number | string): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/users/${userId}/toggle-admin-status`, {}).pipe(
      catchError(this.handleError)
    );
  }

  deleteUser(userId: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/users/${userId}`).pipe(
      catchError(this.handleError)
    );
  }

  // Método existente para asignar un desafío ALEATORIO EXISTENTE a un usuario ALEATORIO
  assignRandomChallengeToRandomUser(): Observable<RandomAssignmentResponse> {
    return this.http.post<RandomAssignmentResponse>(`${this.apiUrl}/challenges/assign-random`, {}).pipe(
      catchError(this.handleError)
    );
  }

  // NUEVO MÉTODO: Crear un desafío y asignarlo a un usuario aleatorio
  createAndAssignRandomChallenge(challengeData: FrontendChallengeFormData): Observable<RandomAssignmentResponse> {
    return this.http.post<RandomAssignmentResponse>(`${this.apiUrl}/challenges/create-and-assign-random`, challengeData).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Ocurrió un error desconocido.';
    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // El backend retornó un código de error
      if (error.status === 0) {
        errorMessage = 'No se pudo conectar con el servidor. Inténtalo más tarde.';
      } else if (error.error && typeof error.error.message === 'string') {
        errorMessage = error.error.message;
      } else if (error.error && typeof error.error === 'string') { // Para mensajes de error directos del backend
        errorMessage = error.error;
      }
      else {
        errorMessage = `Error ${error.status}: ${error.message}`;
      }
    }
    console.error('Error en AdminService:', errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }
}