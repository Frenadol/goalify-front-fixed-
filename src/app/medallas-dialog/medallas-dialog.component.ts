import { Component, OnInit, Inject, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService, User } from '../auth.service';
import { Router } from '@angular/router';

interface Rango {
  nombre: string;
  icono: string;
  conseguida: boolean;
  descripcion: string;
  mensajeMotivacional: string;
  puntosMinimos: number;
  fechaConseguida?: string;
}

// Añadir una nueva interfaz para las medallas compradas
interface MedallaComprada {
  id: string;
  nombre: string;
  icono: string;
  fechaAdquisicion?: string;
  descripcion?: string;
}

// Crear una implementación personalizada de MatDialogRef
class CustomDialogRef<T> {
  close(dialogResult?: any): void {
    console.log('Cerrando diálogo con método personalizado');
    // No hacer nada, simplemente una implementación segura
  }
}

@Component({
  selector: 'app-medallas-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './medallas-dialog.component.html',
  styleUrls: ['./medallas-dialog.component.css']
})
export class MedallasDialogComponent implements OnInit {
  // Array completo de rangos del sistema
  readonly RANGOS_DEFINIDOS = [
    { nombre: 'NOVATO', puntosMinimos: 0, icono: 'assets/rangos/rangonovato.png', mensajeMotivacional: '¡Todo gran viaje comienza con un primer paso! Sigue así.' },
    { nombre: 'ASPIRANTE', puntosMinimos: 1000, icono: 'assets/rangos/rangoaspirante.png', mensajeMotivacional: '¡Estás construyendo una base sólida! La disciplina te llevará lejos.' },
    { nombre: 'DISCIPLINADO', puntosMinimos: 2500, icono: 'assets/rangos/rangodisciplinado.png', mensajeMotivacional: '¡Tu constancia es admirable! Ya eres un ejemplo de dedicación.' },
    { nombre: 'CONSTANTE', puntosMinimos: 5000, icono: 'assets/rangos/rangoconstante.png', mensajeMotivacional: '¡Has convertido tus metas en hábitos! Sigue brillando.' },
    { nombre: 'DEDICADO', puntosMinimos: 10000, icono: 'assets/rangos/rangodedicado.png', mensajeMotivacional: '¡Tu dedicación es inquebrantable! Estás marcando la diferencia.' },
    { nombre: 'INSPIRADOR', puntosMinimos: 20000, icono: 'assets/rangos/rangoinspirador.png', mensajeMotivacional: '¡Eres una fuente de inspiración! Tu progreso motiva a otros.' },
    { nombre: 'MAESTRO_HABITOS', puntosMinimos: 50000, icono: 'assets/rangos/rangomaestrohabitos.png', mensajeMotivacional: '¡Has alcanzado la maestría! Tu dominio de los hábitos es legendario.' }
  ];
  
  // Medallas procesadas que se mostrarán en la UI
  medallas: Rango[] = [];
  
  // Añadir esta propiedad para guardar las medallas compradas
  medallasCompradas: MedallaComprada[] = [];

  // Ruta para la imagen de medalla desconocida
  readonly MEDALLA_DESCONOCIDA_PATH = 'assets/rangos/medalladesconocida.png';
  
  // Variables para manejo del usuario actual y sus puntos
  usuarioRangoActual: string = '';
  puntosTotales: number = 0;
  isLoading: boolean = true;
  currentUser: User | null = null;

  // Referencia personalizada al diálogo
  private safeDialogRef: CustomDialogRef<MedallasDialogComponent>;

  constructor(
    @Optional() private originalDialogRef: MatDialogRef<MedallasDialogComponent>,
    private authService: AuthService,
    private router: Router
  ) {
    // Creamos una referencia segura siempre disponible
    this.safeDialogRef = new CustomDialogRef<MedallasDialogComponent>();
  }

  ngOnInit() {
    this.isLoading = true;
    
    // Suscribirse al usuario actual
    this.authService.currentUser.subscribe(user => {
      if (user) {
        this.currentUser = user;
        this.usuarioRangoActual = user.rango || 'NOVATO';
        this.puntosTotales = user.puntosTotales || 0;
        this.procesarRangos();
        this.cargarMedallasCompradas();
      }
      this.isLoading = false;
    });
  }

  procesarRangos() {
    if (!this.currentUser) return;
    
    // Determinar el índice del rango actual
    const rangos = this.RANGOS_DEFINIDOS;
    const indiceRangoActual = rangos.findIndex(r => r.nombre === this.usuarioRangoActual);
    
    if (indiceRangoActual === -1) {
      console.error('Rango actual no encontrado:', this.usuarioRangoActual);
      return;
    }
    
    // Procesar rangos y determinar cuáles están conseguidos
    this.medallas = rangos.map((rango, index) => {
      // Un rango está conseguido SOLO si es igual o anterior al rango actual del usuario
      const conseguida = index <= indiceRangoActual;
      
      // Fecha en que se consiguió el rango (si está disponible)
      const fechaConseguida = conseguida && this.currentUser?.fechasRangosConseguidos?.[rango.nombre] 
        ? this.currentUser.fechasRangosConseguidos[rango.nombre] 
        : undefined;
      
      return {
        nombre: rango.nombre,
        icono: conseguida ? rango.icono : this.MEDALLA_DESCONOCIDA_PATH,
        conseguida: conseguida,
        descripcion: `Rango ${rango.nombre.replace('_', ' ')}`,
        mensajeMotivacional: rango.mensajeMotivacional,
        puntosMinimos: rango.puntosMinimos,
        fechaConseguida: fechaConseguida
      };
    });
  }

  cargarMedallasCompradas() {
    if (!this.currentUser?.preferences?.unlockedItems) {
      this.medallasCompradas = [];
      return;
    }
    
    // Aquí se cargarían las medallas desde el backend o desde user.preferences
    if (this.currentUser.preferences.unlockedItems.length > 0) {
      this.medallasCompradas = this.currentUser.preferences.unlockedItems
        .filter(item => item.includes('medalla'))
        .map(medallaId => ({
          id: medallaId,
          nombre: `Medalla ${medallaId.split('-').pop() || ''}`,
          icono: `assets/medallas/${medallaId}.png`,
          fechaAdquisicion: new Date().toISOString().split('T')[0],
          descripcion: 'Medalla adquirida en el Mercado de Goalify'
        }));
    }
  }

  getRangoIcono(medalla: Rango): string {
    return medalla.conseguida ? medalla.icono : this.MEDALLA_DESCONOCIDA_PATH;
  }

  onClose(): void {
    // Método completamente a prueba de fallos para cerrar el diálogo
    console.log('Intentando cerrar el diálogo...');

    try {
      // Intenta usar la referencia original primero para cerrar el diálogo
      if (this.originalDialogRef && typeof this.originalDialogRef.close === 'function') {
        console.log('Cerrando con originalDialogRef');
        this.originalDialogRef.close();
      }
      
      // Navegar específicamente al dashboard/bienvenida
      console.log('Navegando al dashboard');
      this.router.navigate(['/welcome']);  // Ajusta esta ruta según la estructura de tu aplicación
      return;
    } catch (error) {
      console.error('Error al intentar cerrar:', error);
      // Intentar navegar directamente al dashboard
      this.router.navigate(['/welcome']).catch(navError => {
        console.error('Error de navegación:', navError);
        // Como último recurso, navegar a la raíz
        this.router.navigate(['/']);
      });
    }
  }
}

