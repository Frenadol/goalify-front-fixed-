import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { TitleCasePipe } from '@angular/common';

// Esta interfaz representa los datos que esperamos para este diálogo.
export interface MedallaDetalleData { // <--- CAMBIA EL NOMBRE AQUÍ
  nombre: string;
  icono: string;
  conseguida: boolean; // Es bueno tenerlo para consistencia o futuras lógicas
  descripcion?: string;
  mensajeMotivacional?: string;
  puntosMinimos?: number;
  fechaConseguida?: string | Date;
}

@Component({
  selector: 'app-medalla-detalle-dialog',
  templateUrl: './medalla-detalle-dialog.component.html',
  styleUrls: ['./medalla-detalle-dialog.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    TitleCasePipe,
    NgOptimizedImage
  ]
})
export class MedallaDetalleDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<MedallaDetalleDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MedallaDetalleData // <--- Y TAMBIÉN AQUÍ
  ) {}

  cerrarDialogo(): void {
    this.dialogRef.close();
  }
}
