import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { StatisticEntry } from './statistics/statistic.model'; // Ajusta la ruta si es necesario

@Injectable({
  providedIn: 'root'
})
export class StatisticsService {
  private apiUrl = 'http://localhost:8080/statistics'; // URL base de tu API de estadísticas

  constructor(private http: HttpClient) { }

  /**
   * Obtiene las entradas de estadísticas para el usuario actualmente autenticado.
   */
  getMyStatistics(): Observable<StatisticEntry[]> {
    return this.http.get<StatisticEntry[]>(`${this.apiUrl}/user/me`).pipe(
      map(entries => {
        // Si entries es null o undefined, devuelve un array vacío para prevenir el error .map
        if (entries === null || entries === undefined) {
          console.warn('StatisticsService: getMyStatistics received null or undefined entries from backend. Returning empty array.');
          return [];
        }
        // Si entries es un array (incluso vacío), procede con el mapeo
        return entries.map(entry => ({
          ...entry,
          fecha: new Date(entry.fecha) // Convertir la fecha string a objeto Date
        }));
      }),
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Ocurrió un error desconocido en el servicio de estadísticas.';
    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error del cliente: ${error.error.message}`;
    } else {
      // Error del lado del servidor
      if (error.status === 0) {
        errorMessage = 'No se pudo conectar con el servidor de estadísticas. Inténtalo más tarde.';
      } else if (error.status === 401) {
        errorMessage = 'No autorizado. Por favor, inicia sesión de nuevo.';
      } else if (error.status === 204) { // No Content
        errorMessage = 'No hay estadísticas para mostrar.'; 
        // Para 204, el componente espera un array vacío, así que no relanzamos el error aquí directamente
        // sino que el map anterior ya debería haber devuelto [] si el cuerpo es null/undefined.
        // Si el backend devuelve 204, HttpClient puede tratarlo como error si espera JSON.
        // El componente manejará el array vacío.
        return throwError(() => new Error(errorMessage)); 
      }
       else if (error.error && typeof error.error === 'string' && error.error.length > 0 && error.error.length < 300) {
        errorMessage = error.error;
      }
      else {
        // Construye el mensaje de error a partir del error de HTTP si es posible
        const serverErrorMessage = typeof error.error === 'string' ? error.error : (error.error?.message || error.message);
        errorMessage = `Error del servidor: ${error.status}. ${serverErrorMessage || 'Por favor, contacta al administrador.'}`;
      }
    }
    console.error('Error en StatisticsService:', errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }
}