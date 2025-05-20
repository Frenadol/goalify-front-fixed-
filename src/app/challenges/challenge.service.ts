import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Challenge, ChallengeFormData } from './challenge.model';
import { UserChallenge } from './user-challenge.model';

@Injectable({
  providedIn: 'root'
})
export class ChallengeService {
  private apiUrl = 'http://localhost:8080/challenges';
  private userChallengesApiUrl = 'http://localhost:8080/user-challenges';

  constructor(private http: HttpClient) { }

  // Para Admins (protegido por adminGuard en las rutas)
  createChallenge(challengeData: ChallengeFormData): Observable<Challenge> {
    return this.http.post<Challenge>(this.apiUrl, challengeData).pipe(
      catchError(this.handleError)
    );
  }

  updateChallenge(id: number, challengeData: ChallengeFormData): Observable<Challenge> {
    return this.http.put<Challenge>(`${this.apiUrl}/${id}`, challengeData).pipe(
      catchError(this.handleError)
    );
  }

  // Para obtener un desafío específico
  getChallengeById(id: number): Observable<Challenge> {
    return this.http.get<Challenge>(`${this.apiUrl}/${id}`).pipe(
      map(challenge => ({
        ...challenge,
        fechaInicio: challenge.fechaInicio ? new Date(challenge.fechaInicio) : new Date(),
        fechaFin: challenge.fechaFin ? new Date(challenge.fechaFin) : new Date()
      })),
      catchError(this.handleError)
    );
  }

  // Para obtener todos los desafíos
  getAllChallenges(): Observable<Challenge[]> {
    return this.http.get<Challenge[]>(this.apiUrl).pipe(
      map(challenges => challenges.map(challenge => ({
        ...challenge,
        fechaInicio: challenge.fechaInicio ? new Date(challenge.fechaInicio) : new Date(),
        fechaFin: challenge.fechaFin ? new Date(challenge.fechaFin) : new Date()
      }))),
      catchError(this.handleError)
    );
  }

  // --- Nuevos Métodos para Participación del Usuario ---

  /**
   * Permite al usuario autenticado unirse a un desafío específico.
   * El backend debería obtener el ID del usuario a partir del token de autenticación.
   * @param challengeId El ID del desafío al que unirse.
   * @returns Un observable con los detalles de la participación o un UserChallenge.
   */
  joinChallenge(challengeId: number): Observable<UserChallenge> { // O podría devolver void si el backend solo da un 200 OK
    // Ajusta el endpoint según tu API. Ejemplo: POST /challenges/{id}/join
    // o POST /user-challenges (enviando challengeId en el cuerpo)
    return this.http.post<UserChallenge>(`${this.apiUrl}/${challengeId}/join`, {}).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene la lista de desafíos en los que el usuario actual está participando.
   * @returns Un observable con un array de UserChallenge.
   */
  getMyJoinedChallenges(): Observable<UserChallenge[]> {
    // Ajusta el endpoint según tu API. Ejemplo: GET /user-challenges/my o GET /users/me/challenges
    return this.http.get<UserChallenge[]>(`${this.userChallengesApiUrl}/mychallenges`).pipe(
      map(userChallenges => userChallenges.map(uc => ({
        ...uc,
        fechaInscripcion: uc.fechaInscripcion ? new Date(uc.fechaInscripcion) : undefined
      }))),
      catchError(this.handleError)
    );
  }

  // NUEVO MÉTODO para abandonar un desafío
  leaveChallenge(challengeId: number): Observable<void> {
    return this.http.delete<void>(`${this.userChallengesApiUrl}/leave/${challengeId}`).pipe(
      catchError(this.handleError)
    );
  }

  deleteChallenge(challengeId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${challengeId}`).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Ocurrió un error desconocido.';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error del cliente: ${error.error.message}`;
    } else {
      if (error.status === 0) {
        errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión o que el servidor esté en línea.';
      } else if (error.status === 403) {
        errorMessage = 'No tienes permiso para realizar esta acción.';
      } else if (error.status === 404) {
        errorMessage = 'No se encontró el recurso.';
      } else if (error.error && typeof error.error === 'string' && error.error.length < 200) {
        errorMessage = error.error; // Mensaje de error simple del backend
      } else if (error.error && error.error.message) {
        errorMessage = error.error.message; // Mensaje de error estructurado del backend
      } else {
        errorMessage = `Error del servidor: ${error.status}. ${error.message || 'Inténtalo de nuevo más tarde.'}`;
      }
      console.error(
        `Backend retornó código ${error.status}, ` +
        `cuerpo del error: ${JSON.stringify(error.error)}`,
        `Mensaje final: ${errorMessage}`
      );
    }
    return throwError(() => new Error(errorMessage));
  }
}
