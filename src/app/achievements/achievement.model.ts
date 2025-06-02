export interface Achievement {
  id: string; // Identificador único del tipo de logro
  name: string;
  description: string;
  iconUrl: string; // Ruta al icono del logro
  category?: string; // Ej: 'General', 'Rango', 'Hábito Específico'
  // Otros campos que definan un logro base
}

export interface UserAchievement {
  id: string | number; // Identificador único del logro obtenido por el usuario
  achievementId: string; // Referencia al ID del Achievement base
  userId: string | number; // ID del usuario que obtuvo el logro
  name: string; // Nombre del logro (puede ser denormalizado)
  description: string; // Descripción (puede ser denormalizado)
  iconUrl: string; // Ruta al icono (puede ser denormalizado)
  dateEarned: Date | string; // Fecha en que se obtuvo el logro
  category?: string; // Categoría, útil para filtrar (ej. 'Rank')
  // Otros campos específicos del logro del usuario
}