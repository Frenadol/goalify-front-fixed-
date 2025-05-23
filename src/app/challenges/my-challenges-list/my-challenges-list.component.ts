import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { Subscription, forkJoin, of } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';

import { ChallengeService } from '../challenge.service';
import { AuthService } from '../../auth.service';
import { Challenge } from '../challenge.model';
import { UserChallenge } from '../user-challenge.model';
import { ChallengeCardComponent } from '../challenge-card/challenge-card.component';
import { ConfirmDialogComponent, DialogData } from '../../shared/confirm-dialog.component';
import { ChallengeDetailDialogComponent } from '../../shared/challenge-detail-dialog/challenge-detail-dialog.component';
import { UserChallengeDetail } from '../../user-profile-details/user-profile-details.component';


// Interfaz para los elementos que se mostrarán en la lista
export interface MyChallengeDisplayItem {
  id: string | number;
  nombre: string;
  descripcionBreve?: string;
  descripcionDetallada?: string;
  puntos?: number;
  fechaInicio?: Date | string;
  fechaFin?: Date | string;
  isCompleted?: boolean;
  progresoActual?: number;
  progresoObjetivo?: number;
  challengeOriginal: Challenge; // El objeto Challenge original
  userChallengeId: string | number;
  estado?: string;
  // Añade cualquier otra propiedad que necesites de Challenge o UserChallenge
}

@Component({
  selector: 'app-my-challenges-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ChallengeCardComponent,
    MatProgressSpinnerModule,
    MatIconModule,
    MatButtonModule,
    MatSnackBarModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ConfirmDialogComponent
  ],
  templateUrl: './my-challenges-list.component.html',
  styleUrls: ['./my-challenges-list.component.css']
})
export class MyChallengesListComponent implements OnInit, OnDestroy {
  allMyChallenges: MyChallengeDisplayItem[] = [];
  filteredChallenges: MyChallengeDisplayItem[] = [];
  isLoading = true;
  errorMessage: string | null = null;

  searchTerm: string = '';
  statusFilter: string = 'pendientes';
  filterOptions = [
    { value: 'todos', viewValue: 'Todos Mis Desafíos' },
    { value: 'pendientes', viewValue: 'Pendientes' },
    { value: 'completados', viewValue: 'Completados' }
  ];

  private dataSubscription?: Subscription;

  constructor(
    private challengeService: ChallengeService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadUserJoinedChallenges();
  }

  loadUserJoinedChallenges(): void {
    this.isLoading = true;
    this.errorMessage = null;
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }

