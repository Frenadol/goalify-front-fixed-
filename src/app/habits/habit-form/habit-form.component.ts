// filepath: src/app/habits/habit-form/habit-form.component.ts
import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HabitService } from '../habit.service';
import { Habit, PredefinedHabit, HabitClientPayload } from '../../models/habit.model'; // <--- MODIFICA ESTA LÍNEA
import { CommonModule, TitleCasePipe } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NgxMaterialTimepickerModule } from 'ngx-material-timepicker';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'; // <--- AÑADE ESTA LÍNEA
import { Subscription } from 'rxjs';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-habit-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    NgxMaterialTimepickerModule,
    MatProgressSpinnerModule, // <--- AÑADE ESTO AQUÍ
    TitleCasePipe
  ],
  templateUrl: './habit-form.component.html',
  styleUrls: ['./habit-form.component.css']
})
export class HabitFormComponent implements OnInit, OnDestroy {
  habitForm: FormGroup;
  isEditMode = false;
  habitId: number | null = null;
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  @Output() habitCreated = new EventEmitter<Habit>();
  private subscriptions = new Subscription();

  frecuenciaOptions: string[] = ['DIARIO', 'SEMANAL', 'MENSUAL', 'DIAS_ESPECIFICOS'];
  estadoOptions: string[] = ['activo', 'inactivo'];

  predefinedHabits: PredefinedHabit[] = [
    { id: 'ejercicio', name: 'Hacer ejercicio', displayName: 'Ejercicio', imageUrl: 'assets/images/habits/deporte.png', defaultDescription: 'Dedicar tiempo a la actividad física.', puntosSugeridos: 20, frecuenciaSugerida: 'DIARIO' },
    { id: 'leer', name: 'Leer un libro', displayName: 'Leer', imageUrl: 'assets/images/habits/leer.png', defaultDescription: 'Expandir conocimientos y disfrutar de la lectura.', puntosSugeridos: 15, frecuenciaSugerida: 'DIARIO' },
    { id: 'meditar', name: 'Meditar', displayName: 'Meditar', imageUrl: 'assets/images/habits/meditar.png', defaultDescription: 'Encontrar calma y claridad mental.', puntosSugeridos: 10, frecuenciaSugerida: 'DIARIO' },
    { id: 'agua', name: 'Beber más agua', displayName: 'Beber Agua', imageUrl: 'assets/images/habits/beber agua.png', defaultDescription: 'Mantenerse hidratado durante el día.', puntosSugeridos: 5, frecuenciaSugerida: 'DIARIO' },
    { id: 'saludable', name: 'Comer saludable', displayName: 'Comida Saludable', imageUrl: 'assets/images/habits/comersaludable.png', defaultDescription: 'Nutrir el cuerpo con alimentos beneficiosos.', puntosSugeridos: 15, frecuenciaSugerida: 'DIARIO' },
    { id: 'dormir', name: 'Dormir bien', displayName: 'Dormir Bien', imageUrl: 'assets/images/habits/dormir.png', defaultDescription: 'Asegurar un descanso adecuado de 7-8 horas.', puntosSugeridos: 10, frecuenciaSugerida: 'DIARIO' },
    { id: 'no-fumar', name: 'Dejar de fumar', displayName: 'No Fumar', imageUrl: 'assets/images/habits/fumar.png', defaultDescription: 'Mejorar la salud pulmonar y general.', puntosSugeridos: 25, frecuenciaSugerida: 'DIARIO' }
  ];
  selectedPredefinedHabit: PredefinedHabit | null = null;

  constructor(
    private fb: FormBuilder,
    private habitService: HabitService,
    public router: Router,
    private route: ActivatedRoute
  ) {
    this.habitForm = this.fb.group({
      nombre: ['', Validators.required],
      descripcion: [''],
      frecuencia: ['', Validators.required],
      horaProgramada: [null],
      estado: ['activo', Validators.required],
      // El valor de puntosRecompensa se mostrará, pero el campo será readonly.
      // No necesita validadores aquí si es solo para mostrar y se establece programáticamente.
      puntosRecompensa: [{ value: 0, disabled: true }] // Inicializa como disabled y con un valor
    });
  }

  ngOnInit(): void {
    this.subscriptions.add(
      this.route.paramMap.subscribe(params => {
        const id = params.get('id');
        if (id) {
          this.isEditMode = true;
          this.habitId = +id;
          this.loadHabitData(+id);
          this.habitForm.get('puntosRecompensa')?.enable(); // Habilitar para patchValue, se hará readonly en HTML
        } else {
          this.isEditMode = false;
          this.habitId = null;
          this.habitForm.get('puntosRecompensa')?.disable(); // Deshabilitado en modo creación hasta seleccionar hábito
        }
      })
    );
  }

