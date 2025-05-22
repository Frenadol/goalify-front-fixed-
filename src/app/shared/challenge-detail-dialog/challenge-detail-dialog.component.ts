import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { CommonModule, DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card'; // Para un mejor layout
import { MatDividerModule } from '@angular/material/divider';
import { UserChallengeDetail } from '../../user-profile-details/user-profile-details.component'; // Ajusta la ruta si es necesario

@Component({
  selector: 'app-challenge-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule
  ],
  templateUrl: './challenge-detail-dialog.component.html',
  styleUrls: ['./challenge-detail-dialog.component.css']
})
export class ChallengeDetailDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ChallengeDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: UserChallengeDetail
  ) {}

  onClose(): void {
    this.dialogRef.close();
  }

  // Helper para obtener la clase de estado
  getStatusClass(status: string): string {
    return 'status-' + status.toLowerCase().replace(/\s+/g, '_');
  }
}