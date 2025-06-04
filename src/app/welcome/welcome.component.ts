import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService, User } from '../auth.service';
import { UserProfileComponent } from '../user-profile/user-profile.component';
import { NotificationService, PendingNotification, UserChallengeId } from '../shared/notification.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MedallasDialogComponent } from '../medallas-dialog/medallas-dialog.component';

// Interfaz local para la lógica de rangos en este componente
interface RangoNivelWelcome {
  nombre: string;
  puntosMinimos: number;
  icono: string;
  mensajeMotivacional?: string;
  // No es necesario fechaConseguida aquí, se añade al transformar a RangoNivelDialog
}

// Add the missing RangoNivelDialog interface
interface RangoNivelDialog {
  nombre: string;
  icono: string;
  conseguida: boolean;
  descripcion?: string;
  mensajeMotivacional?: string;
  puntosMinimos: number;
  fechaConseguida?: string;
}

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [
    CommonModule,
    UserProfileComponent,
    RouterLink,
    MatSnackBarModule,
    MatIconModule,
    MatDialogModule
  ],
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css'],
})
export class WelcomeComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  userDisplayName: string = 'Usuario';
  private userSubscription: Subscription | undefined;
  private notificationSubscription: Subscription | undefined;
  private readonly MAX_NOTIFICATIONS_TO_SHOW = 3;

  // TU DEFINICIÓN DE RANGOS
  public readonly RANGOS_DEFINIDOS_WELCOME: RangoNivelWelcome[] = [
    { nombre: 'NOVATO', puntosMinimos: 0, icono: 'assets/rangos/rangonovato.png', mensajeMotivacional: '¡Todo gran viaje comienza con un primer paso! Sigue así.' },
    { nombre: 'ASPIRANTE', puntosMinimos: 1000, icono: 'assets/rangos/rangoaspirante.png', mensajeMotivacional: '¡Estás construyendo una base sólida! La disciplina te llevará lejos.' },
    { nombre: 'DISCIPLINADO', puntosMinimos: 2500, icono: 'assets/rangos/rangodisciplinado.png', mensajeMotivacional: '¡Tu constancia es admirable! Ya eres un ejemplo de dedicación.' },
    { nombre: 'CONSTANTE', puntosMinimos: 5000, icono: 'assets/rangos/rangoconstante.png', mensajeMotivacional: '¡Has convertido tus metas en hábitos! Sigue brillando.' },
    { nombre: 'DEDICADO', puntosMinimos: 10000, icono: 'assets/rangos/rangodedicado.png', mensajeMotivacional: '¡Tu dedicación es inquebrantable! Estás marcando la diferencia.' },
    { nombre: 'INSPIRADOR', puntosMinimos: 20000, icono: 'assets/rangos/rangoinspirador.png', mensajeMotivacional: '¡Eres una fuente de inspiración! Tu progreso motiva a otros.' },
    { nombre: 'MAESTRO_HABITOS', puntosMinimos: 50000, icono: 'assets/rangos/rangomaestrohabitos.png', mensajeMotivacional: '¡Has alcanzado la maestría! Tu dominio de los hábitos es legendario.' }
  ];

  public medallasParaDialogo: RangoNivelDialog[] = [];

  // Inyección de dependencias
  private authService = inject(AuthService);
  private router = inject(Router);
  private notificationService = inject(NotificationService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);


  constructor() {}

  ngOnInit(): void {
    this.userSubscription = this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.userDisplayName = user.nombre;
        // Podrías llamar a prepararMedallasParaDialogo aquí si quieres tenerlas listas
        // o esperar a que se haga clic en el botón.
        // this.prepararMedallasParaDialogo(); // Opcional: preparar al cargar el usuario
      } else {
        this.userDisplayName = 'Usuario';
        this.medallasParaDialogo = [];
      }
    });
    this.checkPendingNotifications();
  }

  checkPendingNotifications(): void {
    this.notificationSubscription = this.notificationService.getPendingNotifications().subscribe({
      next: (notifications) => {
        if (notifications && notifications.length > 0) {
          const notificationsToShow = notifications.slice(0, this.MAX_NOTIFICATIONS_TO_SHOW);
          notificationsToShow.forEach((notification, index) => {
            setTimeout(() => {
              this.showNotificationSnackbar(notification);
            }, index * 4000); // Muestra cada notificación con un pequeño retraso
          });

          // Marcar como leídas después de mostrarlas (o al interactuar)
          const idsToMark = notifications.map(n => n.userChallengeId);
          this.notificationService.markNotificationsAsRead(idsToMark).subscribe({
            // Opcional: manejar éxito/error de marcar como leído
          });
        }
      },
      error: (error) => {
        console.error('Error al obtener notificaciones pendientes:', error);
      }
    });
  }

  private showNotificationSnackbar(notification: PendingNotification): void {
    const snackBarRef = this.snackBar.open(
      `¡Nuevo desafío asignado: ${notification.challengeName}!`,
      'Ver Mis Desafíos',
      {
        duration: 7000, // Duración más larga para dar tiempo a hacer clic
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass: ['custom-snackbar-challenge']
      }
    );

    snackBarRef.onAction().subscribe(() => {
      this.router.navigate(['/my-challenges']);
    });
  }

  prepararMedallasParaDialogo(): void {
    if (!this.currentUser || typeof this.currentUser.puntosTotales === 'undefined') {
      this.medallasParaDialogo = [];
      return;
    }

    const puntosUsuario = this.currentUser.puntosTotales;
    const fechasConseguidasDelUsuario = this.currentUser.fechasRangosConseguidos || {};
    const iconoMedallaBloqueada = 'assets/rangos/medalladesconocida.png';
    const nombreMedallaBloqueada = "??????";
    const descripcionMedallaBloqueada = "Sigue esforzándote para desbloquear este rango.";

    this.medallasParaDialogo = this.RANGOS_DEFINIDOS_WELCOME.map(rangoBase => {
      const conseguida = puntosUsuario >= rangoBase.puntosMinimos;
      const fechaConseguidaString = conseguida ? (fechasConseguidasDelUsuario[rangoBase.nombre] || undefined) : undefined;
      
      return {
        nombre: conseguida ? rangoBase.nombre : nombreMedallaBloqueada,
        icono: conseguida ? rangoBase.icono : iconoMedallaBloqueada,
        conseguida: conseguida,
        descripcion: conseguida ? rangoBase.mensajeMotivacional : descripcionMedallaBloqueada,
        mensajeMotivacional: conseguida ? rangoBase.mensajeMotivacional : descripcionMedallaBloqueada,
        puntosMinimos: rangoBase.puntosMinimos,
        fechaConseguida: fechaConseguidaString
      };
    });
    
    // Asegurarse de que rangosConseguidos esté presente en el currentUser
    console.log('Medallas preparadas para diálogo:', this.medallasParaDialogo);
    console.log('Rangos conseguidos usuario:', this.currentUser.rangosConseguidos);
  }


  abrirDialogoMedallas(): void {
    this.prepararMedallasParaDialogo(); // Asegurarse de que las medallas estén preparadas con las fechas
    
    console.log('Abriendo diálogo con medallas:', this.medallasParaDialogo);
    console.log('Iconos de las medallas:', this.medallasParaDialogo.map(m => m.icono));
    
    if (this.medallasParaDialogo.length > 0) {
      this.dialog.open(MedallasDialogComponent, {
        width: '800px',
        maxWidth: '95vw',
        maxHeight: '85vh',
        data: { medallas: this.medallasParaDialogo },
        panelClass: 'medallas-info-dialog-panel'
      });
    } else {
      this.snackBar.open('No hay información de medallas para mostrar o el usuario no está cargado.', 'Cerrar', { duration: 3000 });
    }
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
    if (this.notificationSubscription) {
      this.notificationSubscription.unsubscribe();
    }
  }
}