import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

export interface ProfilePhotoDialogData {
  currentPhotoUrl: string | null | undefined;
  purchasedAvatars: {id: string, url: string, nombre: string}[];
}

@Component({
  selector: 'app-profile-photo-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatTabsModule,
    MatIconModule,
    MatSnackBarModule,
    FormsModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './profile-photo-dialog.component.html',
  styleUrls: ['./profile-photo-dialog.component.css']
})
export class ProfilePhotoDialogComponent implements OnInit {
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  selectedAvatarUrl: string | null = null;
  defaultAvatarUrl = 'assets/img/default-avatar.png';
  isUploadTab: boolean = true;

  constructor(
    public dialogRef: MatDialogRef<ProfilePhotoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ProfilePhotoDialogData
  ) {}

  ngOnInit(): void {
    // Inicializar previewUrl con la foto actual si existe
    this.previewUrl = this.data.currentPhotoUrl || null;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      this.selectedFile = input.files[0];
      // Preview de la imagen
      const reader = new FileReader();
      reader.onload = () => {
        this.previewUrl = reader.result as string;
        this.selectedAvatarUrl = null; // Deseleccionar avatar si había uno
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  selectAvatar(url: string): void {
    this.selectedAvatarUrl = url;
    this.previewUrl = url;
    this.selectedFile = null; // Limpiar archivo seleccionado
  }

  toggleTab(isUploadTab: boolean): void {
    this.isUploadTab = isUploadTab;
  }

  save(): void {
    if (this.selectedFile) {
      // Convertir archivo a base64
      const reader = new FileReader();
      reader.onload = () => {
        const base64Image = reader.result as string;
        console.log("Imagen convertida a base64, tamaño:", Math.round(base64Image.length / 1024), "KB");
        this.dialogRef.close(base64Image);
      };
      reader.readAsDataURL(this.selectedFile);
    } else if (this.selectedAvatarUrl) {
      // Usar URL del avatar seleccionado
      this.dialogRef.close(this.selectedAvatarUrl);
    } else {
      this.dialogRef.close(null);
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }
}