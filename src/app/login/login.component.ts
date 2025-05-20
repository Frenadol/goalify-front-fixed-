import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService, User } from '../auth.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginData = { usernameOrEmail: '', password: '' };
  errorMessage: string | null = null;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onLogin(): void {
    this.errorMessage = null;
    if (!this.loginData.usernameOrEmail || !this.loginData.password) {
        this.errorMessage = "Por favor, ingresa tu email/usuario y contraseña.";
        return;
    }

    this.authService.loginUser(this.loginData).subscribe({
      next: (backendResponse) => {
        const currentUser = this.authService.currentUserValue;

        if (currentUser) {
          if (currentUser.esAdministrador) {
            this.router.navigate(['/admin/dashboard']);
          } else {
            this.router.navigate(['/welcome']);
          }
        } else {
          this.errorMessage = 'Error al procesar la información del usuario después del login.';
          console.error('Login exitoso pero currentUser es null en el componente.');
        }
      },
      error: (err) => {
        this.errorMessage = err.message || 'Error en el login. Verifica tus credenciales.';
        console.error('Error en el login desde el componente:', err);
      }
    });
  }
}