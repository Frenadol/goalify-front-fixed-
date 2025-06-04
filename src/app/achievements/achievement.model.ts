export interface Achievement { // Interfaz base para un logro/rango
  id: string; // NOVATO, ASPIRANTE, etc.
  name: string;
  description: string;
  iconUrl: string;
  category?: string;
  criteria?: string; // Cómo se consigue
}

export interface UserAchievement extends Achievement { // Lo que el usuario ha conseguido o su estado
  userId: string | number;
  achievementId: string; // Coincide con Achievement.id
  dateEarned?: Date | string; // undefined si no se ha ganado
  conseguido?: boolean; // Para saber si está desbloqueado o es placeholder
}