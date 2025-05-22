import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core'; // Añadir ViewEncapsulation
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, User } from '../auth.service';
import { Subscription } from 'rxjs';
import { UserProfileComponent } from '../user-profile/user-profile.component';
import { NotificationService, PendingNotification, UserChallengeId } from '../shared/notification.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [
    CommonModule,
    UserProfileComponent,
    RouterLink,
    MatSnackBarModule
  ],
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css'],
  // Podríamos necesitar ViewEncapsulation.None si los estilos de animación no se aplican globalmente,
  // pero es mejor mantener los estilos de panelClass en styles.css global.
  // encapsulation: ViewEncapsulation.None
})
export class WelcomeComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  private userSubscription: Subscription | undefined;
  userDisplayName: string = 'Usuario';

  constructor(
    private router: Router,
    private authService: AuthService,
    private notificationService: NotificationService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.userSubscription = this.authService.currentUser.subscribe((user: User | null) => {
      this.currentUser = user;
      this.userDisplayName = user?.nombre || 'Usuario'; // <--- CAMBIO AQUÍ

      if (user && !user.esAdministrador) {
        this.checkForPendingNotifications();
      }
    });
  }

  checkForPendingNotifications(): void {
    this.notificationService.getPendingNotifications().subscribe({
      next: (notifications) => {
        if (notifications && notifications.length > 0) {
          const idsToMarkAsRead: UserChallengeId[] = [];
          notifications.forEach((notification, index) => {
            // Añadimos un pequeño retraso para que las notificaciones no aparezcan todas a la vez si hay varias
            setTimeout(() => {
              this.snackBar.open(
                `🔔 ¡Nuevo desafío asignado: ${notification.challengeName}!`, // Icono añadido al mensaje
                '✖', // Botón de cierre
                {
                  duration: 7000,
                  horizontalPosition: 'right', // Posición a la derecha
                  verticalPosition: 'bottom',    // Posición arriba
                  panelClass: ['custom-snackbar', 'snackbar-info', 'slide-in-right'] // Clases para estilo y animación
                }
              );
            }, index * 300); // Retraso incremental

            if (notification.userChallengeId &&
                typeof notification.userChallengeId.idUsuario === 'number' &&
                typeof notification.userChallengeId.idDesafio === 'number') {
              idsToMarkAsRead.push(notification.userChallengeId);
            } else {
              console.warn('Formato de userChallengeId incorrecto en la notificación:', notification);
            }
          });

          if (idsToMarkAsRead.length > 0) {
            this.notificationService.markNotificationsAsRead(idsToMarkAsRead).subscribe({
              next: () => console.log('Notificaciones marcadas como leídas en el backend.'),
              error: (err) => console.error('Error al marcar notificaciones como leídas en el backend:', err)
            });
          }
        } else {
          console.log('No hay notificaciones pendientes para el usuario.');
        }
      },
      error: (err) => {
        console.error('Error al obtener notificaciones pendientes:', err);
      }
    });
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
  }
}