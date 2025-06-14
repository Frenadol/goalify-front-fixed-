import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ChallengeService } from '../challenge.service';
import { Challenge, ChallengeFormData } from '../challenge.model';

// Angular Material Modules
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, provideNativeDateAdapter } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-challenge-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterModule,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    MatDatepickerModule, MatNativeDateModule, MatCheckboxModule,
    MatSelectModule, MatIconModule, MatProgressSpinnerModule
  ],
  templateUrl: './challenge-form.component.html',
  styleUrls: ['./challenge-form.component.css'],
  providers: [provideNativeDateAdapter()]
})
export class ChallengeFormComponent implements OnInit {
  challengeForm: FormGroup;
  isEditMode = false;
  challengeId: number | null = null;
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  imagePreview: string | ArrayBuffer | null = null;
  existingImageUrl: string | null = null;
  selectedFileName: string | null = null;

  estadoOptions: string[] = ['activo', 'inactivo', 'pendiente', 'completado', 'cancelado'];
  tipoOptions: string[] = ['individual', 'global', 'equipo'];
  categoriaOptions: string[] = ['Salud y Bienestar', 'Aprendizaje', 'Productividad', 'Creatividad', 'Social', 'Finanzas', 'Otro'];

  minStartDate: Date;
  minEndDate: Date | null = null;


