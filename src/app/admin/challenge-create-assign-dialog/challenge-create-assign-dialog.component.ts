import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, provideNativeDateAdapter } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';

// Importa el AdminService y las interfaces necesarias
import { AdminService, RandomAssignmentResponse, FrontendChallengeFormData } from '../admin.service';
// No necesitas ChallengeService aquí si toda la lógica es a través de AdminService para este diálogo

export interface ChallengeCreateAssignDialogResult {
  success: boolean;
  message: string;
  assignedUserName?: string;
  assignedChallengeName?: string;
}

@Component({
  selector: 'app-challenge-create-assign-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatIconModule
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './challenge-create-assign-dialog.component.html',
  styleUrls: ['./challenge-create-assign-dialog.component.css']
})
export class ChallengeCreateAssignDialogComponent implements OnInit {
  challengeForm: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;

  estadoOptions: string[] = ['activo', 'pendiente', 'inactivo']; // Ajusta según tu lógica de negocio
  tipoOptions: string[] = ['individual', 'global']; // Ajusta según tu lógica de negocio
  categoriaOptions: string[] = ['Salud y Bienestar', 'Aprendizaje', 'Productividad', 'Creatividad', 'Social', 'Finanzas', 'Otro'];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<ChallengeCreateAssignDialogComponent, ChallengeCreateAssignDialogResult>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private adminService: AdminService // Usaremos AdminService para la nueva operación combinada
  ) {
    this.challengeForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(255)]],
      descripcion: [''],
      puntosRecompensa: [10, [Validators.required, Validators.min(0)]],
      fechaInicio: [new Date(), Validators.required], // Fecha de inicio por defecto hoy
      fechaFin: [null, Validators.required],
      estado: ['activo', Validators.required], // Estado por defecto
      tipo: ['global', Validators.required],   // Tipo por defecto
      categoria: ['', Validators.required]
      // No incluimos imageUrl aquí por simplicidad para el modal
    });
  }

  ngOnInit(): void {
    // Puedes pre-configurar la fecha de fin si lo deseas, por ejemplo, una semana después de la fecha de inicio
    const unaSemanaDespues = new Date();
    unaSemanaDespues.setDate(unaSemanaDespues.getDate() + 7);
    this.challengeForm.get('fechaFin')?.setValue(unaSemanaDespues);
  }

  async onSubmit(): Promise<void> {
    if (this.challengeForm.invalid) {
      this.errorMessage = "Por favor, completa todos los campos requeridos.";
      // Marcar todos los campos como tocados para mostrar errores de validación
      this.challengeForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    const formValues = this.challengeForm.value;

    // Formatear fechas a YYYY-MM-DD
    const fechaInicioFormatted = formValues.fechaInicio
      ? (formValues.fechaInicio as Date).toISOString().split('T')[0]
      : null;
    const fechaFinFormatted = formValues.fechaFin
      ? (formValues.fechaFin as Date).toISOString().split('T')[0]
      : null;

    const challengePayload: FrontendChallengeFormData = {
      nombre: formValues.nombre,
      descripcion: formValues.descripcion,
      puntosRecompensa: formValues.puntosRecompensa,
      fechaInicio: fechaInicioFormatted,
      fechaFin: fechaFinFormatted,
      estado: formValues.estado,
      tipo: formValues.tipo,
      categoria: formValues.categoria,
      // imageUrl: undefined // No se maneja imagen en este flujo simplificado
    };

    try {
      // Llamada al nuevo método del AdminService que crea y asigna
      const assignmentResponse: RandomAssignmentResponse = await firstValueFrom(
        this.adminService.createAndAssignRandomChallenge(challengePayload)
      );

      console.log('Respuesta de creación y asignación:', assignmentResponse);
      this.isLoading = false;

      if (assignmentResponse.success) {
        this.dialogRef.close({
          success: true,
          message: assignmentResponse.message,
          assignedUserName: assignmentResponse.assignedUserName,
          assignedChallengeName: assignmentResponse.assignedChallengeName
        });
      } else {
        // Si el backend devuelve success: false con un mensaje específico
        this.errorMessage = assignmentResponse.message || 'El backend indicó un fallo pero no proporcionó detalles.';
        // No cerramos el diálogo para que el usuario vea el error
      }

    } catch (error: any) {
      this.isLoading = false;
      this.errorMessage = error.message || 'Ocurrió un error inesperado al crear y asignar el desafío.';
      console.error("Error en onSubmit del diálogo (crear y asignar):", error);
      // No cerramos el diálogo para que el usuario vea el error
    }
  }

  onCancel(): void {
    this.dialogRef.close(); // No se devuelve ningún resultado o se devuelve undefined
  }
}
