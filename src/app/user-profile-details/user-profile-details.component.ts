import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subscription, forkJoin, of, Observable } from 'rxjs';
import { switchMap, tap, catchError, filter, map } from 'rxjs/operators';
import { AuthService, User } from '../auth.service';
import { ChallengeService } from '../challenges/challenge.service';
import { HabitService } from '../habits/habit.service';
import { Challenge } from '../challenges/challenge.model';
import { UserChallenge } from '../challenges/user-challenge.model';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ChallengeDetailDialogComponent } from '../shared/challenge-detail-dialog/challenge-detail-dialog.component';

export interface HabitStats {
  totalCompletionsToday: number;
  totalOverallCompletions: number;
  activeHabits: number;
  longestStreakOverall: number;
}

export interface UserChallengeDetail extends Challenge { // CAMBIO AQUÍ: Añadido 'export'
  userChallengeData: UserChallenge;
}

@Component({
  selector: 'app-user-profile-details',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    TitleCasePipe,
    FormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule,
    MatListModule,
    MatTooltipModule
  ],
  templateUrl: './user-profile-details.component.html',
  styleUrls: ['./user-profile-details.component.css']
})
export class UserProfileDetailsComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  private componentSubscriptions = new Subscription();

  public isLoading: boolean = true;
  isEditingBio: boolean = false;
  editableBio: string = '';
  isSavingBio: boolean = false;

  userChallengeDetails: UserChallengeDetail[] = [];
  isLoadingChallenges: boolean = true;
  challengesError: string | null = null;

  completedUserChallengeDetails: UserChallengeDetail[] = [];
  isLoadingCompletedChallenges: boolean = true;
  completedChallengesError: string | null = null;

  habitStats: HabitStats | null = null;
  isLoadingHabitStats: boolean = true;
  habitStatsError: string | null = null;

  defaultAvatarUrl: string = 'assets/images/default-avatar.png';

  constructor(
    public authService: AuthService,
    private snackBar: MatSnackBar,
    private challengeService: ChallengeService,
    private habitService: HabitService,
    private dialog: MatDialog, // Inyecta MatDialog
    private router: Router
  ) {}

  ngOnInit(): void {
    this.isLoading = true;

    const currentUserSub = this.authService.currentUser.pipe(
      tap(user => { // Procesar el usuario tan pronto como llegue
        this.currentUser = user;
        if (user && user.biografia) {
          this.editableBio = user.biografia;
        }
      }),
      filter(user => user !== null), // Continuar solo si el usuario no es null
      switchMap(user => {
        // Si llegamos aquí, user no es null
        this.isLoadingChallenges = true;
        this.isLoadingCompletedChallenges = true;
        this.isLoadingHabitStats = true;
        this.challengesError = null;
        this.completedChallengesError = null;
        this.habitStatsError = null;

        return forkJoin({
          userChallenges: this.loadUserChallenges().pipe(
            catchError(err => {
              this.challengesError = this.formatError(err, 'desafíos actuales');
              this.isLoadingChallenges = false;
              return of([]);
            })
          ),
          completedChallenges: this.loadCompletedUserChallenges().pipe(
            catchError(err => {
              this.completedChallengesError = this.formatError(err, 'desafíos completados');
              this.isLoadingCompletedChallenges = false;
              return of([]);
            })
          ),
          habitStats: this.loadHabitStats().pipe(
            catchError(err => {
              this.habitStatsError = this.formatError(err, 'estadísticas de hábitos');
              this.isLoadingHabitStats = false;
              return of(null);
            })
          )
        });
      })
    ).subscribe({
      next: (results) => {
        if (results) {
          this.userChallengeDetails = results.userChallenges;
          this.completedUserChallengeDetails = results.completedChallenges;
          this.habitStats = results.habitStats;
        }
        // Asegurar que los flags de carga específicos se desactiven si no hubo error individual
        if (!this.challengesError) this.isLoadingChallenges = false;
        if (!this.completedChallengesError) this.isLoadingCompletedChallenges = false;
        if (!this.habitStatsError) this.isLoadingHabitStats = false;
        
        this.isLoading = false; // Desactivar el flag general
      },
      error: (err) => {
        console.error('Error crítico al cargar datos del perfil:', err);
        this.isLoading = false;
        this.isLoadingChallenges = false;
        this.isLoadingCompletedChallenges = false;
        this.isLoadingHabitStats = false;
        // Podrías mostrar un error general en la UI aquí
      }
    });
    this.componentSubscriptions.add(currentUserSub);

    // Si authService.currentUser puede emitir null inicialmente y luego el usuario,
    // necesitamos manejar el caso en que el primer valor es null y no hay datos que cargar.
    if (!this.authService.currentUserValue) {
        this.isLoading = false;
        this.isLoadingChallenges = false;
        this.isLoadingCompletedChallenges = false;
        this.isLoadingHabitStats = false;
    }
  }

  loadUserChallenges(): Observable<UserChallengeDetail[]> {
    return this.challengeService.getMyJoinedChallenges().pipe(
      switchMap((userChallenges: UserChallenge[]) => {
        const activeChallenges = userChallenges.filter(uc => uc.estadoParticipacion !== 'COMPLETADO');
        if (activeChallenges.length === 0) {
          this.isLoadingChallenges = false; // No hay nada que cargar
          return of([]);
        }
        const challengeObservables = activeChallenges.map(uc =>
          this.challengeService.getChallengeById(uc.desafioId).pipe(
            map(challengeDetails => ({ ...challengeDetails, userChallengeData: uc })),
            catchError(err => {
              console.error(`Error cargando detalles del desafío ${uc.desafioId}:`, err);
              return of(null);
            })
          )
        );
        return forkJoin(challengeObservables);
      }),
      map(details => details.filter((d): d is UserChallengeDetail => d !== null)),
      tap(() => { if (!this.challengesError) this.isLoadingChallenges = false; }) // Desactivar si no hubo error previo
    );
  }

  loadCompletedUserChallenges(): Observable<UserChallengeDetail[]> {
    return this.challengeService.getCompletedUserChallenges().pipe(
      switchMap((completedUserChallenges: UserChallenge[]) => {
        if (completedUserChallenges.length === 0) {
          this.isLoadingCompletedChallenges = false; // No hay nada que cargar
          return of([]);
        }
        const challengeObservables = completedUserChallenges.map(uc =>
          this.challengeService.getChallengeById(uc.desafioId).pipe(
            map(challengeDetails => ({ ...challengeDetails, userChallengeData: uc })),
            catchError(err => {
              console.error(`Error cargando detalles del desafío completado ${uc.desafioId}:`, err);
              return of(null);
            })
          )
        );
        return forkJoin(challengeObservables);
      }),
      map(details => details.filter((d): d is UserChallengeDetail => d !== null)),
      tap(() => { if(!this.completedChallengesError) this.isLoadingCompletedChallenges = false; })
    );
  }

  loadHabitStats(): Observable<HabitStats | null> {
    return this.habitService.getHabitStatsForUser().pipe(
      tap(() => { if(!this.habitStatsError) this.isLoadingHabitStats = false; })
    );
  }

  private formatError(error: any, context: string): string {
    console.error(`Error cargando ${context}:`, error);
    if (error && error.message) {
      return `Error al cargar ${context}: ${error.message}`;
    }
    return `Ocurrió un error desconocido al cargar ${context}.`;
  }

  ngOnDestroy(): void {
    this.componentSubscriptions.unsubscribe();
  }

  toggleEditBio(): void {
    if (this.isEditingBio) {
      this.cancelEditBio();
    } else {
      this.editableBio = this.currentUser?.biografia || '';
      this.isEditingBio = true;
    }
  }

  cancelEditBio(): void {
    this.isEditingBio = false;
    this.editableBio = this.currentUser?.biografia || ''; // Restaura al valor original
  }

  saveBiography(): void {
    if (!this.currentUser || typeof this.currentUser.id === 'undefined') {
      this.snackBar.open('Error: Usuario no identificado.', 'Cerrar', { duration: 3000 });
      return;
    }
    this.isSavingBio = true;
    const userId = this.currentUser.id;
    this.authService.updateUserProfile(userId, { biografia: this.editableBio }).subscribe({
      next: (updatedUser) => {
        this.snackBar.open('Biografía actualizada con éxito.', 'Cerrar', { duration: 3000, panelClass: ['snackbar-success'] });
        if (this.currentUser) { // Actualizar el currentUser localmente
            this.currentUser.biografia = updatedUser.biografia;
        }
        this.isEditingBio = false;
        this.isSavingBio = false;
      },
      error: (err) => {
        this.snackBar.open(`Error al actualizar la biografía: ${err.message || 'Inténtalo de nuevo.'}`, 'Cerrar', { duration: 3000, panelClass: ['snackbar-error'] });
        this.isSavingBio = false;
      }
    });
  }

  onImageError(event: Event): void {
    (event.target as HTMLImageElement).src = this.defaultAvatarUrl;
  }

  openChallengeDetails(challengeDetail: UserChallengeDetail): void {
    this.dialog.open(ChallengeDetailDialogComponent, {
      width: '600px', // Puedes ajustar el ancho
      maxWidth: '90vw', // Para responsividad
      data: challengeDetail,
      panelClass: 'challenge-detail-dialog-panel' // Clase opcional para estilos globales del panel
    });
  }

  // Helper para obtener la clase de estado (si no la tienes ya)
  getStatusClass(status: string): string {
    return 'status-' + status.toLowerCase().replace(/\s+/g, '_');
  }
}
