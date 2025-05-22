import { Component, OnInit, OnDestroy, HostListener, ElementRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService, User } from '../auth.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ],
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.css']
})
export class UserProfileComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  private userSubscription: Subscription | undefined;
  defaultAvatarUrl = 'assets/img/default-avatar.png'; // Asegúrate que esta imagen exista en esta ruta
  showMenu: boolean = false;

  constructor(private authService: AuthService, private elementRef: ElementRef) { }

  ngOnInit(): void {
    this.userSubscription = this.authService.currentUser.subscribe((user: User | null) => {
      this.currentUser = user;
      console.log('UserProfileComponent (Navbar) - currentUser (debería tener fotoPerfil):', JSON.stringify(user, null, 2));
      if (!user) {
        this.showMenu = false;
      }
    });
  }

  get userDisplayName(): string {
    return this.currentUser?.nombre || 'Usuario';
  }

  get userAvatar(): string {
    // CAMBIO AQUÍ: usar fotoPerfil
    return (this.currentUser?.fotoPerfil && this.currentUser.fotoPerfil.trim() !== '')
           ? this.currentUser.fotoPerfil
           : this.defaultAvatarUrl;
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
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }
}