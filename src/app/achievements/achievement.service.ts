import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { UserAchievement } from './achievement.model';

@Injectable({
  providedIn: 'root'
})
export class AchievementService {

  constructor() { }

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
        iconUrl: 'assets/icons/achievements/rank_novato.png', // CAMBIA ESTA RUTA
        dateEarned: new Date(2024, 0, 15), // Mes es 0-indexado (0 = Enero)
        category: 'Rank'
      },
      {
        id: 'userAch2',
        achievementId: 'firstHabit',
        userId: userId,
        name: 'Primer Hábito Creado',
        description: 'Has dado el primer paso creando un hábito.',
        iconUrl: 'assets/icons/achievements/first_habit.png', // CAMBIA ESTA RUTA
        dateEarned: new Date(2024, 1, 2),
        category: 'General'
      },
      {
        id: 'userAch3',
        achievementId: 'rankAprendiz',
        userId: userId,
        name: 'Medalla de Aprendiz',
        description: '¡Ascendiste a Aprendiz! Tu dedicación da frutos.',
        iconUrl: 'assets/icons/achievements/rank_aprendiz.png', // CAMBIA ESTA RUTA
        dateEarned: new Date(2024, 2, 10),
        category: 'Rank'
      },
      {
        id: 'userAch4',
        achievementId: 'challengeCompleted',
        userId: userId,
        name: 'Desafío Superado',
        description: 'Completaste tu primer desafío con éxito.',
        iconUrl: 'assets/icons/achievements/challenge_completed.png', // CAMBIA ESTA RUTA
        dateEarned: new Date(2024, 3, 5),
        category: 'Desafíos'
      }
    ];

    // Simula una pequeña demora de red
    return of(simulatedAchievements).pipe(delay(1000));
  }
}