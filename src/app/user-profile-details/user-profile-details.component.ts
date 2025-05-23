import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subscription, forkJoin, of, Observable } from 'rxjs';
import { switchMap, tap, catchError, filter, map } from 'rxjs/operators';
import { AuthService, User, BackendUserProfilePreferences } from '../auth.service'; // Importar la interfaz
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
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
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
    MatTooltipModule,
    MatSlideToggleModule
  ],
  templateUrl: './user-profile-details.component.html',
  styleUrls: ['./user-profile-details.component.css']
})
export class UserProfileDetailsComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;

  public isLoading: boolean = true;
  isEditingBio: boolean = false;
  editableBio: string = '';
  isSavingBio: boolean = false;

  showSettingsPanel: boolean = false;
  // Esta estructura es para las opciones de visualización de ESTA PÁGINA
  profileDisplayPreferences = {
    showPoints: true,
    showLevel: true,
    showChallengesCompleted: true,
    showHabitsCompletedToday: true,
    showTotalHabitsCompleted: true,
    showBestStreak: true,
    profileCardColor: '#FFFFFF' // Color por defecto
  };

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
  private componentSubscriptions = new Subscription(); // AÑADIR ESTA LÍNEA

  constructor(
    public authService: AuthService,
    private snackBar: MatSnackBar,
    private challengeService: ChallengeService,
    private habitService: HabitService,
    private dialog: MatDialog,
    private router: Router // Asegúrate de que router esté aquí si lo usas
  ) {}

  ngOnInit(): void {
    this.isLoading = true;
    const sub = this.authService.currentUser.subscribe(user => {
      if (user && typeof user.id !== 'undefined') {
        this.currentUser = { ...user }; // Crear una copia para evitar mutaciones directas
        this.editableBio = this.currentUser.biografia || '';
        
        // Cargar preferencias de localStorage primero
        this.loadDisplayPreferencesFromStorage();

        // Si el usuario del backend tiene preferencias y un color de tarjeta, usarlo.
        // Esto permite que el color del backend sobreescriba el de localStorage.
        if (this.currentUser.preferences && this.currentUser.preferences.cardBackgroundColor) {
          this.profileDisplayPreferences.profileCardColor = this.currentUser.preferences.cardBackgroundColor;
        }
        
        this.fetchProfileData(); // Esto ya estaba
      } else {
        this.currentUser = null;
        // No es necesario resetear profileDisplayPreferences aquí si loadDisplayPreferencesFromStorage
        // ya maneja el caso de usuario no logueado (usa defaults o borra si es por ID).
        // Opcionalmente, podrías resetear a valores por defecto explícitamente si el usuario se desloguea.
        this.profileDisplayPreferences.profileCardColor = '#FFFFFF'; // Reset a default si no hay usuario
        this.isLoading = false; // Detener carga si no hay usuario
      }
    });
    this.componentSubscriptions.add(sub);
  }

  private fetchProfileData(): void {
    if (!this.currentUser || typeof this.currentUser.id === 'undefined') {
      this.isLoading = false;
      return;
    }
    this.isLoading = true; // Indicar carga general del perfil

    const challenges$ = this.loadUserChallenges();
    const completedChallenges$ = this.loadCompletedUserChallenges();
    const habitStats$ = this.loadHabitStats();

    forkJoin({
      challenges: challenges$.pipe(catchError(err => {
        this.challengesError = `Error al cargar desafíos: ${err.message}`;
        return of([]);
      })),
      completedChallenges: completedChallenges$.pipe(catchError(err => {
        this.completedChallengesError = `Error al cargar desafíos completados: ${err.message}`;
        return of([]);
      })),
      habitStats: habitStats$.pipe(catchError(err => {
        this.habitStatsError = `Error al cargar estadísticas de hábitos: ${err.message}`;
        return of(null);
      }))
    }).subscribe({
      next: (results) => {
        this.userChallengeDetails = results.challenges;
        this.completedUserChallengeDetails = results.completedChallenges;
        this.habitStats = results.habitStats;

        this.isLoadingChallenges = false;
        this.isLoadingCompletedChallenges = false;
        this.isLoadingHabitStats = false;
        this.isLoading = false; // Carga general completada
      },
      error: (err) => { // Este error es para el forkJoin en sí, aunque los catchError internos deberían manejar la mayoría
        console.error('Error general al cargar datos del perfil:', err);
        this.snackBar.open('Error al cargar todos los datos del perfil.', 'Cerrar', { duration: 3000 });
        this.isLoadingChallenges = false;
        this.isLoadingCompletedChallenges = false;
        this.isLoadingHabitStats = false;
        this.isLoading = false;
      }
    });
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

  // --- NUEVOS MÉTODOS PARA PERSONALIZACIÓN ---
  toggleSettingsPanel(): void {
    this.showSettingsPanel = !this.showSettingsPanel;
  }

  getPreferencesStorageKey(): string | null {
    if (this.currentUser && typeof this.currentUser.id !== 'undefined') {
      return `user_${this.currentUser.id}_profileDisplayPrefs`;
    }
    return null;
  }

  loadDisplayPreferencesFromStorage(): void {
    const key = this.getPreferencesStorageKey();
    if (key) {
      const storedPrefs = localStorage.getItem(key);
      if (storedPrefs) {
        try {
          const prefs = JSON.parse(storedPrefs);
          this.profileDisplayPreferences = {
            showPoints: prefs.showPoints !== undefined ? prefs.showPoints : true,
            showLevel: prefs.showLevel !== undefined ? prefs.showLevel : true,
            showChallengesCompleted: prefs.showChallengesCompleted !== undefined ? prefs.showChallengesCompleted : true,
            showHabitsCompletedToday: prefs.showHabitsCompletedToday !== undefined ? prefs.showHabitsCompletedToday : true,
            showTotalHabitsCompleted: prefs.showTotalHabitsCompleted !== undefined ? prefs.showTotalHabitsCompleted : true,
            showBestStreak: prefs.showBestStreak !== undefined ? prefs.showBestStreak : true,
            // El color de la tarjeta se carga aquí desde localStorage,
            // pero puede ser sobrescrito por el valor del backend en ngOnInit.
            profileCardColor: prefs.profileCardColor || this.profileDisplayPreferences.profileCardColor // Mantener el actual si no hay en localStorage
          };
        } catch (e) {
          console.error('Error al parsear preferencias guardadas de localStorage:', e);
          // Mantener los defaults si hay error, el color del backend (si existe) se aplicará después.
        }
      }
    }
    // Si no hay clave o no hay prefs guardadas, se mantienen los valores por defecto iniciales.
    // El color del backend (si existe) se aplicará después en ngOnInit.
  }

  saveDisplayPreferences(): void {
    if (!this.currentUser || typeof this.currentUser.id === 'undefined') {
      this.snackBar.open('No se pueden guardar las preferencias (usuario no identificado).', 'Cerrar', { duration: 3000 });
      this.toggleSettingsPanel();
      return;
    }

    const userId = this.currentUser.id;

    // 1. Guardar en localStorage (para las preferencias de esta página)
    const key = this.getPreferencesStorageKey();
    if (key) {
      try {
        localStorage.setItem(key, JSON.stringify(this.profileDisplayPreferences));
      } catch (e) {
        console.error('Error al guardar preferencias en localStorage:', e);
        // No mostrar snackbar aquí todavía, el guardado en backend es más importante.
      }
    }

    // 2. Preparar datos para el backend
    // Tomamos las preferencias actuales del usuario (del backend) y solo actualizamos el color.
    const backendPrefsPayload: BackendUserProfilePreferences = {
      ...(this.currentUser.preferences || {}), // Copia las preferencias existentes del backend o un objeto vacío
      cardBackgroundColor: this.profileDisplayPreferences.profileCardColor // Actualiza/añade el color de la tarjeta
    };

    // 3. Llamar al servicio para guardar en el backend
    this.isSavingBio = true; // Reutilizar un spinner o crear uno nuevo para "guardando preferencias"
    this.authService.updateUserDisplayPreferences(userId, backendPrefsPayload).subscribe({
      next: (updatedUser) => {
        this.isSavingBio = false;
        // AuthService ya actualiza su currentUserSubject con updatedUser gracias al tap.
        // this.currentUser se actualizará a través de la suscripción en ngOnInit.
        // Opcionalmente, para una respuesta más inmediata en la UI antes de que la suscripción se dispare:
        // if (this.currentUser) {
        //   this.currentUser.preferences = updatedUser.preferences;
        // }
        this.snackBar.open('Preferencias de visualización guardadas.', 'Cerrar', { duration: 2500 });
        this.toggleSettingsPanel();
      },
      error: (err) => {
        this.isSavingBio = false;
        console.error('Error al guardar preferencias en el backend:', err);
        this.snackBar.open(`Error al guardar: ${err.message || 'Error desconocido'}`, 'Cerrar', { duration: 3500 });
        // No cerramos el panel en caso de error para que el usuario pueda reintentar.
      }
    });
  } // Cierre del método saveDisplayPreferences

}
