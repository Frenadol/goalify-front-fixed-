// filepath: c:\Users\Fernando\Downloads\Goalify-frontend-main (1)\Goalify-frontend-main\src\app\user-statistics\habit-detail-dialog\habit-detail-dialog.component.ts
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule, DatePipe } from '@angular/common';
import { MatDividerModule } from '@angular/material/divider';
import { Habit } from '../../models/habit.model';
import { StatisticEntry } from '../../statistics/statistic.model'; // Asegúrate que esta es la interfaz correcta

export interface HabitDetailDialogData {
  habit: Habit;
  completion: StatisticEntry & { puntosGanados?: number }; // MODIFICAR AQUÍ para indicar que completion puede tener puntosGanados
}

@Component({
  selector: 'app-habit-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    MatDialogModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule
  ],
  templateUrl: './habit-detail-dialog.component.html',
  styleUrls: ['./habit-detail-dialog.component.css']
})
export class HabitDetailDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<HabitDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: HabitDetailDialogData // data.completion ahora es de tipo StatisticEntry & { puntosGanados?: number }
  ) {}

  onClose(): void {
    this.dialogRef.close();
  }
}