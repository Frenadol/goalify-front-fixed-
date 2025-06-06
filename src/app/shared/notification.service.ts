import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

// Interfaz para el ID compuesto de UsuarioDesafio (debe coincidir con UsuarioDesafioId.java)
export interface UserChallengeId {
  idUsuario: number;
  idDesafio: number;
}

// Interfaz para la notificación pendiente que recibimos del backend
export interface PendingNotification {
  userChallengeId: UserChallengeId;
  challengeName: string;
  assignedDate?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = 'http://51.20.183.5:8080/api/notifications'; // Ajusta si tu URL base es diferente

  constructor(private http: HttpClient) { }

  getPendingNotifications(): Observable<PendingNotification[]> {
    return this.http.get<PendingNotification[]>(`${this.apiUrl}/pending`).pipe(
      catchError(this.handleError)
    );
  }

  markNotificationsAsRead(ids: UserChallengeId[]): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/mark-as-read`, ids).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Ocurrió un error desconocido en el servicio de notificaciones.';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error del cliente: ${error.error.message}`;
    } else {
      if (error.status === 0) {
        errorMessage = 'No se pudo conectar con el servidor de notificaciones. Inténtalo más tarde.';
      } else if (error.error && error.error.message) {
        errorMessage = error.error.message;
      } else if (typeof error.error === 'string' && error.error.length > 0 && error.error.length < 300) {
        errorMessage = error.error;
      }
       else {
        errorMessage = `Error del servidor de notificaciones: ${error.status}. ${error.message || ''}`;
      }
    }
    console.error('Error en NotificationService:', errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }
}