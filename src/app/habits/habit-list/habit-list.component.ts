// filepath: src/app/habits/habit-list/habit-list.component.ts
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Subscription, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

 import { Habit } from '../../models/habit.model';
import { HabitService } from '../habit.service';
import { AuthService, User } from '../../auth.service';
import { ConfirmDialogComponent, DialogData } from '../../shared/confirm-dialog.component'; 

interface HabitUIMode extends Habit {
  // Habit ya incluye id, nombre, fechaCreacion, isCompletingAction, isCompletedToday, isExpanded
  // No es necesario redeclararlos aquí si la interfaz Habit está correctamente definida e importada.
  // Si alguna propiedad específica de UI no está en Habit, añádela aquí.
  // Por ejemplo, si isExpanded fuera solo de UI y no del modelo base:
  // isExpanded?: boolean; 
}

@Component({
  selector: 'app-habit-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    TitleCasePipe,
    DatePipe,
    MatTooltipModule,
    // ConfirmDialogComponent // No es necesario importarlo aquí si solo se usa a través de MatDialog.open()
  ],
  templateUrl: './habit-list.component.html',
  styleUrls: ['./habit-list.component.css']
})
export class HabitListComponent implements OnInit, OnDestroy {
  allHabits: HabitUIMode[] = [];
  displayedHabits: HabitUIMode[] = [];
  isLoading = false;
  errorMessage: string | null = null;
  private habitsSubscription: Subscription | undefined;
  private userSubscription: Subscription | undefined;
  private today: string;

  // Inyección de dependencias moderna con inject() o usando el constructor
  private habitService = inject(HabitService);
  private authService = inject(AuthService);
  private router = inject(Router);
  public dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  constructor() {
    const now = new Date();
    this.today = now.toISOString().split('T')[0];
  }

  ngOnInit(): void {
    this.isLoading = true;
    this.userSubscription = this.authService.currentUser.subscribe((user: User | null) => {
      if (user) {
        this.loadHabits();
      } else {
        this.isLoading = false;
        this.errorMessage = 'Debes iniciar sesión para ver tus hábitos.';
        this.allHabits = [];
        this.displayedHabits = [];
      }
    });
  }

  loadHabits(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.habitsSubscription = this.habitService.getMyHabits().pipe(
      map((habits: Habit[]): HabitUIMode[] => habits.map((habit: Habit) => ({
        ...habit,
        isExpanded: habit.isExpanded || false, // Asegurar que isExpanded tenga un valor
        isCompletedToday: this.checkIfCompletedToday(habit.fechaUltimaCompletacion),
        isCompletingAction: habit.isCompletingAction || false // Asegurar que isCompletingAction tenga un valor
      }))),
      catchError((error: any) => {
        console.error('Error al cargar hábitos:', error);
        this.errorMessage = 'No se pudieron cargar los hábitos. Inténtalo de nuevo más tarde.';
        this.isLoading = false;
        return of([] as HabitUIMode[]);
      })
    ).subscribe((habitsWithUIState: HabitUIMode[]) => {
      this.allHabits = habitsWithUIState;
      this.updateDisplayedHabits();
      this.isLoading = false;
    });
  }

  private checkIfCompletedToday(lastCompletionDate: string | Date | null | undefined): boolean {
    if (!lastCompletionDate) return false;
    const completionDate = new Date(lastCompletionDate).toISOString().split('T')[0];
    return completionDate === this.today;
  }

  updateDisplayedHabits(): void {
    const activeHabits = this.allHabits.filter(habit => !habit.isCompletedToday);
    this.displayedHabits = activeHabits.sort((a, b) => {
      const dateA = a.fechaCreacion ? new Date(a.fechaCreacion).getTime() : 0;
      const dateB = b.fechaCreacion ? new Date(b.fechaCreacion).getTime() : 0;
      return dateB - dateA;
    });
  }

  get showAllHabitsCompletedMessage(): boolean {
    return !this.isLoading &&
           !this.errorMessage &&
           this.allHabits.length > 0 &&
           this.allHabits.every(h => h.isCompletedToday === true);
  }

