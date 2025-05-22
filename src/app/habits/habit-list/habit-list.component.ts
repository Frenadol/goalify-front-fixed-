// filepath: src/app/habits/habit-list/habit-list.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core'; // Asegúrate que OnInit y OnDestroy estén aquí
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subscription, of } from 'rxjs'; // 'of' podría ser necesario para manejo de errores
import { catchError, map, switchMap } from 'rxjs/operators'; // Asegúrate que estos operadores estén
import { AuthService } from '../../auth.service'; // Ajusta la ruta si es necesario
import { HabitService } from '../habit.service'; // Asegúrate que la ruta es correcta
import { Habit } from '../../models/habit.model'; // Asegúrate que la ruta es correcta
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ConfirmDialogComponent, DialogData } from '../../shared/confirm-dialog.component'; // Ajusta la ruta
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip'; // Añadido para tooltips

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
    MatTooltipModule
  ],
  templateUrl: './habit-list.component.html',
  styleUrls: ['./habit-list.component.css']
})
export class HabitListComponent implements OnInit, OnDestroy {
  allHabits: Habit[] = []; // Almacenará todos los hábitos del usuario
  displayedHabits: Habit[] = []; // Hábitos filtrados para mostrar (no completados hoy)
  isLoading = false;
  errorMessage: string | null = null;
  private habitsSubscription!: Subscription;

  predefinedHabitsMap: Map<string, string> = new Map([
    ['Hacer ejercicio', 'assets/images/habits/deporte.png'],
    ['Leer un libro', 'assets/images/habits/leer.png'],
    ['Meditar', 'assets/images/habits/meditar.png'],
    ['Beber más agua', 'assets/images/habits/beber agua.png'],
    ['Comer saludable', 'assets/images/habits/comersaludable.png'],
    ['Dormir bien', 'assets/images/habits/dormir.png'],
    ['Dejar de fumar', 'assets/images/habits/fumar.png']
  ]);
  defaultHabitImageUrl = 'assets/images/habits/default-habit.png';

  constructor(
    private habitService: HabitService,
    public authService: AuthService,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadHabits();
  }

  loadHabits(): void {
    this.isLoading = true;
    this.errorMessage = null;
    if (this.habitsSubscription) {
      this.habitsSubscription.unsubscribe();
    }
    this.habitsSubscription = this.habitService.getMyHabits().subscribe({
      next: (data) => {
        this.allHabits = data.map(habit => ({
          ...habit,
          isCompletedToday: this.checkIfCompletedToday(habit.fechaUltimaCompletacion),
          isExpanded: habit.isExpanded || false, // Mantener estado de expansión si ya existe
          isCompletingAction: false
        }));
        this.updateDisplayedHabits();
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = `Error al cargar hábitos: ${err.message || 'Error desconocido'}`;
        this.isLoading = false;
        this.allHabits = [];
        this.displayedHabits = [];
      }
    });
  }

  private updateDisplayedHabits(): void {
    this.displayedHabits = this.allHabits.filter(habit => !habit.isCompletedToday);
  }

  private checkIfCompletedToday(lastCompletionDate?: string | Date | null): boolean {
    if (!lastCompletionDate) {
      return false;
    }
    const today = new Date();
    const completedDate = new Date(lastCompletionDate);

    // Normalizar a medianoche para comparar solo fechas
    today.setHours(0, 0, 0, 0);
    completedDate.setHours(0, 0, 0, 0);

    return today.getTime() === completedDate.getTime();
  }

  getHabitImageUrl(habitName: string): string {
    return this.predefinedHabitsMap.get(habitName) || this.defaultHabitImageUrl;
  }

  toggleHabitDetails(habit: Habit): void {
    // Buscar en allHabits para asegurar que se modifica el objeto correcto
    const habitInAll = this.allHabits.find(h => h.id === habit.id);
    if (habitInAll) {
      habitInAll.isExpanded = !habitInAll.isExpanded;
    }
    // No es necesario llamar a updateDisplayedHabits aquí si solo cambia la expansión
  }

