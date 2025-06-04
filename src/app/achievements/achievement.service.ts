import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { UserAchievement, Achievement } from './achievement.model'; // Importa también Achievement
import { AuthService } from '../auth.service'; // Para obtener el usuario actual y sus rangos

// Define los rangos disponibles en tu aplicación
export const ALL_RANGOS: Achievement[] = [
  {
    id: 'NOVATO',
    name: 'Novato',
    description: 'Has comenzado tu viaje en Goalify.',
    iconUrl: 'assets/rangos/rangonovato.png', // Actualiza con tu ruta correcta
    category: 'Rango',
    criteria: 'Al registrarse en la aplicación.'
  },
  {
    id: 'ASPIRANTE',
    name: 'Aspirante',
    description: 'Estás mostrando promesa y dedicación.',
    iconUrl: 'assets/rangos/rangoaspirante.png', // Actualiza con tu ruta correcta
    category: 'Rango',
    criteria: 'Alcanzar X puntos o completar Y hábitos.'
  },
  {
    id: 'DISCIPLINADO',
    name: 'Disciplinado',
    description: 'La disciplina es tu aliada.',
    iconUrl: 'assets/rangos/rangodisciplinado.png', // Actualiza con tu ruta correcta
    category: 'Rango',
    criteria: 'Mantener Z hábitos durante N días.'
  },
  {
    id: 'CONSTANTE',
    name: 'Constante',
    description: 'La constancia te define.',
    iconUrl: 'assets/rangos/rangoconstante.png', // Actualiza con tu ruta correcta
    category: 'Rango',
    criteria: 'Completar X desafíos.'
  },
  // Añade los demás rangos: DEDICADO, INSPIRADOR, MAESTRO_HABITOS
  // ...
  {
    id: 'MAESTRO_HABITOS',
    name: 'Maestro de Hábitos',
    description: 'Has dominado el arte de formar hábitos.',
    iconUrl: 'assets/rangos/medallamaestro.png', // Asumo una imagen, actualiza
    category: 'Rango',
    criteria: 'Alcanzar el nivel más alto.'
  }
];

export const PLACEHOLDER_MEDAL_ICON = 'assets/rangos/medalladesconocida.png';

@Injectable({
  providedIn: 'root'
})
export class AchievementService {

  constructor(private authService: AuthService) { } // Inyecta AuthService

  // Simula la obtención de logros para un usuario
  getUserAchievements(userId: string | number): Observable<UserAchievement[]> {
    console.log(`AchievementService: Solicitando logros simulados para el usuario ${userId}`);

    // Datos de ejemplo - ¡Asegúrate de que las rutas de iconUrl sean válidas en tu proyecto!
    const simulatedAchievements: UserAchievement[] = [
      {
        id: 'userAch1',
        achievementId: 'rankNovato',
        userId: userId,
        name: 'Medalla de Novato',
        description: 'Has alcanzado el rango de Novato. ¡Sigue así!',
        iconUrl: 'assets/icons/achievements/rank_novato.png',
        dateEarned: new Date(2024, 0, 15),
        category: 'Rank'
      },
      {
        id: 'userAch2',
        achievementId: 'firstHabit',
        userId: userId,
        name: 'Primer Hábito Creado',
        description: 'Has dado el primer paso creando un hábito.',
        iconUrl: 'assets/icons/achievements/first_habit.png',
        dateEarned: new Date(2024, 1, 2),
        category: 'General'
      },
      {
        id: 'userAch3',
        achievementId: 'rankAprendiz',
        userId: userId,
        name: 'Medalla de Aprendiz',
        description: '¡Ascendiste a Aprendiz! Tu dedicación da frutos.',
        iconUrl: 'assets/icons/achievements/rank_aprendiz.png',
        dateEarned: new Date(2024, 2, 10),
        category: 'Rank'
      },
      {
        id: 'userAch4',
        achievementId: 'challengeCompleted',
        userId: userId,
        name: 'Desafío Superado',
        description: 'Completaste tu primer desafío con éxito.',
        iconUrl: 'assets/icons/achievements/challenge_completed.png',
        dateEarned: new Date(2024, 3, 5),
        category: 'Desafíos'
      }
    ];

    // Simula una pequeña demora de red
    return of(simulatedAchievements).pipe(delay(1000));
  }

  // Obtiene todos los rangos posibles y marca los que el usuario ha conseguido
  getAllUserRangos(): Observable<UserAchievement[]> {
    const currentUser = this.authService.currentUserValue;
    const userRangosConseguidos = currentUser?.rangosConseguidos || []; // Asume que tienes esto en tu modelo User

    const allUserAchievements: UserAchievement[] = ALL_RANGOS.map(rango => {
      const conseguido = userRangosConseguidos.includes(rango.id as any); // Verifica si el ID del rango está en los conseguidos
      return {
        id: rango.id, // ID del rango (NOVATO, ASPIRANTE, etc.)
        achievementId: rango.id,
        userId: currentUser?.id || 'unknown',
        name: rango.name,
        description: rango.description,
        iconUrl: conseguido ? rango.iconUrl : PLACEHOLDER_MEDAL_ICON,
        dateEarned: conseguido ? (currentUser?.fechasRangosConseguidos?.[rango.id] || new Date()) : undefined, // Asume que tienes esto
        category: 'Rango',
        conseguido: conseguido, // Nueva propiedad para saber si está desbloqueado
        criteria: rango.criteria
      };
    });
    return of(allUserAchievements).pipe(delay(200)); // Simula llamada
  }
}