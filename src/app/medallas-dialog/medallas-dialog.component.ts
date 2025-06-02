import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MedallaDetalleDialogComponent, MedallaDetalleData } from '../medalla-detalle-dialog/medalla-detalle-dialog.component'; // Asegúrate que esta importación sea correcta

export interface RangoNivelDialog {
  nombre: string;
  icono: string;
  conseguida: boolean;
  descripcion?: string;
  mensajeMotivacional?: string;
  puntosMinimos?: number;
  fechaConseguida?: string; // Fecha como string (ISO 8601) o undefined
}

export interface MedallasDialogData {
  medallas: RangoNivelDialog[];
}

@Component({
  selector: 'app-medallas-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatIconModule,
    MatTooltipModule,
    MatButtonModule
  ],
  templateUrl: './medallas-dialog.component.html',
  styleUrls: ['./medallas-dialog.component.css']
})
export class MedallasDialogComponent implements OnInit {

  constructor(
    public dialogRef: MatDialogRef<MedallasDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MedallasDialogData,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    // console.log('Medallas recibidas en el diálogo:', this.data.medallas);
  }

  abrirDetalleMedalla(medalla: RangoNivelDialog): void {
    if (medalla.conseguida) {
      this.dialog.open<MedallaDetalleDialogComponent, MedallaDetalleData>(MedallaDetalleDialogComponent, {
        width: '500px',
        maxWidth: '90vw',
        data: {
          nombre: medalla.nombre,
          icono: medalla.icono,
          conseguida: medalla.conseguida, // <--- AÑADE ESTA LÍNEA
          descripcion: medalla.descripcion || 'No hay descripción detallada disponible.',
          fechaConseguida: medalla.fechaConseguida,
          puntosMinimos: medalla.puntosMinimos,
          mensajeMotivacional: medalla.mensajeMotivacional
        },
        panelClass: 'medalla-detalle-dialog-panel'
      });
    }
  }

  cerrarDialogo(): void {
    this.dialogRef.close();
  }
}
