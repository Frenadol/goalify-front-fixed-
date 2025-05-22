// filepath: src/app/challenges/user-challenge.model.ts
import { Challenge } from './challenge.model'; // Opcional, si decides anidar el desafío

export interface UserChallenge {
  usuarioId: number | string; // CAMBIO: de idUsuario a usuarioId
  desafioId: number;          // CAMBIO: de idDesafio a desafioId
  fechaInscripcion?: string | Date; // La fecha en que el usuario se unió
  estadoParticipacion: string; // Ej: 'INSCRITO', 'EN_PROGRESO', 'COMPLETADO', 'FALLIDO'

  // Propiedades del DTO para facilitar el uso en la UI
  nombreDesafio?: string;
  descripcionDesafio?: string;
  puntosDesafio?: number;
  fechaCompletado?: string | Date | null; // Añadido para la plantilla
}