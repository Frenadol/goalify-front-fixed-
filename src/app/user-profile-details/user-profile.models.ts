import { Challenge } from '../challenges/challenge.model';
import { UserChallenge } from '../challenges/user-challenge.model';

export interface UserPreferences {
  // Define aquí las preferencias del usuario
}

export interface UserProfileData {
  // Define aquí los datos del perfil del usuario
}

export interface HabitStats {
  totalCompletionsToday: number;
  totalOverallCompletions: number;
  activeHabits: number;
  longestStreakOverall: number;
  // Añade cualquier otra propiedad que necesites para las estadísticas de hábitos
}

export interface UserChallengeDetail {
  id: number;
  nombre: string;
  descripcion?: string;
  fechaInicio?: Date | string; // Cambiado a opcional
  fechaFin?: Date | string;   // Cambiado a opcional
  puntosRecompensa?: number;
  estado?: string; // 'ACTIVO', 'PENDIENTE', 'FINALIZADO', 'CANCELADO' (estado del Challenge original)
  tipo?: string; // 'INDIVIDUAL', 'GRUPAL'
  categoria?: string;
  imageUrl?: string;
  userChallengeData: UserChallenge; // La relación UsuarioDesafio
  isCompletingAction?: boolean;
}

export interface UserProfileUpdatePayload {
  // Define aquí la carga útil para actualizar el perfil del usuario
}