import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { Challenge } from '../challenge.model';
import { ChallengeService } from '../challenge.service';
import { AuthService } from '../../auth.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';

@Component({
  selector: 'app-challenge-card',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule,
    RouterModule
  ],
  templateUrl: './challenge-card.component.html',
  styleUrls: ['./challenge-card.component.css']
})
export class ChallengeCardComponent {
  @Input() challenge!: Challenge;
  @Input() isJoined: boolean = false;
  @Input() userChallengeStatus?: string;
  @Input() canBeCompleted: boolean = false;
  @Input() isUserChallenge: boolean = false; // <--- ASEGÚRATE DE QUE ESTA LÍNEA ESTÉ EXACTAMENTE ASÍ Y SE HAYA GUARDADO EL ARCHIVO

  @Output() challengeJoined = new EventEmitter<number>();
  @Output() challengeLeft = new EventEmitter<number>();
  @Output() challengeDeleted = new EventEmitter<number>();
  @Output() completeChallengeClicked = new EventEmitter<number>(); // o EventEmitter<Challenge> si prefieres pasar el objeto entero
  @Output() viewDetails = new EventEmitter<Challenge>(); // Si MyChallengesListComponent emite esto

  isJoining: boolean = false;
  isLeaving: boolean = false;
  isDeleting: boolean = false;
  isCompletingAction: boolean = false;
  actionError: string | null = null;
  isAdmin: boolean = false;

  constructor(
    private challengeService: ChallengeService,
    private authService: AuthService,
    private dialog: MatDialog
  ) {
    this.isAdmin = this.authService.isAdmin();
  }

  joinChallenge(): void {
    if (!this.challenge || typeof this.challenge.id === 'undefined' || this.isJoining || this.isJoined) {
      return;
    }
    this.isJoining = true;
    this.actionError = null;
    this.challengeService.joinChallenge(this.challenge.id).subscribe({
      next: () => {
        this.isJoining = false;
        this.isJoined = true;
        this.challengeJoined.emit(this.challenge.id!);
      },
      error: (err) => {
        this.isJoining = false;
        this.actionError = err.message || 'Error al unirse al desafío.';
        console.error('Error al unirse al desafío:', err);
      }
    });
  }

  leaveChallenge(): void {
    if (!this.challenge || typeof this.challenge.id === 'undefined' || this.isLeaving || !this.isJoined) {
      return;
    }
    this.isLeaving = true;
    this.actionError = null;
    this.challengeService.leaveChallenge(this.challenge.id).subscribe({
      next: () => {
        this.isLeaving = false;
        this.isJoined = false;
        this.challengeLeft.emit(this.challenge.id!);
      },
      error: (err) => {
        this.isLeaving = false;
        this.actionError = err.message || 'Error al abandonar el desafío.';
        console.error('Error al abandonar el desafío:', err);
      }
    });
  }

  confirmDeleteChallenge(): void {
    if (!this.challenge || typeof this.challenge.id === 'undefined' || !this.isAdmin) {
      return;
    }
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '350px',
      data: {
        title: 'Confirmar Eliminación',
        message: `¿Estás seguro de que quieres eliminar el desafío "${this.challenge.nombre}"? Esta acción no se puede deshacer y se eliminará para todos los usuarios.`
      }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.deleteChallenge();
      }
    });
  }

  private deleteChallenge(): void {
    if (!this.challenge || typeof this.challenge.id === 'undefined' || this.isDeleting) {
         return;
    }
    this.isDeleting = true;
    this.actionError = null;
    this.challengeService.deleteChallenge(this.challenge.id!).subscribe({
      next: () => {
        this.isDeleting = false;
        this.challengeDeleted.emit(this.challenge.id!);
      },
      error: (err) => {
        this.isDeleting = false;
        this.actionError = err.message || 'Error al eliminar el desafío.';
        console.error('Error al eliminar el desafío:', err);
      }
    });
  }

  onCompleteChallenge(): void {
    if (!this.challenge || typeof this.challenge.id === 'undefined' || this.isCompletingAction || this.userChallengeStatus === 'COMPLETADO') {
      console.warn('ChallengeCard: No se puede completar el desafío.', this.challenge, this.userChallengeStatus);
      return;
    }
    // Asegúrate de emitir el ID del desafío o el objeto MyChallengeDisplayItem según lo que espere el manejador
    this.completeChallengeClicked.emit(this.challenge.id); // Emite el ID del Challenge original
  }

  get canShowCompleteButton(): boolean {
    return this.canBeCompleted && this.isJoined && this.userChallengeStatus !== 'COMPLETADO' && !this.isAdmin;
  }

  // Método para emitir el evento viewDetails cuando se hace clic en la tarjeta (si es necesario)
  onCardClick(): void {
    if (this.isUserChallenge) { // Solo emitir si es una tarjeta de "Mis Desafíos"
      this.viewDetails.emit(this.challenge);
    }
    // Si es una tarjeta de la lista general y quieres un comportamiento diferente al hacer clic,
    // puedes añadir lógica aquí o manejarlo directamente en la plantilla de ChallengeListComponent.
  }
}