  confirmCompleteHabit(habit: Habit): void {
    // El hábito que se pasa aquí es de displayedHabits, pero la lógica de completar
    // debe operar sobre el objeto en allHabits y luego refrescar displayedHabits.
    const habitToComplete = this.allHabits.find(h => h.id === habit.id);
    if (habitToComplete && !habitToComplete.isCompletedToday && !habitToComplete.isCompletingAction) {
      this.completeHabitAndUpdate(habitToComplete);
    }
  }

  private completeHabitAndUpdate(habitToComplete: Habit): void {
    if (!habitToComplete.id) return;

    habitToComplete.isCompletingAction = true;
    this.errorMessage = null;

    this.habitService.completeHabit(habitToComplete.id).subscribe({
      next: (updatedHabitFromBackend) => {
        const index = this.allHabits.findIndex(h => h.id === habitToComplete.id);
        if (index !== -1) {
          this.allHabits[index] = {
            ...this.allHabits[index], // Mantener propiedades de UI como isExpanded
            ...updatedHabitFromBackend,
            isCompletedToday: this.checkIfCompletedToday(updatedHabitFromBackend.fechaUltimaCompletacion),
            isCompletingAction: false
          };
          this.updateDisplayedHabits(); // Esto hará que desaparezca de la lista si se completó
        }

        this.snackBar.open(`¡Hábito "${updatedHabitFromBackend.nombre}" completado! +${updatedHabitFromBackend.puntosRecompensa} puntos.`, 'Cerrar', {
          duration: 3500,
          panelClass: ['snackbar-success'],
          horizontalPosition: 'center',
          verticalPosition: 'top'
        });

        // Actualizar puntos del usuario en tiempo real
        this.authService.refreshCurrentUserData().subscribe({
          next: (refreshedUser) => {
            if (refreshedUser) console.log('Puntos del usuario actualizados:', refreshedUser.puntosTotales);
          },
          error: (err) => console.error('Error al refrescar datos del usuario tras completar hábito:', err)
        });
      },
      error: (err) => {
        const index = this.allHabits.findIndex(h => h.id === habitToComplete.id);
        if (index !== -1) {
          this.allHabits[index].isCompletingAction = false;
        }
        
        let specificErrorMessage = `Error al completar "${habitToComplete.nombre}".`;
        if (err.status === 409) { // Hábito ya completado hoy (según la lógica del backend)
            specificErrorMessage = `El hábito "${habitToComplete.nombre}" ya fue completado hoy.`;
            // Asegurarse de que el estado local refleje esto
            if (index !== -1) {
                this.allHabits[index].isCompletedToday = true;
                this.updateDisplayedHabits();
            }
        } else if (err.message) {
            specificErrorMessage = `${specificErrorMessage} ${err.message}`;
        }

        this.errorMessage = specificErrorMessage; // Mostrar error general o específico
        this.snackBar.open(specificErrorMessage, 'Cerrar', {
          duration: 5000,
          panelClass: ['snackbar-error'],
          horizontalPosition: 'center',
          verticalPosition: 'top'
        });
      }
    });
  }

  deleteHabit(habitId: number | undefined): void {
    if (typeof habitId === 'undefined') return;

    const habitToDelete = this.allHabits.find(h => h.id === habitId);
    if (!habitToDelete) return;

    const dialogData: DialogData = {
      title: 'Confirmar Eliminación',
      message: `¿Estás seguro de que quieres eliminar el hábito "${habitToDelete.nombre}"?`
    };

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '350px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.habitService.deleteHabit(habitId).subscribe({
          next: () => {
            this.allHabits = this.allHabits.filter(h => h.id !== habitId);
            this.updateDisplayedHabits();
            this.snackBar.open('Hábito eliminado correctamente.', 'Cerrar', { duration: 3000 });
          },
          error: (err) => {
            this.errorMessage = `Error al eliminar el hábito: ${err.message}`;
            this.snackBar.open(this.errorMessage, 'Cerrar', { duration: 5000, panelClass: ['snackbar-error'] });
          }
        });
      }
    });
  }

  navigateToEdit(id: number | undefined): void {
    if (typeof id !== 'undefined') {
      this.router.navigate(['/habits/edit', id]);
    }
  }

  goToCreateHabitForm(): void {
    this.router.navigate(['/habits/new']);
  }

  ngOnDestroy(): void {
    if (this.habitsSubscription) {
      this.habitsSubscription.unsubscribe();
    }
  }
}