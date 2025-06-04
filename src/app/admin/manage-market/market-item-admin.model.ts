// filepath: c:\Users\Fernando\Desktop\proyecto defi\Goalify-frontend-main\src\app\admin\manage-market\market-item-admin.model.ts
export interface MarketItemAdmin {
  id: number; // Asegúrate que sea number
  nombre: string;
  descripcion?: string;
  precio: number; // En el backend es costoPuntos
  categoria?: string; // Lo hicimos opcional antes, mantenlo así o elimínalo si no lo usas
  tipoArticulo: 'AVATAR_PERFIL' | 'MEDALLA';
  valorArticulo?: string; // Específico para ciertos tipos, ej: código de color, nombre de tema
  urlImagenPreview?: string; // Para mostrar la imagen existente
  activo: boolean;
  // fechaCreacion?: string; // o Date
}

// DTO para crear un nuevo artículo
export interface CreateMarketItemDto {
  nombre: string;
  descripcion?: string;
  categoria?: string; // Opcional
  tipoArticulo: 'AVATAR_PERFIL' | 'MEDALLA';
  valorArticulo?: string;
  costoPuntos: number;
  // imagenPreviewUrl?: string; // Eliminamos la URL directa para la creación/actualización
  imagenBase64?: string; // Nuevo campo para la imagen en Base64
  activo?: boolean;
}