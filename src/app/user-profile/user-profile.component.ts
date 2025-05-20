import { Component, OnInit, OnDestroy, HostListener, ElementRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService, User } from '../auth.service';
import { CommonModule } from '@angular/common';
// import { RouterLink } from '@angular/router'; // Descomenta si usas routerLink en la plantilla de este componente

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [
    CommonModule,
    // RouterLink // Descomenta si usas routerLink
  ],
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.css']
})
export class UserProfileComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  private userSubscription: Subscription | undefined;
  private defaultAvatarUrl = 'assets/default-avatar.png'; // Asegúrate que esta imagen exista

  showMenu = false;

  constructor(private authService: AuthService, private elementRef: ElementRef) { }

  ngOnInit(): void {
    this.userSubscription = this.authService.currentUser.subscribe((user: User | null) => {
      this.currentUser = user;
      if (!user) { // Si el usuario se desloguea o no hay usuario, ocultar el menú
        this.showMenu = false;
      }
    });
  }

  get userDisplayName(): string {
    return this.currentUser?.name || 'Usuario';
  }

  get userAvatar(): string {
    return this.currentUser?.avatarUrl || this.defaultAvatarUrl;
  }

  onProfileClick(): void {
    if (this.currentUser) {
      this.showMenu = !this.showMenu;
    }
  }

  @HostListener('document:click', ['$event'])
  clickOutside(event: Event) {
    if (this.currentUser && this.showMenu && !this.elementRef.nativeElement.contains(event.target)) {
      this.showMenu = false;
    }
  }

  logout(): void {
    this.authService.logout();
    // this.showMenu = false; // Ya se maneja en la suscripción de ngOnInit cuando el usuario cambia a null
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }
}