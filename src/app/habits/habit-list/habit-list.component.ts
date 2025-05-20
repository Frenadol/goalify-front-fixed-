// filepath: src/app/habits/habit-list/habit-list.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Habit } from '../../models/habit.model';
import { HabitService } from '../habit.service';
import { CommonModule } from '@angular/common'; // Para *ngFor, etc.
import { RouterModule } from '@angular/router'; // Para routerLink
import { Subscription } from 'rxjs';
import { AuthService } from '../../auth.service'; // Si necesitas verificar autenticación

// Definición de la interfaz (puedes importarla si la tienes en un archivo separado)
interface PredefinedHabit {
  id: string;
  name: string;
  displayName: string;
  imageUrl: string;
  defaultDescription?: string;
}

@Component({
  selector: 'app-habit-list',
  standalone: true,
  imports: [CommonModule, RouterModule], // Importa CommonModule y RouterModule
  templateUrl: './habit-list.component.html',
  styleUrls: ['./habit-list.component.css']
})
export class HabitListComponent implements OnInit, OnDestroy {
  habits: Habit[] = [];
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
    // ...Añade otros si los tienes
  ]);
  defaultHabitImageUrl = 'assets/images/habits/default-habit.png'; // Una imagen por defecto

  constructor(
    private habitService: HabitService,
    public authService: AuthService, // Para el botón de "Crear Hábito"
    private router: Router
    ) {}

  ngOnInit(): void {
    this.loadHabits();
  }

  loadHabits(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.habitsSubscription = this.habitService.getMyHabits().subscribe({
      next: (data) => {
        this.habits = data;
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = err.message || 'No se pudieron cargar los hábitos.';
        this.isLoading = false;
        console.error('Error loading habits:', err);
      }
    });
  }

  getHabitImageUrl(habitName: string): string {
    return this.predefinedHabitsMap.get(habitName) || this.defaultHabitImageUrl;
  }

  deleteHabit(habitId: number | undefined): void {
    if (habitId === undefined) {
      console.error('ID de hábito indefinido, no se puede eliminar.');
      this.errorMessage = 'Error: ID de hábito no válido.';
      return;
    }
    if (confirm('¿Estás seguro de que quieres eliminar este hábito?')) {
      this.isLoading = true;
      this.habitService.deleteHabit(habitId).subscribe({
        next: () => {
          this.isLoading = false;
          this.habits = this.habits.filter(habit => habit.id !== habitId);
          // Opcional: mostrar mensaje de éxito
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err.message || 'No se pudo eliminar el hábito.';
          console.error('Error deleting habit:', err);
        }
      });
    }
  }

  navigateToEdit(id: number): void {
    this.router.navigate(['/habits/edit', id]);
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