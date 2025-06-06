import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { AuthService } from '../auth.service'; // Asegúrate que la ruta es correcta
import { isPlatformBrowser } from '@angular/common'; // Necesario para isPlatformBrowser

// Interfaz que podría haber estado en uso, causando discrepancias
export interface MarketItem {
  id: string; // ID como string
  nombre: string;
  // 'descripcion' podría estar ausente aquí
  costoPuntos: number;
  imagenPreviewUrl: string;
  tipoArticulo: string;
  activo: boolean;
  // Otras propiedades según tu modelo original
}

// Interfaz para el DTO del backend (puede diferir de MarketItem)
interface ArticuloTiendaBackendDto {
  id: any; // El backend podría enviar number o string
  nombre: string;
  descripcion: string; // El backend sí podría tener descripción
  tipoArticulo: string;
  valorArticulo?: string;
  costoPuntos: number;
  imagenPreviewUrl?: string;
  activo: boolean;
  fechaCreacion?: string;
}

export interface UsuarioArticuloTiendaResponse {
  id: number; // o string, dependiendo de la respuesta
  usuarioId: number; // o string
  articuloTiendaId: any; // Puede ser number o string
  fechaAdquisicion: string;
}

@Injectable({
  providedIn: 'root'
})
export class MarketService {
  private apiUrl = 'http://51.20.183.5:8080/api/articulos-tienda';
  private purchaseEndpoint = 'http://51.20.183.5:8080/api/usuarios/articulos-tienda/comprar';

  // Usando la interfaz MarketItem original
  private marketItemsInternal = new BehaviorSubject<MarketItem[]>([]);
  public marketItems$ = this.marketItemsInternal.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  // Mapeo simplificado o como lo tenías antes
  private mapToMarketItem(dto: ArticuloTiendaBackendDto): MarketItem {
    return {
      id: String(dto.id), // Convertir a string si era necesario
      nombre: dto.nombre,
      costoPuntos: dto.costoPuntos,
      imagenPreviewUrl: dto.imagenPreviewUrl || 'assets/img/placeholder.png',
      tipoArticulo: dto.tipoArticulo,
      activo: dto.activo,
      // Asegúrate de que las propiedades coincidan con tu MarketItem original
      // Si 'descripcion' no estaba en MarketItem, no se mapea aquí.
    };
  }

  getMarketItems(): Observable<MarketItem[]> {
    if (!isPlatformBrowser(this.platformId)) {
      return of([]);
    }
    return this.http.get<ArticuloTiendaBackendDto[]>(this.apiUrl).pipe(
      map(backendItems => backendItems.map(item => this.mapToMarketItem(item))),
      tap(frontendItems => this.marketItemsInternal.next(frontendItems)),
      catchError(this.handleError)
    );
  }

  getAllMarketItemDetails(): Observable<MarketItem[]> {
     if (!isPlatformBrowser(this.platformId)) {
      return of([]);
    }
    // Asumiendo un endpoint como /all o similar
    return this.http.get<ArticuloTiendaBackendDto[]>(`${this.apiUrl}/all-details`).pipe(
      map(backendItems => backendItems.map(item => this.mapToMarketItem(item))),
      catchError(this.handleError)
    );
  }

  getMarketItemById(id: string): Observable<MarketItem | null> {
    if (!isPlatformBrowser(this.platformId)) {
      return of(null);
    }
    return this.http.get<ArticuloTiendaBackendDto>(`${this.apiUrl}/${id}`).pipe(
      map(backendItem => backendItem ? this.mapToMarketItem(backendItem) : null),
      catchError(this.handleError)
    );
  }

  purchaseItem(itemId: string): Observable<UsuarioArticuloTiendaResponse> {
    // El ID aquí se espera como string, coincidiendo con MarketItem.id
    const body = { articuloTiendaId: itemId };
    return this.http.post<UsuarioArticuloTiendaResponse>(this.purchaseEndpoint, body).pipe(
      tap(response => {
        // Lógica original post-compra
      }),
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    console.error('Error en MarketService:', error);
    let errorMessage = 'Ocurrió un error desconocido en el servicio del mercado.';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error del cliente: ${error.error.message}`;
    } else {
      if (error.status === 0) {
        errorMessage = 'No se pudo conectar con el servidor del mercado. Inténtalo más tarde.';
      } else if (error.status === 404) {
        errorMessage = 'Artículo no encontrado.';
      } else if (error.status === 400 && error.error && typeof error.error === 'string') {
        errorMessage = error.error;
      } else if (error.status === 400 && error.error && error.error.message) {
        errorMessage = error.error.message;
      } else if (error.status === 401 || error.status === 403) {
        errorMessage = 'No autorizado o sin permisos para esta acción.';
      } else {
        errorMessage = `Error del servidor: ${error.status}. ${error.message || 'Error desconocido.'}`;
      }
    }
    return throwError(() => new Error(errorMessage));
  }
}