import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Challenge, ChallengeFormData } from './challenge.model';
import { UserChallenge } from './user-challenge.model'; // Asegúrate que esta importación esté

@Injectable({
  providedIn: 'root'
})
export class ChallengeService {
  private apiUrl = 'http://localhost:8080/challenges';
  private userChallengesApiUrl = 'http://localhost:8080/user-challenges'; // URL para operaciones de UsuarioDesafio

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
    // Este endpoint debe existir en tu UserChallengeController y devolver los desafíos del usuario autenticado
    return this.http.get<UserChallenge[]>(`${this.userChallengesApiUrl}/mychallenges`).pipe(
      catchError(this.handleError)
    );
  }

  // NUEVO MÉTODO para abandonar un desafío
  leaveChallenge(challengeId: number): Observable<void> {
    // Este endpoint debe existir en tu UserChallengeController
    return this.http.delete<void>(`${this.userChallengesApiUrl}/leave/${challengeId}`).pipe(
      catchError(this.handleError)
    );
  }

  // --- NUEVO MÉTODO PARA COMPLETAR UN DESAFÍO ---
  /**
   * Marca un desafío como completado por el usuario actual.
   * @param challengeId El ID del desafío que el usuario ha completado.
   * @returns Un observable con el UserChallenge actualizado o un mensaje de éxito.
   */
  completeUserChallenge(challengeId: number): Observable<UserChallenge> { // O el tipo de respuesta que devuelva tu backend
    // El endpoint podría ser algo como: POST /user-challenges/{challengeId}/complete
    // El backend se encargará de identificar al usuario a través del token JWT.
    return this.http.post<UserChallenge>(`${this.userChallengesApiUrl}/${challengeId}/complete`, {}).pipe(
      catchError(this.handleError)
    );
  }
  // --- FIN DEL NUEVO MÉTODO ---

  // NUEVO MÉTODO para obtener desafíos completados por el usuario
  getCompletedUserChallenges(): Observable<UserChallenge[]> {
    return this.http.get<UserChallenge[]>(`${this.userChallengesApiUrl}/completed`).pipe(
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
        errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.';
      } else if (error.error && typeof error.error === 'string' && error.error.length > 0 && error.error.length < 300) {
        errorMessage = error.error;
      } else if (error.error && error.error.message) {
        errorMessage = error.error.message;
      } else {
        errorMessage = `Error del servidor: ${error.status}. ${error.message || 'Por favor, contacta al soporte.'}`;
      }
    }
    console.error('Error en ChallengeService:', errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }
}
