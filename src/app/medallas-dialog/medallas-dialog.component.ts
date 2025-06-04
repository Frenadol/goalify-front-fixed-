import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../auth.service';

interface Rango {
  nombre: string;
  icono: string;
  conseguida: boolean;
  descripcion: string;
  mensajeMotivacional: string;
  puntosMinimos: number;
  fechaConseguida?: string;
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

  // Ruta para la imagen de medalla desconocida
  readonly MEDALLA_DESCONOCIDA_PATH = 'assets/rangos/medalladesconocida.png';
  
  // Variables para manejo del usuario actual y sus puntos
  usuarioRangoActual: string = 'CONSTANTE';  // Rango actual del usuario
  usuarioPuntosActuales: number = 5014;      // Puntos actuales del usuario
  
  // Fechas de consecución de rangos
  fechasConseguidas: Record<string, string> = {};
  
  isLoading: boolean = true;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.isLoading = true;
    
    // Suscripción al usuario actual para obtener su rango y puntos reales
    this.authService.currentUser.subscribe(user => {
      if (user) {
        this.usuarioRangoActual = user.rango || 'NOVATO'; // Valor por defecto si no tiene rango
        this.usuarioPuntosActuales = user.puntosTotales || 0; // Puntos actuales
        
        // Cargar fechas (si existen)
        this.fechasConseguidas = user.fechasRangosConseguidos || {};
        
        // Si el usuario tiene rangos conseguidos guardados, los usamos
        this.inicializarMedallas();
      } else {
        // Si no hay usuario, mostramos todos los rangos como bloqueados
        this.usuarioRangoActual = 'NOVATO';
        this.usuarioPuntosActuales = 0;
        this.inicializarMedallas();
      }
      
      this.isLoading = false;
    });
  }

  cargarFechasConseguidas(): void {
    // Simulación - En producción esto vendría de una API
    const fechasRangos = {
      'NOVATO': '2025-06-01',
      'ASPIRANTE': '2025-06-05',
      'DISCIPLINADO': '2025-06-10',
      'CONSTANTE': '2025-06-15'
    };
    
    this.fechasConseguidas = fechasRangos;
  }

  inicializarMedallas(): void {
    // Obtener el índice del rango actual del usuario en base a su nombre
    const indiceRangoActual = this.RANGOS_DEFINIDOS.findIndex(
      rango => rango.nombre === this.usuarioRangoActual
    );
    
    if (indiceRangoActual === -1) {
      console.error('Rango actual del usuario no encontrado:', this.usuarioRangoActual);
      // Si no encontramos el rango por nombre, usamos los puntos como fallback
      this.inicializarMedallasPorPuntos();
      return;
    }
    
    // Crear las medallas con el estado correcto basado en el rango actual
    this.medallas = this.RANGOS_DEFINIDOS.map((rango, index) => {
      // Un rango está conseguido SOLAMENTE si su índice es <= al índice del rango actual
      const conseguida = index <= indiceRangoActual;
      
      return {
        nombre: rango.nombre,
        icono: rango.icono,
        conseguida: conseguida,
        descripcion: rango.mensajeMotivacional.split('!')[0] + '!',
        mensajeMotivacional: rango.mensajeMotivacional,
        puntosMinimos: rango.puntosMinimos,
        fechaConseguida: conseguida ? this.fechasConseguidas[rango.nombre] : undefined
      };
    });
    
    console.log('Medallas inicializadas por rango actual:', this.medallas);
  }

  // Método de respaldo que usa los puntos en lugar del nombre del rango
  inicializarMedallasPorPuntos(): void {
    this.medallas = this.RANGOS_DEFINIDOS.map(rango => {
      const conseguida = this.usuarioPuntosActuales >= rango.puntosMinimos;
      
      return {
        nombre: rango.nombre,
        icono: rango.icono,
        conseguida: conseguida,
        descripcion: rango.mensajeMotivacional.split('!')[0] + '!',
        mensajeMotivacional: rango.mensajeMotivacional,
        puntosMinimos: rango.puntosMinimos,
        fechaConseguida: conseguida ? this.fechasConseguidas[rango.nombre] : undefined
      };
    });
    
    console.log('Medallas inicializadas por puntos:', this.medallas);
  }

  onClose(): void {
    window.history.back();
  }

  // Método para obtener la imagen correcta según el estado de la medalla
  getRangoIcono(medalla: Rango): string {
    return medalla.conseguida ? medalla.icono : this.MEDALLA_DESCONOCIDA_PATH;
  }
}
