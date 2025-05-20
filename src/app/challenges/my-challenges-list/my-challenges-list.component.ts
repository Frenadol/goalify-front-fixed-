import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChallengeService } from '../challenge.service';
import { Challenge } from '../challenge.model';
import { UserChallenge } from '../user-challenge.model';
import { ChallengeCardComponent } from '../challenge-card/challenge-card.component'; // Reutilizamos la tarjeta
import { forkJoin, Observable, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router'; // Para el enlace de "Explorar desafíos"
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar'; // Para notificaciones

@Component({
  selector: 'app-my-challenges-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ChallengeCardComponent,
    MatProgressSpinnerModule,
    MatIconModule,
    MatSnackBarModule // Añadir MatSnackBarModule
  ],
  templateUrl: './my-challenges-list.component.html',
  styleUrls: ['./my-challenges-list.component.css']
})
export class MyChallengesListComponent implements OnInit {
  userJoinedChallengesDetails: Challenge[] = [];
  isLoading = true;
  errorMessage: string | null = null;

  constructor(
    private challengeService: ChallengeService,
    private snackBar: MatSnackBar // Inyectar MatSnackBar
  ) { }

  ngOnInit(): void {
    this.loadUserJoinedChallenges();
  }

  loadUserJoinedChallenges(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.challengeService.getMyJoinedChallenges().pipe(
      switchMap((userChallenges: UserChallenge[]) => {
        if (userChallenges.length === 0) {
          this.userJoinedChallengesDetails = [];
          return of([]);
        }
        const challengeDetailObservables: Observable<Challenge | null>[] = userChallenges.map(uc =>
          this.challengeService.getChallengeById(uc.desafioId).pipe(
            catchError(err => {
              console.error(`Error al cargar detalles del desafío ${uc.desafioId}:`, err);
              return of(null); // Retornar null si falla la carga de un desafío
            })
          )
        );
        return forkJoin(challengeDetailObservables);
      }),
      map(challengeDetailsArray => challengeDetailsArray.filter((challenge): challenge is Challenge => challenge !== null)),
      catchError(err => {
        this.errorMessage = `Error al cargar tus desafíos: ${err.message || 'Error desconocido.'}`;
        console.error('Error en loadUserJoinedChallenges:', err);
        return of([]);
      })
    ).subscribe({
      next: (detailedChallenges: Challenge[]) => {
        this.userJoinedChallengesDetails = detailedChallenges;
        this.isLoading = false;
      },
    });
  }

  // NUEVO MÉTODO para manejar cuando un desafío es abandonado desde la tarjeta
  handleChallengeLeft(challengeId: number): void {
    this.userJoinedChallengesDetails = this.userJoinedChallengesDetails.filter(
      challenge => challenge.id !== challengeId
    );
    this.snackBar.open('Has abandonado el desafío.', 'Cerrar', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
    });
    // Si la lista queda vacía después de abandonar, se mostrará el mensaje de estado vacío.
  }
}