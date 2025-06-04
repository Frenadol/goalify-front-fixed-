import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { MarketItem } from './market-item.model';
import { AuthService, User } from '../auth.service';
import { isPlatformBrowser } from '@angular/common';

// Asegúrate que esta interfaz coincida con tu DTO de backend
interface ArticuloTiendaBackend {
  id: number;
  nombre: string;
  descripcion: string;
  tipoArticulo: string;
  valorArticulo?: string;
  costoPuntos: number;
  imagenPreviewUrl?: string;
  activo: boolean;
  fechaCreacion?: string;
}

export interface UsuarioArticuloTiendaResponse {
  id: number;
  usuarioId: number;
  articuloTiendaId: number;
  fechaAdquisicion: string;
}

@Injectable({
  providedIn: 'root'
})
export class MarketService {
  private apiUrl = 'http://localhost:8080/api/articulos-tienda';
  private purchaseEndpoint = 'http://localhost:8080/api/usuarios/articulos-tienda/comprar';

  private marketItemsInternal = new BehaviorSubject<MarketItem[]>([]);
  public marketItems$ = this.marketItemsInternal.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  private mapBackendToFrontend(articulo: ArticuloTiendaBackend): MarketItem | null {
    if (!articulo) {
      return null;
    }
    return {
      id: articulo.id.toString(), // Convertir ID a string para que coincida con UnlockedItems
      nombre: articulo.nombre,
      description: articulo.descripcion,
      tipoArticulo: articulo.tipoArticulo,
      costoPuntos: articulo.costoPuntos,
      imagenPreviewUrl: articulo.imagenPreviewUrl,
      activo: articulo.activo
    };
  }

  getMarketItems(): Observable<MarketItem[]> {
    const currentUser = this.authService.currentUserValue;
    const unlockedItemIds = new Set<string>(currentUser?.preferences?.unlockedItems || []);

    return this.http.get<ArticuloTiendaBackend[]>(this.apiUrl).pipe(
      map(backendItems => {
        // Convertir los items del backend al formato del frontend
        const frontendItems = backendItems
          .filter(item => item.activo) // Solo mostrar items activos
          .map(item => this.mapBackendToFrontend(item))
          .filter((item): item is MarketItem => item !== null); // Filtrar nulls y TypeScript type guard

        // Filtrar artículos que el usuario ya ha desbloqueado
        const availableItems = frontendItems.filter(item => !unlockedItemIds.has(item.id));
        
        return availableItems;
      }),
      catchError(error => {
        console.error('Error fetching market items:', error);
        return throwError(() => new Error('No se pudieron cargar los artículos del mercado. Por favor, inténtalo de nuevo más tarde.'));
      })
    );
  }

  getMarketItemById(id: string): Observable<MarketItem | null> {
    return this.http.get<ArticuloTiendaBackend>(`${this.apiUrl}/${id}`).pipe(
      map(item => this.mapBackendToFrontend(item)),
      catchError(error => {
        console.error(`Error fetching market item with ID ${id}:`, error);
        return throwError(() => new Error('No se pudo cargar el artículo solicitado.'));
      })
    );
  }

  purchaseItem(itemId: string): Observable<UsuarioArticuloTiendaResponse> {
    return this.http.post<UsuarioArticuloTiendaResponse>(this.purchaseEndpoint, { idArticulo: itemId }).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Ocurrió un error desconocido.';
    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Error del lado del servidor
      if (error.status === 400) {
        errorMessage = error.error?.mensaje || 'Solicitud inválida. Verifica los datos.';
      } else if (error.status === 401) {
        errorMessage = 'No autorizado. Por favor, inicia sesión de nuevo.';
      } else if (error.status === 403) {
        errorMessage = 'No tienes permisos para realizar esta acción.';
      } else if (error.status === 404) {
        errorMessage = 'El artículo solicitado no existe.';
      } else if (error.status === 409) {
        errorMessage = 'Ya posees este artículo.';
      } else if (error.status === 422) {
        errorMessage = 'No tienes suficientes puntos para comprar este artículo.';
      } else {
        errorMessage = `Error del servidor: ${error.status}. Inténtalo más tarde.`;
      }
    }
    console.error('Error en MarketService:', error);
    return throwError(() => new Error(errorMessage));
  }
}