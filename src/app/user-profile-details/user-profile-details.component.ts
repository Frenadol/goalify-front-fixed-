import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subscription, forkJoin, of, Observable } from 'rxjs';
import { switchMap, tap, catchError, filter, map, finalize } from 'rxjs/operators';
import { AuthService, User, BackendUserProfilePreferences } from '../auth.service';
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
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ChallengeDetailDialogComponent } from '../shared/challenge-detail-dialog/challenge-detail-dialog.component';
import { ProfileDisplayPreferences } from './user-profile.models';
import { UserPurchasesService } from '../market/user-purchases.service';
import { ProfilePhotoDialogComponent } from '../shared/profile-photo-dialog/profile-photo-dialog.component';
import { MarketItem } from '../market/market-item.model';

export interface HabitStats {
  totalCompletionsToday: number;
  totalOverallCompletions: number;
  activeHabits: number;
  longestStreakOverall: number;
}

export interface UserChallengeDetail extends Challenge {
  userChallengeData: UserChallenge;
}

interface RangoNivel {
  nombre: string;
  puntosMinimos: number;
  icono: string;
  mensajeMotivacional?: string;
}

@Component({
  selector: 'app-user-profile-details',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    TitleCasePipe,
    FormsModule,
    ReactiveFormsModule,
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
    MatSlideToggleModule,
    MatProgressBarModule
  ],
  templateUrl: './user-profile-details.component.html',
  styleUrls: ['./user-profile-details.component.css']
})
export class UserProfileDetailsComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  // Añade esta línea aquí para resolver el error:
  private userSubscription: Subscription = new Subscription();

  public isLoading: boolean = true;
  isEditingBio: boolean = false;
  editableBio: string = '';
  isSavingBio: boolean = false;
  bioEditForm: FormGroup;
  bioEditError: string | null = null;

  showSettingsPanel: boolean = false;
  profileDisplayPreferencesForm!: FormGroup;
  isSavingPreferences: boolean = false;

  // ÚNICA DECLARACIÓN E INICIALIZACIÓN DE profileDisplayPreferences
  profileDisplayPreferences: ProfileDisplayPreferences = {
    showPoints: true,
    showLevel: true,
    showRank: true,
    showRecordPoints: true, // Asegúrate que esta nueva preferencia esté aquí
    showChallengesCompleted: true,
    showHabitsCompletedToday: true,
    showTotalHabitsCompleted: true,
    showBestStreak: true,
    profileCardColor: '#ffffff',
    themeColor: 'default-theme',
    showChallengePointsOnCard: true, // Ajustado a true como en la otra declaración
    showChallengeDatesOnCard: true   // Ajustado a true como en la otra declaración
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

  defaultAvatarUrl = 'assets/images/avatars/default-avatar.png';
  defaultRankIcon = 'assets/rangos/rangodefault.png';

  rangoActualDetalles: RangoNivel | null = null;
  siguienteRangoDetalles: RangoNivel | null = null;
  progresoRango: number = 0;
  puntosUsuario: number = 0;

  private componentSubscriptions = new Subscription();

  public readonly RANGOS_DEFINIDOS: RangoNivel[] = [
    { nombre: 'NOVATO', puntosMinimos: 0, icono: 'assets/rangos/rangonovato.png', mensajeMotivacional: '¡Todo gran viaje comienza con un primer paso! Sigue así.' },
    { nombre: 'ASPIRANTE', puntosMinimos: 1000, icono: 'assets/rangos/rangoaspirante.png', mensajeMotivacional: '¡Estás construyendo una base sólida! La disciplina te llevará lejos.' },
    { nombre: 'DISCIPLINADO', puntosMinimos: 2500, icono: 'assets/rangos/rangodisciplinado.png', mensajeMotivacional: '¡Tu constancia es admirable! Ya eres un ejemplo de dedicación.' },
    { nombre: 'CONSTANTE', puntosMinimos: 5000, icono: 'assets/rangos/rangoconstante.png', mensajeMotivacional: '¡Has convertido tus metas en hábitos! Sigue brillando.' },
    { nombre: 'DEDICADO', puntosMinimos: 10000, icono: 'assets/rangos/rangodedicado.png', mensajeMotivacional: '¡Tu dedicación es inquebrantable! Estás marcando la diferencia.' },
    { nombre: 'INSPIRADOR', puntosMinimos: 20000, icono: 'assets/rangos/rangoinspirador.png', mensajeMotivacional: '¡Eres una fuente de inspiración! Tu progreso motiva a otros.' },
    { nombre: 'MAESTRO_HABITOS', puntosMinimos: 50000, icono: 'assets/rangos/rangomaestrohabitos.png', mensajeMotivacional: '¡Has alcanzado la maestría! Tu dominio de los hábitos es legendario.' }
  ];

  // defaultProfileDisplayPreferences se usa para resetear, la propiedad principal es profileDisplayPreferences
  private readonly defaultProfileDisplayPreferences: ProfileDisplayPreferences = {
    showPoints: true,
    showLevel: true,
    showRank: true,
    showChallengesCompleted: true,
    showHabitsCompletedToday: true,
    showTotalHabitsCompleted: true,
    showBestStreak: true,
    showRecordPoints: true,
    profileCardColor: '#ffffff',
    themeColor: 'default-theme',
    showChallengeDatesOnCard: true,
    showChallengePointsOnCard: true,
  };

  // Añadir esta propiedad a la clase (si no existe ya)
  purchasedAvatars: {id: string, url: string, nombre: string}[] = [];

  constructor(
    public authService: AuthService,
    private snackBar: MatSnackBar,
    private challengeService: ChallengeService,
    private habitService: HabitService,
    private dialog: MatDialog,
    private router: Router,
    private fb: FormBuilder,
    private userPurchasesService: UserPurchasesService
  ) {
    this.bioEditForm = this.fb.group({
      biografia: ['', [Validators.maxLength(500)]]
    });
    // profileDisplayPreferences ya está inicializado arriba con sus valores por defecto.
    // profileDisplayPreferencesForm se inicializará en ngOnInit después de cargar las preferencias.
  }

  ngOnInit(): void {
    this.isLoading = true;
    
    // Observa al usuario actual
    this.userSubscription = this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
      if (user) {
        // Inicializar el formulario de biografía
        this.editableBio = user.biografia || '';
        this.bioEditForm = this.fb.group({
          biografia: [this.editableBio]
        });
        
        // Cargar las preferencias específicas del usuario
        this.loadUserPreferences(user.preferences || {});
        
        // Inicializar el formulario de preferencias con los valores cargados
        this.initializeDisplayPreferencesForm();
        
        // Calcular progreso del rango
        this.puntosUsuario = user.puntosTotales || 0;
        this.calcularProgresoRango();
        
        // Cargar datos del perfil (desafíos, estadísticas, etc.)
        this.fetchProfileData();
        
        // Cargar avatares comprados por el usuario
        this.loadPurchasedAvatars();
      }
      this.isLoading = false;
    });
  }
  
  private initializeDisplayPreferencesForm(): void {
    const prefsToUse = this.profileDisplayPreferences; // Usar la propiedad de clase ya actualizada
    this.profileDisplayPreferencesForm = this.fb.group({
      showPoints: [prefsToUse.showPoints],
      showLevel: [prefsToUse.showLevel],
      showRank: [prefsToUse.showRank],
      showChallengesCompleted: [prefsToUse.showChallengesCompleted],
      showHabitsCompletedToday: [prefsToUse.showHabitsCompletedToday],
      showTotalHabitsCompleted: [prefsToUse.showTotalHabitsCompleted],
      showBestStreak: [prefsToUse.showBestStreak],
      showRecordPoints: [prefsToUse.showRecordPoints],
      profileCardColor: [prefsToUse.profileCardColor],
      themeColor: [prefsToUse.themeColor],
      showChallengePointsOnCard: [prefsToUse.showChallengePointsOnCard],
      showChallengeDatesOnCard: [prefsToUse.showChallengeDatesOnCard],
    });
  }
  
  protected loadUserPreferences(backendPrefs: any): void {
  // Primero intenta cargar desde localStorage si hay un usuario actual
  let preferences = null;
  
  if (this.currentUser && this.currentUser.id) {
    const userPrefsKey = `user_prefs_${this.currentUser.id}`;
    const storedPrefsString = localStorage.getItem(userPrefsKey);
    
    if (storedPrefsString) {
      try {
        preferences = JSON.parse(storedPrefsString);
      } catch (e) {
        console.error('Error al parsear preferencias del localStorage', e);
      }
    }
  }

  // Si se encontraron preferencias en localStorage, úsalas
  if (preferences) {
    this.profileDisplayPreferences = preferences;
    return;
  }
  
  // Si no, usa las preferencias del backend o las por defecto
  this.profileDisplayPreferences = {
    showPoints: backendPrefs.showPointsOnCard ?? this.defaultProfileDisplayPreferences.showPoints,
    showLevel: backendPrefs.showLevelOnCard ?? this.defaultProfileDisplayPreferences.showLevel,
    showRank: this.defaultProfileDisplayPreferences.showRank,
    showChallengesCompleted: backendPrefs.showCompletedChallenges ?? this.defaultProfileDisplayPreferences.showChallengesCompleted,
    showHabitsCompletedToday: this.defaultProfileDisplayPreferences.showHabitsCompletedToday,
    showTotalHabitsCompleted: this.defaultProfileDisplayPreferences.showTotalHabitsCompleted,
    showBestStreak: this.defaultProfileDisplayPreferences.showBestStreak,
    showRecordPoints: backendPrefs.showRecordPoints ?? this.defaultProfileDisplayPreferences.showRecordPoints,
    profileCardColor: backendPrefs.cardBackgroundColor ?? this.defaultProfileDisplayPreferences.profileCardColor,
    themeColor: backendPrefs.themeColor ?? this.defaultProfileDisplayPreferences.themeColor,
    showChallengeDatesOnCard: backendPrefs.showChallengeDatesOnCard ?? this.defaultProfileDisplayPreferences.showChallengeDatesOnCard,
    showChallengePointsOnCard: backendPrefs.showChallengePointsOnCard ?? this.defaultProfileDisplayPreferences.showChallengePointsOnCard,
  };
}

  // ÚNICA IMPLEMENTACIÓN DE saveDisplayPreferences
  public saveDisplayPreferences(): void {
  if (!this.currentUser || !this.currentUser.id) {
    console.error('No se puede guardar las preferencias sin un usuario válido');
    return;
  }

  const preferences: ProfileDisplayPreferences = {
    showPoints: this.profileDisplayPreferencesForm.get('showPoints')?.value,
    showLevel: this.profileDisplayPreferencesForm.get('showLevel')?.value,
    showRank: this.profileDisplayPreferencesForm.get('showRank')?.value,
    showChallengesCompleted: this.profileDisplayPreferencesForm.get('showChallengesCompleted')?.value,
    showHabitsCompletedToday: this.profileDisplayPreferencesForm.get('showHabitsCompletedToday')?.value,
    showTotalHabitsCompleted: this.profileDisplayPreferencesForm.get('showTotalHabitsCompleted')?.value,
    showBestStreak: this.profileDisplayPreferencesForm.get('showBestStreak')?.value,
    showRecordPoints: this.profileDisplayPreferencesForm.get('showRecordPoints')?.value,
    profileCardColor: this.profileDisplayPreferencesForm.get('profileCardColor')?.value
  };

  // Guarda las preferencias en localStorage usando el ID del usuario como clave
  const userPrefsKey = `user_prefs_${this.currentUser.id}`;
  localStorage.setItem(userPrefsKey, JSON.stringify(preferences));

  // Guarda en el backend
  const backendPrefs = {
    showPointsOnCard: preferences.showPoints,
    showLevelOnCard: preferences.showLevel,
    showCompletedChallenges: preferences.showChallengesCompleted,
    showRecordPoints: preferences.showRecordPoints,
    cardBackgroundColor: preferences.profileCardColor
  };

  // Aquí usarías un servicio para guardar en el backend, pero mientras tanto
  // vamos a actualizar el estado local
  this.profileDisplayPreferences = preferences;
  
  // Actualiza el usuario actual para que mantenga las preferencias
  if (this.currentUser) {
    this.currentUser.preferences = backendPrefs;
    this.authService.updateCurrentUserState(this.currentUser);
  }

  this.snackBar.open('Preferencias guardadas correctamente', 'Cerrar', {
    duration: 3000
  });
  
  this.toggleSettingsPanel(); // Cierra el panel de configuración
}

  // ÚNICA IMPLEMENTACIÓN DE mapToBackendPreferences
  private mapToBackendPreferences(formValues: ProfileDisplayPreferences): BackendUserProfilePreferences {
    return {
      showPointsOnCard: formValues.showPoints,
      showLevelOnCard: formValues.showLevel,
      showCompletedChallenges: formValues.showChallengesCompleted,
      showRecordPoints: formValues.showRecordPoints,
      cardBackgroundColor: formValues.profileCardColor,
      themeColor: formValues.themeColor,
      showChallengeDatesOnCard: formValues.showChallengeDatesOnCard,
      showChallengePointsOnCard: formValues.showChallengePointsOnCard,
    };
  }

  private fetchProfileData(): void {
  if (!this.currentUser || typeof this.currentUser.id === 'undefined') {
    this.isLoading = false;
    return;
  }
  
  // Cargar desafíos del usuario
  this.challengeService.getMyJoinedChallenges().subscribe({
    next: (userChallenges: UserChallenge[]) => {
      if (userChallenges.length === 0) {
        this.userChallengeDetails = [];
        this.isLoadingChallenges = false;
        return;
      }
      
      // Filtrar solo los desafíos activos (no completados)
      const activeChallenges = userChallenges.filter(uc => 
        uc.estadoParticipacion !== 'COMPLETADO'
      );
      
      // Obtener detalles completos para cada desafío
      const challengeObservables = activeChallenges.map(userChallenge => 
        this.challengeService.getChallengeById(userChallenge.desafioId).pipe(
          map(challengeDetails => ({
            ...challengeDetails,
            userChallengeData: userChallenge
          }))
        )
      );
      
      if (challengeObservables.length === 0) {
        this.userChallengeDetails = [];
        this.isLoadingChallenges = false;
        return;
      }
      
      forkJoin(challengeObservables).subscribe({
        next: (challengeDetails) => {
          this.userChallengeDetails = challengeDetails.filter(Boolean) as UserChallengeDetail[];
          this.isLoadingChallenges = false;
        },
        error: (error) => {
          console.error('Error al cargar detalles de desafíos:', error);
          this.challengesError = 'Error al cargar detalles de los desafíos';
          this.isLoadingChallenges = false;
        }
      });
    },
    error: (error) => {
      console.error('Error al cargar desafíos del usuario:', error);
      this.challengesError = 'Error al cargar los desafíos';
      this.isLoadingChallenges = false;
    }
  });
  
  // Cargar desafíos completados
  this.challengeService.getCompletedUserChallenges().subscribe({
    next: (completedChallenges: UserChallenge[]) => {
      if (completedChallenges.length === 0) {
        this.completedUserChallengeDetails = [];
        this.isLoadingCompletedChallenges = false;
        return;
      }
      
      const challengeObservables = completedChallenges.map(userChallenge => 
        this.challengeService.getChallengeById(userChallenge.desafioId).pipe(
          map(challengeDetails => ({
            ...challengeDetails,
            userChallengeData: userChallenge
          }))
        )
      );
      
      forkJoin(challengeObservables).subscribe({
        next: (challengeDetails) => {
          this.completedUserChallengeDetails = challengeDetails.filter(Boolean) as UserChallengeDetail[];
          this.isLoadingCompletedChallenges = false;
        },
        error: (error) => {
          console.error('Error al cargar detalles de desafíos completados:', error);
          this.completedChallengesError = 'Error al cargar detalles de los desafíos completados';
          this.isLoadingCompletedChallenges = false;
        }
      });
    },
    error: (error) => {
      console.error('Error al cargar desafíos completados del usuario:', error);
      this.completedChallengesError = 'Error al cargar los desafíos completados';
      this.isLoadingCompletedChallenges = false;
    }
  });
  
  // Cargar estadísticas de hábitos
  this.habitService.getHabitStatsForUser().subscribe({
    next: (stats) => {
      this.habitStats = stats;
      this.isLoadingHabitStats = false;
    },
    error: (error) => {
      console.error('Error al cargar estadísticas de hábitos:', error);
      this.habitStatsError = 'Error al cargar estadísticas de hábitos';
      this.isLoadingHabitStats = false;
    }
  });
}

  ngOnDestroy(): void {
    // Si quieres mantener la desuscripción de componentSubscriptions
    this.componentSubscriptions.unsubscribe();
    
    // Añade esta línea para desuscribirte también de userSubscription
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  toggleEditBio(): void {
    if (this.isEditingBio) {
      this.cancelEditBio();
    } else {
      this.editableBio = this.currentUser?.biografia || '';
      this.bioEditForm.patchValue({ biografia: this.editableBio });
      this.isEditingBio = true;
    }
  }

  cancelEditBio(): void {
    this.isEditingBio = false;
    this.bioEditForm.patchValue({ biografia: this.currentUser?.biografia || '' });
  }

  guardarBiografia(): void {
    if (this.bioEditForm.invalid || !this.currentUser || !this.currentUser.id) {
      return;
    }
    this.isSavingBio = true;
    this.bioEditError = null;
    const nuevaBiografia = this.bioEditForm.value.biografia;
    const updatePayload: Partial<User> = {
      biografia: nuevaBiografia,
      fotoPerfil: this.currentUser.fotoPerfil // Mantener la foto de perfil actual
    };

    this.authService.updateUserProfile(this.currentUser.id, updatePayload)
      .pipe(finalize(() => { this.isSavingBio = false; }))
      .subscribe({
        next: (updatedUser) => {
          this.isEditingBio = false;
          this.snackBar.open('Biografía actualizada con éxito.', 'Cerrar', {
            duration: 3000, panelClass: ['snackbar-success']
          });
        },
        error: (error) => {
          // Asignar un mensaje de error específico o genérico
          this.bioEditError = error?.error?.message || error?.message || 'Error desconocido al actualizar la biografía.';
          this.snackBar.open(this.bioEditError ?? 'Error al actualizar la biografía.', 'Cerrar', { // <<< CORRECCIÓN AQUÍ
            duration: 5000, panelClass: ['snackbar-error']
          });
        }
      });
  }

  onImageError(event: Event): void {
    (event.target as HTMLImageElement).src = this.defaultAvatarUrl;
  }

  openChallengeDetails(challengeDetail: UserChallengeDetail): void {
    this.dialog.open(ChallengeDetailDialogComponent, {
      width: '600px', maxWidth: '90vw', data: challengeDetail, panelClass: 'challenge-detail-dialog-panel'
    });
  }

  getStatusClass(status: string): string {
    return 'status-' + status.toLowerCase().replace(/\s+/g, '_');
  }

  toggleSettingsPanel(): void {
    this.showSettingsPanel = !this.showSettingsPanel;
    
    // Actualizar el formulario con las preferencias actuales cuando se abre el panel
    if (this.showSettingsPanel) {
      this.profileDisplayPreferencesForm.patchValue(this.profileDisplayPreferences);
    }
  }

  getPreferencesStorageKey(): string | null {
    if (this.currentUser && typeof this.currentUser.id !== 'undefined') {
      return `user_${this.currentUser.id}_profileDisplayPrefs`;
    }
    return null;
  }

  loadDisplayPreferencesFromStorage(): void {
    const key = this.getPreferencesStorageKey();
    let prefsToApply = { ...this.defaultProfileDisplayPreferences }; // Empezar con los defaults

    if (key) {
      const storedPrefs = localStorage.getItem(key);
      if (storedPrefs) {
        try {
          const parsedPrefs = JSON.parse(storedPrefs);
          // Sobrescribir los defaults solo con las propiedades que existen en parsedPrefs
          prefsToApply = {
            ...prefsToApply, // Mantener defaults para lo que no esté en localStorage
            showPoints: parsedPrefs.showPoints !== undefined ? parsedPrefs.showPoints : prefsToApply.showPoints,
            showLevel: parsedPrefs.showLevel !== undefined ? parsedPrefs.showLevel : prefsToApply.showLevel,
            showRank: parsedPrefs.showRank !== undefined ? parsedPrefs.showRank : prefsToApply.showRank,
            showChallengesCompleted: parsedPrefs.showChallengesCompleted !== undefined ? parsedPrefs.showChallengesCompleted : prefsToApply.showChallengesCompleted,
            showHabitsCompletedToday: parsedPrefs.showHabitsCompletedToday !== undefined ? parsedPrefs.showHabitsCompletedToday : prefsToApply.showHabitsCompletedToday,
            showTotalHabitsCompleted: parsedPrefs.showTotalHabitsCompleted !== undefined ? parsedPrefs.showTotalHabitsCompleted : prefsToApply.showTotalHabitsCompleted,
            showBestStreak: parsedPrefs.showBestStreak !== undefined ? parsedPrefs.showBestStreak : prefsToApply.showBestStreak,
            showRecordPoints: parsedPrefs.showRecordPoints !== undefined ? parsedPrefs.showRecordPoints : prefsToApply.showRecordPoints,
            profileCardColor: parsedPrefs.profileCardColor || prefsToApply.profileCardColor,
            themeColor: parsedPrefs.themeColor || prefsToApply.themeColor,
            showChallengePointsOnCard: parsedPrefs.showChallengePointsOnCard !== undefined ? parsedPrefs.showChallengePointsOnCard : prefsToApply.showChallengePointsOnCard,
            showChallengeDatesOnCard: parsedPrefs.showChallengeDatesOnCard !== undefined ? parsedPrefs.showChallengeDatesOnCard : prefsToApply.showChallengeDatesOnCard,
          };
        } catch (e) {
          console.error('Error al parsear preferencias guardadas de localStorage:', e);
        }
      }
    }
    this.profileDisplayPreferences = prefsToApply; // Aplicar las preferencias finales
  }
  
  debugRankValues() {
    console.log('[DEBUG TEMPLATE] profileDisplayPreferences.showRank:', this.profileDisplayPreferences.showRank);
    console.log('[DEBUG TEMPLATE] currentUser.rango:', this.currentUser?.rango);
    console.log('[DEBUG TEMPLATE] Condición *ngIf completa:', this.profileDisplayPreferences.showRank && !!this.currentUser?.rango);
    return '';
  }

  private calcularProgresoRango(): void {
    if (!this.currentUser || typeof this.currentUser.puntosTotales === 'undefined' || !this.currentUser.rango) {
      this.rangoActualDetalles = null;
      this.siguienteRangoDetalles = null;
      this.progresoRango = 0;
      return;
    }
    const nombreRangoUsuario = this.currentUser.rango.toUpperCase().replace(/\s+/g, '_').trim();
    this.rangoActualDetalles = this.RANGOS_DEFINIDOS.find(r => r.nombre.toUpperCase() === nombreRangoUsuario) || null;

    if (!this.rangoActualDetalles) {
      this.siguienteRangoDetalles = null;
      this.progresoRango = 0;
      return;
    }
    const indiceRangoActual = this.RANGOS_DEFINIDOS.findIndex(r => r.nombre.toUpperCase() === this.rangoActualDetalles!.nombre.toUpperCase());

    if (indiceRangoActual < this.RANGOS_DEFINIDOS.length - 1) {
      this.siguienteRangoDetalles = this.RANGOS_DEFINIDOS[indiceRangoActual + 1];
      const puntosRangoActual = this.rangoActualDetalles.puntosMinimos;
      const puntosSiguienteRango = this.siguienteRangoDetalles.puntosMinimos;
      const puntosNecesariosParaSiguiente = puntosSiguienteRango - puntosRangoActual;
      const puntosGanadosEnRangoActual = this.puntosUsuario - puntosRangoActual;
      if (puntosNecesariosParaSiguiente > 0) {
        this.progresoRango = Math.max(0, Math.min(100, (puntosGanadosEnRangoActual / puntosNecesariosParaSiguiente) * 100));
      } else {
        this.progresoRango = (this.puntosUsuario >= puntosRangoActual) ? 100 : 0;
      }
    } else {
      this.siguienteRangoDetalles = null;
      this.progresoRango = 100;
    }
  }

  getRankImagePath(rankName: string): string | null {
    if (!rankName) return null;
    const rankNameToCompare = rankName.toUpperCase().replace(/\s+/g, '_').trim();
    const rank = this.RANGOS_DEFINIDOS.find(r => r.nombre.toUpperCase().replace(/\s+/g, '_').trim() === rankNameToCompare);
    return rank ? rank.icono : null;
  }

  onRankImageError(event: Event) {
    (event.target as HTMLImageElement).src = this.defaultRankIcon;
  }

  // Método para cargar los avatares comprados por el usuario
  private loadPurchasedAvatars(): void {
    // Solo intenta cargar si el usuario está autenticado
    if (!this.authService.isAuthenticated()) {
      this.purchasedAvatars = [];
      console.log('Usuario no autenticado, no se cargarán avatares');
      return;
    }
    
    this.userPurchasesService.getUserPurchases()
      .pipe(
        map(purchases => purchases.filter(item => 
          item.tipoArticulo === 'AVATAR_PERFIL' && item.activo === true
        ))
      )
      .subscribe({
        next: (avatars) => {
          this.purchasedAvatars = avatars.map(avatar => ({
            id: avatar.id,
            url: avatar.imagenPreviewUrl || '',
            nombre: avatar.nombre
          }));
          console.log('Avatares cargados:', this.purchasedAvatars.length);
        },
        error: (err) => {
          console.error('Error al cargar los avatares comprados:', err);
          this.purchasedAvatars = [];
        }
      });
  }

  // Añade este método a la clase UserProfileDetailsComponent
  public openProfilePhotoDialog(): void {
  // Si no hay usuario autenticado, no abras el diálogo
  if (!this.currentUser) {
    this.snackBar.open('Debes iniciar sesión para cambiar la foto de perfil', 'Cerrar', {
      duration: 3000
    });
    return;
  }
  
  // Asegúrate que purchasedAvatars esté inicializado
  const purchasedAvatars = this.purchasedAvatars || [];
  
  const dialogRef = this.dialog.open(ProfilePhotoDialogComponent, {
    width: '500px',
    data: {
      currentPhotoUrl: this.currentUser?.fotoPerfil,
      purchasedAvatars: purchasedAvatars
    }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      this.updateProfilePhoto(result);
    }
  });
}

  private updateProfilePhoto(photoUrl: string): void {
  if (!this.currentUser) return;

  console.log('Intentando actualizar foto de perfil:', 
    photoUrl.substring(0, 50) + '...' + 
    (photoUrl.length > 100 ? ' (imagen base64 de ' + Math.round(photoUrl.length / 1024) + ' KB)' : ' (URL)'));

  this.isLoading = true;
  this.authService.updateUserProfilePhoto(photoUrl).subscribe({
    next: () => {
      console.log('Foto de perfil actualizada con éxito');
      this.snackBar.open('Foto de perfil actualizada con éxito', 'Cerrar', {
        duration: 3000
      });
      this.isLoading = false;
    },
    error: (error) => {
      console.error('Error detallado al actualizar la foto de perfil:', error);
      this.snackBar.open('Error al actualizar la foto de perfil', 'Cerrar', {
        duration: 5000
      });
      this.isLoading = false;
    }
  });
}
}
