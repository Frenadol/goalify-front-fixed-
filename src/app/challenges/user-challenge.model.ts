// filepath: src/app/challenges/user-challenge.model.ts
import { Challenge } from './challenge.model'; // Opcional, si decides anidar el desafío

export interface UserChallenge {
  usuarioId: number | string; // CAMBIO: de idUsuario a usuarioId
  desafioId: number;          // CAMBIO: de idDesafio a desafioId
  fechaInscripcion?: string | Date; // La fecha en que el usuario se unió
  estadoParticipacion: string; // Ej: 'INSCRITO', 'EN_PROGRESO', 'COMPLETADO', 'FALLIDO'

  // Opcional: Si tu endpoint de "mis desafíos" devuelve los detalles completos del desafío anidados,
  // podrías incluirlo aquí para facilitar el acceso en el frontend.
  // Si no, obtendrás los detalles del desafío por separado si es necesario.
  // desafio?: Challenge;
}