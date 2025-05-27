export interface StatisticEntry {
  id: string | number; // o el tipo que uses para el ID de la estadística
  idHabito: string | number; // o el tipo que uses para el ID del hábito
  fecha: string | Date; // Fecha de la estadística
  puntosGanados: number; // <--- ASEGÚRATE DE QUE ESTA LÍNEA EXISTA Y SEA number
  // ... otras propiedades que pueda tener tu entrada de estadística
}