    this.dataSubscription = this.challengeService.getMyJoinedChallenges().pipe(
      switchMap((userChallenges: UserChallenge[]) => {
        if (!userChallenges || userChallenges.length === 0) {
          this.allMyChallenges = [];
          this.filteredChallenges = [];
          this.isLoading = false;
          return of([]); // Devuelve un observable de array vacío
        }
        const challengeDetailObservables = userChallenges.map(uc =>
          this.challengeService.getChallengeById(uc.desafioId).pipe(
            map(challengeDetails => {
              // Construye el objeto Challenge para challengeOriginal
              const originalChallenge: Challenge = {
                id: challengeDetails.id,
                nombre: challengeDetails.nombre,
                descripcion: challengeDetails.descripcion,
                fechaInicio: challengeDetails.fechaInicio,
                fechaFin: challengeDetails.fechaFin,
                puntosRecompensa: challengeDetails.puntosRecompensa,
                estado: challengeDetails.estado,
                tipo: challengeDetails.tipo,
                categoria: challengeDetails.categoria,
                imageUrl: challengeDetails.imageUrl
              };

              return {
                id: uc.desafioId, // ID del desafío para la clave y otras operaciones
                nombre: originalChallenge.nombre, // Nombre principal para mostrar y filtrar
                descripcionBreve: originalChallenge.descripcion?.substring(0, 100) + (originalChallenge.descripcion && originalChallenge.descripcion.length > 100 ? '...' : ''),
                descripcionDetallada: originalChallenge.descripcion,
                puntos: originalChallenge.puntosRecompensa,
                fechaInicio: originalChallenge.fechaInicio,
                fechaFin: originalChallenge.fechaFin,
                isCompleted: uc.estadoParticipacion === 'COMPLETADO',
                // progresoActual: ..., // Lógica para progreso si la tienes
                // progresoObjetivo: ..., // Lógica para progreso si la tienes
                challengeOriginal: originalChallenge, // Asigna el objeto Challenge completo
                userChallengeId: uc.desafioId, // O el ID de la entidad UserChallenge si es diferente y lo tienes
                estado: uc.estadoParticipacion,
              } as MyChallengeDisplayItem;
            }),
            catchError(error => {
              console.error(`Error al cargar detalles para el desafío ${uc.desafioId}:`, error);
              // Devuelve un item con challengeOriginal parcialmente vacío o con valores por defecto
              // para evitar que la aplicación se rompa completamente.
              // La tarjeta mostrará 'Nombre no disponible' etc.
              const fallbackChallenge: Challenge = {
                id: uc.desafioId,
                nombre: uc.nombreDesafio || 'Error al cargar nombre',
                descripcion: 'Detalles no disponibles',
                fechaInicio: new Date().toISOString(),
                fechaFin: new Date().toISOString(),
                puntosRecompensa: 0,
                categoria: 'Desconocida'
              };
              return of({
                id: uc.desafioId,
                nombre: uc.nombreDesafio || 'Error al cargar nombre',
                isCompleted: uc.estadoParticipacion === 'COMPLETADO',
                challengeOriginal: fallbackChallenge,
                userChallengeId: uc.desafioId,
                estado: uc.estadoParticipacion,
                descripcionBreve: 'Detalles no disponibles',
              } as MyChallengeDisplayItem);
            })
          )
        );
        return forkJoin(challengeDetailObservables);
      }),
      catchError(err => {
        this.errorMessage = 'Error al cargar tus desafíos. Inténtalo de nuevo más tarde.';
        console.error('Error loading user challenges:', err);
        this.isLoading = false;
        this.allMyChallenges = [];
        this.filteredChallenges = [];
        return of([] as MyChallengeDisplayItem[]); // Devuelve un observable de array vacío en caso de error
      })
    ).subscribe({
      next: (displayItems: MyChallengeDisplayItem[]) => {
        this.allMyChallenges = displayItems.filter(item => item.challengeOriginal && item.challengeOriginal.nombre !== 'Error al cargar nombre'); // Filtra los que fallaron completamente si es necesario
        this.applyFilters();
        this.isLoading = false;
      },
      // El error ya se maneja en catchError
    });
  }

  applyFilters(): void {
    let challenges = [...this.allMyChallenges];

    if (this.statusFilter === 'completados') {
      challenges = challenges.filter(challenge => challenge.isCompleted === true);
    } else if (this.statusFilter === 'pendientes') {
      challenges = challenges.filter(challenge => challenge.isCompleted !== true);
    }

    if (this.searchTerm && this.searchTerm.trim() !== '') {
      const lowerSearchTerm = this.searchTerm.toLowerCase().trim();
      challenges = challenges.filter(challenge =>
        challenge.nombre.toLowerCase().includes(lowerSearchTerm)
      );
    }
    this.filteredChallenges = challenges;
  }

  openChallengeDetailsDialog(challengeItem: MyChallengeDisplayItem): void {
    if (!challengeItem.challengeOriginal || !challengeItem.challengeOriginal.id) {
        console.error("Challenge original no disponible o incompleto para el diálogo de detalles", challengeItem);
        this.snackBar.open('No se pueden mostrar los detalles completos del desafío.', 'Cerrar', { duration: 3000 });
        return;
    }

    // Construir el objeto UserChallenge a partir de MyChallengeDisplayItem
    const userChallengeData: UserChallenge = {
        usuarioId: this.authService.currentUserValue?.id || '', // Necesitas el ID del usuario
        desafioId: challengeItem.challengeOriginal.id,
        fechaInscripcion: challengeItem.fechaInicio, // O la fecha de inscripción real si la tienes separada
        estadoParticipacion: challengeItem.estado || 'INSCRITO', // El estado de participación del usuario
        nombreDesafio: challengeItem.nombre,
        descripcionDesafio: challengeItem.descripcionDetallada,
        puntosDesafio: challengeItem.puntos,
        fechaCompletado: challengeItem.isCompleted ? (challengeItem.estado === 'COMPLETADO' ? new Date() : null) : null // Asumir fecha actual si está completado
    };

    const dialogData: UserChallengeDetail = {
        ...challengeItem.challengeOriginal, // Propiedades de Challenge
        userChallengeData: userChallengeData // Propiedades de UserChallenge
    };
    
    this.dialog.open(ChallengeDetailDialogComponent, {
        width: '600px',
        data: dialogData,
        panelClass: 'challenge-detail-dialog-panel' // Clase para estilos globales si es necesario
    });
  }


  handleChallengeLeft(challengeId: number | string): void {
    this.allMyChallenges = this.allMyChallenges.filter(
      item => item.id !== challengeId
    );
    this.applyFilters();
    this.snackBar.open('Has abandonado el desafío.', 'Cerrar', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
    });
  }

  handleCompleteChallengeRequest(itemClicked: MyChallengeDisplayItem): void {
    if (itemClicked.isCompleted) {
      this.snackBar.open('Este desafío ya está marcado como completado.', 'Cerrar', { duration: 3000 });
      return;
    }

    const dialogDataConfirm: DialogData = {
      title: "Confirmar Finalización",
      message: `Estás a punto de marcar "${itemClicked.nombre}" como completado. ¿Estás seguro de que lo has finalizado?`
    };

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: dialogDataConfirm
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.completeChallengeAndUpdate(itemClicked);
      }
    });
  }

  private completeChallengeAndUpdate(itemToComplete: MyChallengeDisplayItem): void {
    const challengeId = itemToComplete.id as number;

    this.challengeService.completeUserChallenge(challengeId).subscribe({
      next: (updatedUserChallenge) => {
        const index = this.allMyChallenges.findIndex(item => item.id === itemToComplete.id);
        if (index > -1) {
          this.allMyChallenges[index].isCompleted = true;
          this.allMyChallenges[index].estado = updatedUserChallenge.estadoParticipacion;
          // Actualiza también la fecha de completado si la tienes en MyChallengeDisplayItem
          // this.allMyChallenges[index].fechaCompletado = updatedUserChallenge.fechaCompletado;
        }
        this.applyFilters();
        this.snackBar.open(`¡Felicidades! Has completado "${itemToComplete.nombre}".`, 'Cerrar', { duration: 3000 });
        
        this.authService.refreshCurrentUserData().subscribe();
      },
      error: (err) => {
        this.snackBar.open(`Error al completar el desafío: ${err.message || 'Error desconocido'}`, 'Cerrar', { duration: 3000 });
        console.error('Error completing challenge', err);
      }
    });
  }
  
  ngOnDestroy(): void {
    this.dataSubscription?.unsubscribe();
  }
}