import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Challenge } from '../challenge.model';
import { UserChallenge } from '../user-challenge.model';
import { ChallengeCardComponent } from '../challenge-card/challenge-card.component';
import { AuthService } from '../../auth.service';
import { ChallengeService } from '../challenge.service'; // <--- AÑADE ESTA LÍNEA
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Component({
  selector: 'app-challenge-list',
  standalone: true,
  imports: [
    CommonModule, RouterModule, ChallengeCardComponent,
    MatProgressSpinnerModule, MatIconModule, MatButtonModule,
    MatSnackBarModule, MatCardModule
  ],
  templateUrl: './challenge-list.component.html',
  styleUrls: ['./challenge-list.component.css']
})
export class ChallengeListComponent implements OnInit {
  allChallenges: Challenge[] = [];
  displayedChallenges: Challenge[] = [];
  joinedChallengeIds: Set<number> = new Set();
  isLoading = true;
  errorMessage: string | null = null;
  isAdmin: boolean = false;

  constructor(
    private challengeService: ChallengeService,
    private snackBar: MatSnackBar,
    private authService: AuthService,
    private route: ActivatedRoute
  ) {
    this.isAdmin = this.route.snapshot.data['isAdminContext'] === true;
  }

  ngOnInit(): void {
    this.loadChallengesAndUserStatus();
  }

  loadChallengesAndUserStatus(): void {
    this.isLoading = true;
    this.errorMessage = null;

    const loadUserStatus$ = (!this.isAdmin && this.authService.isAuthenticated())
      ? this.challengeService.getMyJoinedChallenges().pipe(catchError(() => of([] as UserChallenge[])))
      : of([] as UserChallenge[]);

    forkJoin({
      challenges: this.challengeService.getAllChallenges().pipe(catchError(err => {
        this.errorMessage = `Error al cargar desafíos: ${err.message || 'Error desconocido'}`;
        return of([] as Challenge[]);
      })),
      userStatus: loadUserStatus$
    }).pipe(
      map(({ challenges, userStatus }) => {
        this.allChallenges = challenges;
        this.joinedChallengeIds.clear();
        if (userStatus && userStatus.length > 0) {
          userStatus.forEach((uc: UserChallenge) => { // <--- CAMBIO AQUÍ: Añadido el tipo UserChallenge
            // Asegurarse que desafioId es un número antes de añadirlo
            const desafioIdNum = Number(uc.desafioId);
            if (!isNaN(desafioIdNum)) {
                 this.joinedChallengeIds.add(desafioIdNum);
            }
          });
        }
        this.filterAndPrepareChallenges();
      })
    ).subscribe({
      error: (err) => {
        this.errorMessage = `Error al procesar datos: ${err.message || 'Error desconocido'}`;
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  filterAndPrepareChallenges(): void {
    if (this.isAdmin) {
      this.displayedChallenges = [...this.allChallenges];
    } else {
      // Para usuarios no admin, no mostrar los desafíos a los que ya se unieron O que ya completaron
      // Para esto último, necesitaríamos saber los completados. Por ahora, solo los unidos.
      // Si el backend en getAllChallenges ya filtra los completados por el usuario, mejor.
      this.displayedChallenges = this.allChallenges.filter(challenge =>
        challenge.id !== undefined && !this.joinedChallengeIds.has(challenge.id)
      );
    }
  }

  isUserJoined(challengeId?: number): boolean {
    if (this.isAdmin) return false;
    return typeof challengeId !== 'undefined' && this.joinedChallengeIds.has(challengeId);
  }

  handleChallengeJoined(challengeId: number): void {
    if (this.isAdmin) return;
    this.joinedChallengeIds.add(challengeId);
    this.filterAndPrepareChallenges(); // Re-filtrar para que desaparezca de la lista
    this.snackBar.open('¡Te has unido al desafío!', 'Cerrar', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
    });
  }

  handleChallengeLeft(challengeId: number): void {
    if (this.isAdmin) return;
    this.joinedChallengeIds.delete(challengeId);
    // Para que reaparezca en la lista general, volvemos a filtrar.
    // Esto asume que `allChallenges` sigue teniendo el desafío.
    this.filterAndPrepareChallenges();
    this.snackBar.open('Has abandonado el desafío.', 'Cerrar', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
    });
  }

  handleChallengeDeleted(challengeId: number): void { // Para admin
    this.allChallenges = this.allChallenges.filter(c => c.id !== challengeId);
    this.filterAndPrepareChallenges();
     this.snackBar.open('Desafío eliminado.', 'Cerrar', { duration: 3000 });
  }
}