  get showHabitsGrid(): boolean {
    return !this.isLoading &&
           !this.errorMessage &&
           this.displayedHabits.length > 0;
  }

  navigateToCreate(): void {
    this.router.navigate(['/habits/new']);
  }

  navigateToEdit(habitId: number): void {
    this.router.navigate(['/habits/edit', habitId]);
  }

  deleteHabit(habitId: number): void {
    const dialogData: DialogData = {
      title: 'Confirmar Eliminación',
      message: '¿Estás seguro de que quieres eliminar este hábito? Esta acción no se puede deshacer.'
    };
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result) {
        this.habitService.deleteHabit(habitId).subscribe({
          next: () => {
            this.snackBar.open('Hábito eliminado correctamente.', 'Cerrar', { duration: 3000 });
            this.loadHabits();
          },
          error: (error: any) => {
            console.error('Error al eliminar hábito:', error);
            this.snackBar.open(error?.error?.message || 'Error al eliminar el hábito.', 'Cerrar', { duration: 3000, panelClass: ['error-snackbar'] });
          }
        });
      }
    });
  }

  toggleHabitDetails(habit: HabitUIMode): void {
    habit.isExpanded = !habit.isExpanded;
  }

  confirmCompleteHabit(habit: HabitUIMode): void {
    if (habit.isCompletedToday || habit.isCompletingAction) {
      return;
    }

    const dialogData: DialogData = {
      title: 'Confirmar Hábito Completado',
      message: `¿Estás seguro de que has completado el hábito "${habit.nombre}"? ¡La honestidad es clave para tu progreso!`
    };

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result) {
        this.completeHabitAndUpdate(habit);
      }
    });
  }

  private completeHabitAndUpdate(habitToComplete: HabitUIMode): void {
    habitToComplete.isCompletingAction = true;
    this.habitService.completeHabit(habitToComplete.id).pipe(
      catchError((error: any) => {
        console.error('Error al completar hábito:', error);
        this.snackBar.open(error?.error?.message || 'Error al completar el hábito.', 'Cerrar', {
          duration: 4000,
          panelClass: ['error-snackbar']
        });
        habitToComplete.isCompletingAction = false;
        return of(null);
      })
    ).subscribe((updatedHabitResponse: Habit | null) => {
      if (updatedHabitResponse) {
        const updatedHabit = updatedHabitResponse;
        this.snackBar.open(`¡Hábito "${updatedHabit.nombre}" completado! Has ganado ${updatedHabit.puntosRecompensa} puntos.`, 'Genial', {
          duration: 3500,
          panelClass: ['success-snackbar']
        });
        const index = this.allHabits.findIndex(h => h.id === updatedHabit.id);
        if (index > -1) {
          this.allHabits[index] = {
            ...this.allHabits[index], // Mantener propiedades de UI que no vengan del backend
            ...updatedHabit,          // Sobrescribir con datos del backend
            isCompletedToday: this.checkIfCompletedToday(updatedHabit.fechaUltimaCompletacion),
            isCompletingAction: false
          };
          this.updateDisplayedHabits();
        }
      } else {
        // Si updatedHabitResponse es null (por el catchError), reseteamos el estado
        habitToComplete.isCompletingAction = false;
      }
    });
  }

  getHabitIcon(habitName: string): string {
    const name = habitName.toLowerCase();
    if (name.includes('leer') || name.includes('libro')) return 'menu_book';
    if (name.includes('fumar')) return 'smoke_free';
    if (name.includes('ejercicio') || name.includes('correr') || name.includes('gimnasio')) return 'directions_run';
    if (name.includes('dormir') || name.includes('sueño')) return 'bedtime';
    if (name.includes('agua') || name.includes('beber')) return 'local_drink';
    if (name.includes('meditar')) return 'self_improvement';
    if (name.includes('estudiar')) return 'school';
    return 'checklist_rtl';
  }

  ngOnDestroy(): void {
    this.habitsSubscription?.unsubscribe();
    this.userSubscription?.unsubscribe();
  }
}