import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../auth.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  registerData = {
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  };

  errorMessage: string | null = null;
  selectedFile: File | null = null;
  profileImagePreview: string | ArrayBuffer | null = null; // Para la vista previa

  constructor(private authService: AuthService, private router: Router) {}

  onFileSelected(event: Event): void {
    const element = event.currentTarget as HTMLInputElement;
    let fileList: FileList | null = element.files;
    if (fileList && fileList[0]) {
      this.selectedFile = fileList[0];

      // Generar vista previa
      const reader = new FileReader();
      reader.onload = (e) => {
        this.profileImagePreview = reader.result;
      };
      reader.readAsDataURL(this.selectedFile); // Lee el archivo como Data URL (Base64)
    } else {
      this.selectedFile = null;
      this.profileImagePreview = null;
    }
  }

  onRegister(): void {
    this.errorMessage = null;

    if (this.registerData.password !== this.registerData.confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden.';
      return;
    }

    // Preparar userData
    const userData = {
      nombre: this.registerData.name,
      email: this.registerData.email,
      contrasena: this.registerData.password, // <--- CAMBIO AQUÍ: de 'password' a 'contrasena'
      fotoPerfil: this.profileImagePreview || null
    };

    // Llamada al servicio de autenticación para registrar el usuario
    this.authService.registerUser(userData).subscribe({
      next: (response: any) => { // Puedes usar 'any' o crear una interfaz para la respuesta de registro
        console.log('Registro exitoso', response);
        this.router.navigate(['/login'], { queryParams: { registered: 'true' } });
      },
      error: (err: HttpErrorResponse) => { // Usar HttpErrorResponse para errores HTTP
        console.error('Error en el registro', err);
        if (err.error && typeof err.error === 'string') {
          this.errorMessage = err.error;
        } else if (err.message) {
          this.errorMessage = err.message;
        } else {
          this.errorMessage = 'Ocurrió un error durante el registro. Por favor, inténtalo de nuevo.';
        }
      }
    });
  }
}