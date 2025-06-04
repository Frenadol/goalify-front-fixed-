// filepath: c:\Users\Fernando\Desktop\proyecto defi\Goalify-frontend-main\src\app\admin\manage-market\market-item-dialog\market-item-dialog.component.ts
import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MarketItemAdmin, CreateMarketItemDto } from '../market-item-admin.model';
import { MarketAdminService } from '../market-admin.service';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

export interface MarketItemDialogData {
  item?: MarketItemAdmin;
}

@Component({
  selector: 'app-market-item-dialog',
  templateUrl: './market-item-dialog.component.html',
  // styleUrls: ['./market-item-dialog.component.css']
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatCheckboxModule,
    MatIconModule,
    MatProgressSpinnerModule
  ]
})
export class MarketItemDialogComponent implements OnInit, OnDestroy {
  itemForm: FormGroup;
  isEditMode = false;
  isLoading = false;
  errorMessage: string | null = null;
  imageBase64Preview: string | null = null;
  selectedFileName: string | null = null;
  private tipoArticuloSubscription: Subscription | undefined;
  currentItemId: number | null = null;

  tiposArticulo: { value: MarketItemAdmin['tipoArticulo'], viewValue: string }[] = [
    { value: 'AVATAR_PERFIL', viewValue: 'Avatar de Perfil' },
    { value: 'MEDALLA', viewValue: 'Medalla' }
  ];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<MarketItemDialogComponent, CreateMarketItemDto | Partial<CreateMarketItemDto> | boolean | MarketItemAdmin>,
    @Inject(MAT_DIALOG_DATA) public data: MarketItemDialogData | undefined,
    private marketAdminService: MarketAdminService
  ) {
    this.itemForm = this.fb.group({
      nombre: [this.data?.item?.nombre || '', [Validators.required, Validators.maxLength(100)]],
      descripcion: [this.data?.item?.descripcion || '', [Validators.maxLength(500)]],
      costoPuntos: [this.data?.item?.precio ?? null, [Validators.required, Validators.min(0)]],
      tipoArticulo: [this.data?.item?.tipoArticulo || '', Validators.required],
      valorArticulo: [this.data?.item?.valorArticulo || ''],
      activo: [this.data?.item?.activo !== undefined ? this.data.item.activo : true],
    });

    if (data && data.item) {
      this.isEditMode = true;
      this.currentItemId = data.item.id;
      this.itemForm.patchValue({
        nombre: data.item.nombre,
        descripcion: data.item.descripcion,
        tipoArticulo: data.item.tipoArticulo,
        precio: data.item.precio, // Asegúrate que 'precio' se mapea a 'costoPuntos' si es necesario
        // valorArticulo: data.item.valorArticulo, // Ya está en el form group
        activo: data.item.activo
      });
      // No se usa imagenPreviewUrl para patchValue directamente, se maneja con imageBase64Preview
    }
  }

  ngOnInit(): void {
    this.isEditMode = !!(this.data && this.data.item && this.data.item.id);

    if (this.isEditMode && this.data?.item?.urlImagenPreview) {
      this.imageBase64Preview = this.data.item.urlImagenPreview;
    }

    this.setupConditionalValorArticulo();
  }

  ngOnDestroy(): void {
    if (this.tipoArticuloSubscription) {
      this.tipoArticuloSubscription.unsubscribe();
    }
  }

  private setupConditionalValorArticulo(): void {
    const valorArticuloControl = this.itemForm.get('valorArticulo');
    const tipoArticuloControl = this.itemForm.get('tipoArticulo');

    if (valorArticuloControl && tipoArticuloControl) {
      this.tipoArticuloSubscription = tipoArticuloControl.valueChanges.subscribe(tipo => {
        if (tipo === 'MEDALLA') {
          valorArticuloControl.setValue('');
          valorArticuloControl.disable();
        } else {
          valorArticuloControl.enable();
        }
      });

      // Estado inicial
      if (tipoArticuloControl.value === 'MEDALLA') {
        valorArticuloControl.setValue('');
        valorArticuloControl.disable();
      } else {
        valorArticuloControl.enable();
      }
    }
  }

  onFileSelected(event: Event): void {
    const element = event.currentTarget as HTMLInputElement;
    const fileList: FileList | null = element.files;
    if (fileList && fileList[0]) {
      const file = fileList[0];
      this.selectedFileName = file.name;
      const reader = new FileReader();
      reader.onload = () => {
        this.imageBase64Preview = reader.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      this.selectedFileName = null;
      this.imageBase64Preview = null; // Si se deselecciona el archivo
    }
  }

  onSubmit(): void {
    if (this.itemForm.invalid) {
      this.errorMessage = 'El formulario contiene errores. Por favor, revísalo.';
      this.itemForm.markAllAsTouched(); // Para mostrar errores individuales
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    const formRawValue = this.itemForm.getRawValue();
    const formPayload: any = { // Define un tipo más específico si es posible
        nombre: formRawValue.nombre,
        descripcion: formRawValue.descripcion,
        costoPuntos: formRawValue.costoPuntos,
        tipoArticulo: formRawValue.tipoArticulo,
        valorArticulo: formRawValue.valorArticulo,
        activo: formRawValue.activo,
        // imagenBase64 se añadirá condicionalmente
    };


    // Manejo de la imagen
    if (this.imageBase64Preview && !this.imageBase64Preview.startsWith('http')) {
      // Es una nueva imagen en base64
      formPayload.imagenBase64 = this.imageBase64Preview;
    } else if (this.isEditMode && this.imageBase64Preview === null && this.data?.item?.urlImagenPreview) {
      // La imagen existente fue eliminada por el usuario
      formPayload.imagenBase64 = "DELETE"; // Marcador para el backend
    }
    // Si imageBase64Preview es una URL http(s) (imagen existente no modificada) o
    // si es null y no había imagen previa (creación sin imagen),
    // no se envía `imagenBase64` (se omite del payload),
    // y el backend debería mantener la imagen existente (en modo edición) o no asignar ninguna (en modo creación).


    if (this.isEditMode) {
      if (!this.currentItemId) {
        this.isLoading = false;
        this.errorMessage = 'Error: ID del artículo no encontrado para la actualización.';
        console.error('Se intentó actualizar un artículo sin ID.');
        return;
      }
      this.marketAdminService.updateMarketItem(this.currentItemId, formPayload as Partial<CreateMarketItemDto>)
        .subscribe({
          next: (updatedItem) => {
            this.isLoading = false;
            this.dialogRef.close(updatedItem);
          },
          error: (err: HttpErrorResponse | any) => {
            this.isLoading = false;
            this.errorMessage = err.error?.message || err.message || 'Ocurrió un error al actualizar el artículo.';
            console.error('Error actualizando artículo:', err);
          }
        });
    } else {
      this.marketAdminService.createMarketItem(formPayload as CreateMarketItemDto)
        .subscribe({
          next: (newItem) => {
            this.isLoading = false;
            this.dialogRef.close(newItem);
          },
          error: (err: HttpErrorResponse | any) => {
            this.isLoading = false;
            this.errorMessage = err.error?.message || err.message || 'Ocurrió un error al crear el artículo.';
            console.error('Error creando artículo:', err);
          }
        });
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}