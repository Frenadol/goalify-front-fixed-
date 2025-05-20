import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../auth.service';
import { AdminService, RandomAssignmentResponse } from '../admin.service'; // Asegúrate que RandomAssignmentResponse esté exportada
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog'; // Importar MatDialog
import { ChallengeCreateAssignDialogComponent, ChallengeCreateAssignDialogResult } from '../challenge-create-assign-dialog/challenge-create-assign-dialog.component'; // Importar el nuevo diálogo
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterModule } from '@angular/router';


@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule, // Para routerLink
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  isAssigningRandom = false; // Para el spinner en la tarjeta (se podría quitar si el modal maneja todo)

  constructor(
    private authService: AuthService,
    private router: Router,
    private adminService: AdminService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog // Inyectar MatDialog
  ) {}

  ngOnInit(): void {
    // Lógica de inicialización si es necesaria
  }

  logout(): void {
    this.authService.logout();
  }

  triggerRandomAssignment(): void {
    const dialogRef = this.dialog.open(ChallengeCreateAssignDialogComponent, {
      width: '600px', // Ajusta el ancho según necesites
      disableClose: true // Evitar que se cierre al hacer clic fuera o presionar ESC mientras carga
    });

    dialogRef.afterClosed().subscribe((result?: ChallengeCreateAssignDialogResult) => {
      if (result && result.success) {
        let message = result.message;
        if (result.assignedUserName && result.assignedChallengeName) {
          message += ` Usuario: ${result.assignedUserName}, Desafío: ${result.assignedChallengeName}.`;
        }
        this.snackBar.open(message, 'Cerrar', {
          duration: 7000, // Más tiempo para leer el resultado
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['snackbar-success']
        });
      } else if (result && !result.success && result.message) {
        // Si hubo un error manejado y devuelto por el diálogo
        this.snackBar.open(`Error: ${result.message}`, 'Cerrar', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['snackbar-error']
        });
      }
      // No hacer nada si el diálogo se canceló (result es undefined)
    });
  }
}