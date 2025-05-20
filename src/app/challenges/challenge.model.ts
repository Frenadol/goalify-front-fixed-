export interface Challenge {
  id?: number;
  nombre: string; // Corresponde a Desafio.nombre
  descripcion?: string;
  fechaInicio: string | Date; // Se manejará como Date en el form, string (ISO) para el backend
  fechaFin: string | Date;   // Se manejará como Date en el form, string (ISO) para el backend
  puntosRecompensa?: number;
  estado?: string; // Ej: 'activo', 'inactivo', 'completado'
  tipo?: string;   // Ej: 'individual', 'global'
  categoria?: string; // Ej: 'Salud', 'Aprendizaje'
  imageUrl?: string; // Opcional: para la imagen del desafío en el frontend
  // Campos que el backend podría añadir en el futuro o que son solo para UI
  // targetMetric?: string;
  // targetValue?: number;
}

// DTO para la creación/actualización desde el formulario de admin
export interface ChallengeFormData {
  nombre: string;
  descripcion?: string;
  fechaInicio: string; // Se enviará como string ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)
  fechaFin: string;   // Se enviará como string ISO 8601
  puntosRecompensa?: number;
  estado?: string;
  tipo?: string;
  categoria: string; // Backend lo tiene como @NotNull
  imageUrl?: string; // Opcional, si el backend lo soporta o para UI
}