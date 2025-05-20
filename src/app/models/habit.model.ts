// filepath: src/app/models/habit.model.ts
export interface Habit {
  id: number;
  userId?: string; // o number, según tu backend
  nombre: string;
  descripcion?: string;
  frecuencia: string; // 'DIARIO', 'SEMANAL', etc.
  horaProgramada?: string; // formato HH:mm o null
  puntosRecompensa: number;
  estado: string; // 'activo', 'inactivo'
  fechaCreacion?: Date;
  ultimaActualizacion?: Date;
  // Otros campos que puedas tener, como rachaActual, etc.
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