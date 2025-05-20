import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router'; // <--- ASEGURAR ActivatedRoute
import { ChallengeService } from '../challenge.service';
import { Challenge } from '../challenge.model';
import { ChallengeCardComponent } from '../challenge-card/challenge-card.component';
import { UserChallenge } from '../user-challenge.model';
import { forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-challenge-list',
  standalone: true,
  imports: [
    CommonModule, RouterModule, ChallengeCardComponent,
    MatProgressSpinnerModule, MatIconModule, MatButtonModule,
    MatSnackBarModule
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
  isAdmin: boolean = false; // Esta propiedad controlará la visibilidad del botón

  constructor(
    private challengeService: ChallengeService,
    private snackBar: MatSnackBar,
    private authService: AuthService,
    private route: ActivatedRoute // <--- INYECTAR ActivatedRoute
  ) {
    // Leer el contexto de la ruta para determinar si es una vista de administrador
    // Esto asume que has configurado 'data: { isAdminContext: true }' en la ruta de admin para este componente
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
        this.errorMessage = `Error al cargar desafíos: ${err.message || 'Error desconocido.'}`;
        return of([] as Challenge[]);
      })),
      userStatus: loadUserStatus$
    }).pipe(
      map(({ challenges, userStatus }) => {
        this.allChallenges = challenges;
        if (!this.isAdmin) { // Solo establecer IDs unidos si no es admin
          this.joinedChallengeIds = new Set(userStatus.map(uc => uc.desafioId));
        }
        this.filterAndPrepareChallenges();
      })
    ).subscribe({
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  filterAndPrepareChallenges(): void {
    this.displayedChallenges = [...this.allChallenges];
  }

  isUserJoined(challengeId?: number): boolean {
    if (this.isAdmin) { // En la vista de admin, no se marcan como "unidos"
      return false;
    }
    return typeof challengeId !== 'undefined' && this.joinedChallengeIds.has(challengeId);
  }

  handleChallengeJoined(challengeId: number): void {
    if (this.isAdmin) return;
    this.joinedChallengeIds.add(challengeId);
    this.snackBar.open('¡Te has unido al desafío!', 'Cerrar', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
    });
  }

  handleChallengeLeft(challengeId: number): void {
    if (this.isAdmin) return;
    this.joinedChallengeIds.delete(challengeId);
    this.snackBar.open('Has abandonado el desafío.', 'Cerrar', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
    });
  }

  handleChallengeDeleted(challengeId: number): void {
    this.allChallenges = this.allChallenges.filter(c => c.id !== challengeId);
    this.filterAndPrepareChallenges();
    this.snackBar.open('Desafío eliminado correctamente.', 'Cerrar', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
    });
  }
}