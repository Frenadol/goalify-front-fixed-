import { Component } from '@angular/core';
import { RouterModule } from '@angular/router'; // Necesario para routerLink, router-outlet, etc.
import { CommonModule } from '@angular/common';   // Necesario para *ngIf, pipe async, etc.
import { AuthService } from './auth.service';     // Tu servicio de autenticación
import { UserProfileComponent } from './user-profile/user-profile.component'; // Tu componente de perfil de usuario

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,          // Para directivas como *ngIf y el pipe async
    RouterModule,          // Para <router-outlet> y directivas de enrutamiento
    UserProfileComponent   // Para poder usar <app-user-profile> en tu HTML
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'Goalify-FrontEnd-main';

  // Haces público authService para poder usarlo directamente en tu plantilla HTML
  constructor(public authService: AuthService) {}
}