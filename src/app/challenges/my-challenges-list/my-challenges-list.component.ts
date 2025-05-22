import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ChallengeService } from '../challenge.service';
import { AuthService } from '../../auth.service';
import { Challenge } from '../challenge.model';
import { UserChallenge } from '../user-challenge.model';
import { ChallengeCardComponent } from '../challenge-card/challenge-card.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmDialogComponent, DialogData } from '../../shared/confirm-dialog.component';
import { forkJoin, of, Subscription } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

// Interfaz para los elementos que se mostrarán en la lista
export interface MyChallengeDisplayItem {
  challenge: Challenge;
  userChallenge: UserChallenge;
  isCompletingAction?: boolean; // Para el spinner en la tarjeta
}

@Component({
  selector: 'app-my-challenges-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ChallengeCardComponent,
    MatProgressSpinnerModule,
    MatIconModule,
    MatSnackBarModule,
    MatDialogModule,
    ConfirmDialogComponent // Asegúrate que ConfirmDialogComponent esté importado si lo usas directamente
  ],
  templateUrl: './my-challenges-list.component.html',
  styleUrls: ['./my-challenges-list.component.css']
})
export class MyChallengesListComponent implements OnInit {
  userChallengeItems: MyChallengeDisplayItem[] = [];
  isLoading = true;
  errorMessage: string | null = null;
  private dataSubscription?: Subscription;


  constructor(
    private challengeService: ChallengeService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
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
        if (userChallenges.length === 0) {
          return of([]); // No hay desafíos unidos, devuelve un array vacío
        }
        // Para cada UserChallenge, obtenemos los detalles completos del Challenge
        const challengeDetailObservables = userChallenges.map(uc =>
          this.challengeService.getChallengeById(uc.desafioId).pipe(
            map(challengeDetails => ({ challenge: challengeDetails, userChallenge: uc } as MyChallengeDisplayItem)),
            catchError(err => {
              console.error(`Error al cargar detalles del desafío ${uc.desafioId}:`, err);
              return of(null); // Devuelve null si un desafío falla para no romper todo el stream
            })
          )
        );
        return forkJoin(challengeDetailObservables);
      }),
      map(items => items.filter((item): item is MyChallengeDisplayItem => item !== null)), // Filtra los nulos
      catchError(err => {
        this.errorMessage = `Error al cargar tus desafíos: ${err.message || 'Error desconocido'}`;
        this.isLoading = false;
        return of([]); // Devuelve un array vacío en caso de error principal
      })
    ).subscribe({
      next: (detailedItems: MyChallengeDisplayItem[]) => {
        this.userChallengeItems = detailedItems.map(item => ({...item, isCompletingAction: false }));
        this.isLoading = false;
      },
      error: (err) => {
        // Este error ya debería estar manejado por el catchError de arriba,
        // pero por si acaso.
        this.errorMessage = `Error final al procesar desafíos: ${err.message || 'Error desconocido'}`;
        this.isLoading = false;
        this.userChallengeItems = [];
      }
    });
  }

  handleChallengeLeft(challengeId: number): void {
    this.userChallengeItems = this.userChallengeItems.filter(
      item => item.challenge.id !== challengeId
    );
    this.snackBar.open('Has abandonado el desafío.', 'Cerrar', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
    });
    if (this.userChallengeItems.length === 0) {
      // Podrías querer mostrar un mensaje específico si la lista queda vacía
    }
  }

  handleCompleteChallengeRequest(itemClicked: MyChallengeDisplayItem): void {
    if (itemClicked.userChallenge.estadoParticipacion === 'COMPLETADO') {
        this.snackBar.open(`El desafío "${itemClicked.challenge.nombre}" ya está completado.`, 'Cerrar', { duration: 3000 });
        return;
    }

    const dialogData: DialogData = {
      title: "Confirmar Finalización",
      message: `Estás a punto de marcar "${itemClicked.challenge.nombre}" como completado. ¿Estás seguro de que lo has finalizado?`
    };

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      maxWidth: "450px",
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(dialogResult => {
      if (dialogResult) {
        this.completeChallengeAndUpdate(itemClicked);
      }
    });
  }

  private completeChallengeAndUpdate(itemToComplete: MyChallengeDisplayItem): void {
    if (!itemToComplete.challenge.id || itemToComplete.isCompletingAction) {
      return;
    }

    itemToComplete.isCompletingAction = true;
    this.errorMessage = null;

    this.challengeService.completeUserChallenge(itemToComplete.challenge.id).subscribe({
      next: (updatedUserChallenge) => {
        const index = this.userChallengeItems.findIndex(item => item.challenge.id === itemToComplete.challenge.id);
        if (index !== -1) {
          this.userChallengeItems[index].userChallenge = updatedUserChallenge;
          this.userChallengeItems[index].isCompletingAction = false;
          // Si el estado es 'COMPLETADO', podrías querer moverlo a otra lista o simplemente actualizar la UI
        }

        this.snackBar.open(`¡Desafío "${itemToComplete.challenge.nombre}" completado! Se han sumado ${itemToComplete.challenge.puntosRecompensa || 0} puntos.`, 'Cerrar', {
          duration: 4000,
          panelClass: ['snackbar-success'],
          horizontalPosition: 'center',
          verticalPosition: 'top'
        });

        // Actualizar puntos del usuario en tiempo real
        this.authService.refreshCurrentUserData().subscribe({
          next: (refreshedUser) => {
            if (refreshedUser) console.log('Puntos del usuario actualizados:', refreshedUser.puntosTotales);
          },
          error: (err) => console.error('Error al refrescar datos del usuario tras completar desafío:', err)
        });
      },
      error: (err) => {
        itemToComplete.isCompletingAction = false;
        this.errorMessage = `Error al completar "${itemToComplete.challenge.nombre}": ${err.message || 'Error desconocido'}`;
        this.snackBar.open(this.errorMessage, 'Cerrar', {
          duration: 5000,
          panelClass: ['snackbar-error'],
          horizontalPosition: 'center',
          verticalPosition: 'top'
        });
      }
    });
  }
  
  ngOnDestroy(): void {
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }
  }
}