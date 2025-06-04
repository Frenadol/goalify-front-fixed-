export interface MarketItem {
  id: string; // Cambiado a string para ser consistente con unlockedItems
  nombre: string;
  costoPuntos: number;
  description?: string;
  
  imagenUrl?: string;
  imagenPreviewUrl?: string; // Añadido para solucionar el error
  fechaAdquisicion?: string | Date; 

  tipoArticulo?: string;
  activo?: boolean;
}