  constructor(
    private fb: FormBuilder,
    private challengeService: ChallengeService,
    private route: ActivatedRoute,
    public router: Router // Hazlo público si lo usas en el template directamente
  ) {
    this.minStartDate = new Date(); // La fecha de inicio no puede ser anterior a hoy

    this.challengeForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(255)]],
      descripcion: [''],
      puntosRecompensa: [0, [Validators.required, Validators.min(0)]],
      fechaInicio: [null, Validators.required],
      fechaFin: [null, Validators.required],
      estado: ['activo', Validators.required],
      tipo: ['individual', Validators.required],
      categoria: ['', Validators.required]
      // El campo 'imageUrl' se elimina del FormGroup
    });
  }

  ngOnInit(): void {
    this.subscribeToStartDateChanges(); // Suscribirse a los cambios de fecha de inicio

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.isEditMode = true;
      this.challengeId = +idParam;
      this.loadChallengeData(this.challengeId);
    } else {
      // Para nuevos desafíos, si fechaInicio tuviera un valor por defecto, actualizar minEndDate
      const initialStartDate = this.challengeForm.get('fechaInicio')?.value;
      if (initialStartDate) {
        this.updateMinEndDate(new Date(initialStartDate));
      }
    }
  }

  private subscribeToStartDateChanges(): void {
    const startDateControl = this.challengeForm.get('fechaInicio');
    if (startDateControl) {
      startDateControl.valueChanges.subscribe((selectedStartDate: Date | null) => {
        if (selectedStartDate) {
          this.updateMinEndDate(new Date(selectedStartDate)); // Asegurar que es un objeto Date
          // Opcional: si la fecha de fin actual es anterior a la nueva fecha de inicio, resetea la fecha de fin
          const endDateControl = this.challengeForm.get('fechaFin');
          if (endDateControl && endDateControl.value && new Date(endDateControl.value) < selectedStartDate) {
            endDateControl.setValue(null); // O selectedStartDate para que sea igual
          }
        } else {
          this.minEndDate = null; // Si no hay fecha de inicio, no hay restricción para la de fin (aparte de minStartDate)
        }
      });
    }
  }

  private updateMinEndDate(startDate: Date): void {
    // La fecha de fin no puede ser anterior o igual a la fecha de inicio.
    // Creamos una nueva instancia de Date para el día siguiente a la fecha de inicio.
    const nextDay = new Date(startDate);
    nextDay.setDate(startDate.getDate() + 1);
    this.minEndDate = nextDay;
  }


  loadChallengeData(id: number): void {
    this.isLoading = true;
    this.challengeService.getChallengeById(id).subscribe({
      next: (challenge: Challenge) => {
        const fechaInicio = challenge.fechaInicio ? new Date(challenge.fechaInicio) : null;
        const fechaFin = challenge.fechaFin ? new Date(challenge.fechaFin) : null;

        this.challengeForm.patchValue({
          nombre: challenge.nombre,
          descripcion: challenge.descripcion,
          puntosRecompensa: challenge.puntosRecompensa,
          fechaInicio: fechaInicio,
          fechaFin: fechaFin,
          estado: challenge.estado,
          tipo: challenge.tipo,
          categoria: challenge.categoria
          // No se parchea 'imageUrl' al formulario
        });

        if (fechaInicio) {
          this.updateMinEndDate(fechaInicio); // Actualizar minEndDate después de cargar los datos
        }

        this.existingImageUrl = challenge.imageUrl || null;
        // Si hay una imagen existente y no se ha seleccionado una nueva, se puede mostrar en imagePreview
        if (this.existingImageUrl && !this.selectedFileName) {
            // this.imagePreview = this.existingImageUrl; // Opcional: si quieres que la preview muestre la existente al cargar
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = `Error al cargar el desafío: ${err.message}`;
        this.isLoading = false;
      }
    });
  }

  onFileSelected(event: Event): void {
    const element = event.currentTarget as HTMLInputElement;
    const fileList: FileList | null = element.files;
    if (fileList && fileList[0]) {
      const file = fileList[0];
      this.selectedFileName = file.name;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview = reader.result; // Esto será Base64
      };
      reader.readAsDataURL(file);
    } else {
      this.selectedFileName = null;
      this.imagePreview = null; // Si se cancela, no hay vista previa de *nueva* imagen.
    }
  }

  shouldShowNewImageUploadHint(): boolean {
    // Este hint ya no es tan relevante o podría reformularse.
    // Por ahora, lo dejamos así, pero podrías quitarlo del HTML.
    return !!this.imagePreview && !!this.selectedFileName;
  }

  onSubmit(): void {
    if (this.challengeForm.invalid) {
      this.errorMessage = "Por favor, completa todos los campos requeridos.";
      Object.values(this.challengeForm.controls).forEach(control => {
        control.markAsTouched();
      });
      // Comprobación adicional para fechas si el formulario es inválido por otras razones pero las fechas son el problema
      const fechaInicioCtrl = this.challengeForm.get('fechaInicio');
      const fechaFinCtrl = this.challengeForm.get('fechaFin');
      if (fechaInicioCtrl?.value && fechaFinCtrl?.value && fechaFinCtrl.value <= fechaInicioCtrl.value) {
        this.errorMessage = "La fecha de fin debe ser posterior a la fecha de inicio.";
        fechaFinCtrl.setErrors({ ...fechaFinCtrl.errors, 'matDatepickerMin': true });
      }
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    const formValues = this.challengeForm.value;
    const fechaInicioISO = formValues.fechaInicio ? (formValues.fechaInicio as Date).toISOString() : null;
    const fechaFinISO = formValues.fechaFin ? (formValues.fechaFin as Date).toISOString() : null;

    const challengeData: ChallengeFormData = {
      nombre: formValues.nombre,
      descripcion: formValues.descripcion,
      puntosRecompensa: formValues.puntosRecompensa,
      fechaInicio: fechaInicioISO as string,
      fechaFin: fechaFinISO as string,
      estado: formValues.estado,
      tipo: formValues.tipo,
      categoria: formValues.categoria,
      // imageUrl se define a continuación
    };

    // Lógica para la imagen:
    if (this.imagePreview && typeof this.imagePreview === 'string' && this.imagePreview.startsWith('data:image') && this.selectedFileName) {
      // Si se seleccionó un nuevo archivo y hay una vista previa en Base64.
      challengeData.imageUrl = this.imagePreview;
    } else if (this.isEditMode && this.existingImageUrl && !this.selectedFileName) {
      // Si es modo edición, no se seleccionó un nuevo archivo, pero existía una imagen, se mantiene.
      challengeData.imageUrl = this.existingImageUrl;
    } else {
      // Creación sin imagen, o edición donde no había imagen y no se subió, o se canceló la subida.
      challengeData.imageUrl = undefined; // Se omitirá del JSON o se enviará null si se prefiere.
    }

    const operation = this.isEditMode && this.challengeId !== null
      ? this.challengeService.updateChallenge(this.challengeId, challengeData)
      : this.challengeService.createChallenge(challengeData);

    operation.subscribe({
      next: (response) => {
        this.isLoading = false;
        this.successMessage = `Desafío ${this.isEditMode ? 'actualizado' : 'creado'} con éxito.`;
        if (!this.isEditMode) {
          this.challengeForm.reset({
            estado: 'activo',
            tipo: 'individual',
            puntosRecompensa: 0
          });
          this.imagePreview = null;
          this.existingImageUrl = null;
          this.selectedFileName = null;
        }
        setTimeout(() => this.router.navigate(['/admin/challenges']), 2000);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = `Error al ${this.isEditMode ? 'actualizar' : 'crear'} el desafío: ${err.message || 'Error desconocido.'}`;
      }
    });
  }
}
