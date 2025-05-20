import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common'; // Para *ngIf, etc.
import { AuthService, User } from '../auth.service';
import { Subscription } from 'rxjs';
import { UserProfileComponent } from '../user-profile/user-profile.component';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [
    CommonModule, // Añade RouterModule si usas routerLink directamente en la plantilla
    UserProfileComponent, // Importa UserProfileComponent aquí
    RouterLink,
  ],
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css'] // Usaremos este para los estilos combinados
})
export class WelcomeComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  private userSubscription: Subscription | undefined;
  userDisplayName: string = 'Usuario'; // Valor por defecto

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    this.userSubscription = this.authService.currentUser.subscribe((user: User | null) => {
      this.currentUser = user;
      this.userDisplayName = user?.name || 'Usuario'; // Actualiza el nombre para el saludo
    });
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
    // Ejemplo: this.router.navigate(['/app/create-habit']);
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
  }
}
