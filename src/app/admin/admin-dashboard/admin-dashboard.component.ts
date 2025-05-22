import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../auth.service';
import { AdminService } from '../admin.service'; // RandomAssignmentResponse ya está definida en admin.service.ts
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ChallengeCreateAssignDialogComponent, ChallengeCreateAssignDialogResult } from '../challenge-create-assign-dialog/challenge-create-assign-dialog.component';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';


@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  isAssigningRandom = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private adminService: AdminService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    // Lógica de inicialización si es necesaria
  }

  logout(): void {
    this.authService.logout();
  }

  triggerRandomAssignment(): void {
    const dialogRef = this.dialog.open(ChallengeCreateAssignDialogComponent, {
      width: '600px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe((result?: ChallengeCreateAssignDialogResult) => {
      if (result && result.success) {
        let messageToShow = result.message; // Mensaje base del backend

        if (result.assignedUserName) {
          // Quita el punto final del mensaje base (si existe) y añade "a [nombreUsuario]."
          const baseMessage = result.message.endsWith('.') ? result.message.slice(0, -1) : result.message;
          messageToShow = `${baseMessage} a ${result.assignedUserName}.`; // <<< CAMBIO AQUÍ
        }
        
        this.snackBar.open(messageToShow, 'Cerrar', {
          duration: 7000, 
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
          panelClass: ['snackbar-success'] 
        });
      } else if (result && !result.success && result.message) {
        this.snackBar.open(`Error: ${result.message}`, 'Cerrar', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
          panelClass: ['snackbar-error']
        });
      }
    });
  }
}