  loadHabitData(id: number): void {
    this.isLoading = true;
    this.subscriptions.add(
      this.habitService.getHabitById(id).subscribe({
        next: (habit) => {
          this.selectedPredefinedHabit = this.predefinedHabits.find(ph => ph.name === habit.nombre) || {
            id: 'custom', name: habit.nombre, displayName: habit.nombre,
            imageUrl: this.getHabitImageUrl(habit.nombre), // Usar función para obtener imagen
            defaultDescription: habit.descripcion,
            puntosSugeridos: habit.puntosRecompensa,
            frecuenciaSugerida: habit.frecuencia
          };
          
          this.habitForm.get('puntosRecompensa')?.enable(); // Habilitar temporalmente para patchValue
          this.habitForm.patchValue({
            nombre: habit.nombre,
            descripcion: habit.descripcion,
            frecuencia: habit.frecuencia,
            horaProgramada: habit.horaProgramada,
            estado: habit.estado,
            puntosRecompensa: habit.puntosRecompensa // Mostrar los puntos existentes
          });
          // this.habitForm.get('puntosRecompensa')?.disable(); // Volver a deshabilitar si se quiere control estricto, pero readonly en HTML es suficiente
          this.isLoading = false;
        },
        error: (err) => {
          this.errorMessage = `Error al cargar el hábito: ${err.message || 'Error desconocido.'}`;
          this.isLoading = false;
        }
      })
    );
  }

  selectHabit(habit: PredefinedHabit): void {
    this.selectedPredefinedHabit = habit;
    this.habitForm.get('puntosRecompensa')?.enable(); // Habilitar para patchValue
    this.habitForm.patchValue({
      nombre: habit.name,
      descripcion: habit.defaultDescription || '',
      frecuencia: habit.frecuenciaSugerida || this.frecuenciaOptions[0],
      puntosRecompensa: habit.puntosSugeridos !== undefined ? habit.puntosSugeridos : 0
    });
    // this.habitForm.get('puntosRecompensa')?.disable(); // Opcional: deshabilitar después de setear
  }

  // Función auxiliar para obtener la URL de la imagen (similar a la de habit-list)
  getHabitImageUrl(habitName: string): string {
    const predefined = this.predefinedHabits.find(ph => ph.name === habitName);
    return predefined ? predefined.imageUrl : 'assets/images/habits/default-habit.png';
  }

  onSubmit(): void {
    if (!this.selectedPredefinedHabit && !this.isEditMode) {
      this.errorMessage = 'Por favor, selecciona un tipo de hábito.';
      this.habitForm.markAllAsTouched();
      return;
    }
    if (this.habitForm.invalid) { // Aún valida otros campos
      this.errorMessage = 'Por favor, completa todos los campos requeridos correctamente.';
      this.habitForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    // Habilitar temporalmente puntosRecompensa para obtener su valor si estuviera deshabilitado,
    // aunque no se enviará al backend.
    // const puntosParaMostrar = this.habitForm.get('puntosRecompensa')?.value;
    // console.log("Puntos que se mostrarían (no se envían):", puntosParaMostrar);


    const formValues = this.habitForm.value; // Obtiene valores de campos habilitados

    const habitClientData: HabitClientPayload = {
      nombre: formValues.nombre,
      descripcion: formValues.descripcion,
      frecuencia: formValues.frecuencia,
      horaProgramada: formValues.horaProgramada || null,
      estado: formValues.estado
      // No se envían puntosRecompensa desde el cliente
    };

    if (this.isEditMode && this.habitId !== null) {
      this.subscriptions.add(
        this.habitService.updateHabit(this.habitId, habitClientData).subscribe({
          next: (updatedHabit) => {
            this.isLoading = false;
            this.successMessage = '¡Hábito actualizado con éxito!';
            this.habitCreated.emit(updatedHabit);
            setTimeout(() => this.router.navigate(['/habits']), 1500);
          },
          error: (err) => {
            this.isLoading = false;
            this.errorMessage = `Error al actualizar el hábito: ${err.message || 'Error desconocido.'}`;
          }
        })
      );
    } else {
      this.subscriptions.add(
        this.habitService.createHabit(habitClientData).subscribe({
          next: (newHabit) => {
            this.isLoading = false;
            this.successMessage = '¡Hábito creado con éxito!';
            this.habitCreated.emit(newHabit);
            this.habitForm.reset({
              estado: 'activo',
              puntosRecompensa: { value: 0, disabled: true } // Resetear con el campo deshabilitado
            });
            this.selectedPredefinedHabit = null;
            // this.habitForm.get('puntosRecompensa')?.disable(); // Asegurar que esté deshabilitado
            setTimeout(() => this.router.navigate(['/habits']), 1500);
          },
          error: (err) => {
            this.isLoading = false;
            this.errorMessage = `Error al crear el hábito: ${err.message || 'Error desconocido.'}`;
          }
        })
      );
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}