// filepath: src/app/models/habit.model.ts
export interface Habit {
  id: number;
  // idUsuario: number; // Uncomment if you have this property
  nombre: string;
  descripcion?: string;
  frecuencia: string;

  // Properties needed to fix errors
  puntosRecompensa: number;
  horaProgramada?: string | null;
  estado: string;
  fechaUltimaCompletacion?: string | Date | null;
  fechaCreacion?: string | Date; // Used for sorting
  rachaActual?: number;

  // Add these missing properties
  iconoUrl?: string;
  categoria?: string;
  metaDiaria?: string | number; // Or simply meta?: string | number;
  puntosPorCompleticion?: number; // This might be intended to be puntosRecompensa, verify if distinct field needed
  puntosBase?: number;

  // Optional: other common habit properties
  // colorEtiqueta?: string;
  // icono?: string; // If you use a general 'icon' field for Material Icons vs imageUrl
  // meta?: string;
  // unidadMeta?: string;
  // valorMeta?: number;
  // rachaMasLarga?: number;
  // isCompletedToday?: boolean; // If backend sends this directly
}

export interface PredefinedHabit {
  id: string; // Identificador único para el hábito predefinido
  name: string; // Nombre interno o clave para el hábito
  displayName: string; // Nombre que se muestra al usuario
  imageUrl: string;
  defaultDescription?: string;
  puntosSugeridos?: number;
  frecuenciaSugerida?: string;
}

// Esta es la interfaz para los datos que envías al backend
// No incluye 'id' (lo asigna el backend en creación) ni 'puntosRecompensa' (los asigna el backend)
export interface HabitClientPayload {
  nombre: string;
  descripcion?: string;
  frecuencia: string;
  horaProgramada?: string | null; // Asegúrate de que coincida con lo que espera el backend
  estado: string;
}