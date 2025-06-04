// filepath: c:\Users\Fernando\Desktop\proyecto defi\Goalify-frontend-main\src\app\admin\manage-market\market-admin.service.ts
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, filter } from 'rxjs/operators'; // <<--- ELIMINA OperatorFunction DE AQUÍ
import { MarketItemAdmin, CreateMarketItemDto } from './market-item-admin.model';
import { AuthService } from '../../auth.service'; // Asegúrate que la ruta es correcta
import { isPlatformBrowser } from '@angular/common'; // Necesario para isPlatformBrowser

// Interfaz para la respuesta del backend si es diferente al modelo del frontend
interface BackendArticuloTienda {
  id: number; // <<--- CAMBIO: Coincide con el nombre y tipo de la entidad del backend
  nombre: string;
  descripcion: string;
  tipoArticulo: 'COLOR_PERFIL' | 'TEMA_APLICACION' | 'AVATAR_PERFIL' | 'OTRO' | 'MEDALLA';
  valorArticulo?: string;
  costoPuntos: number;
  imagenPreviewUrl?: string;
  activo: boolean;
  // fechaCreacion: string; // Si también quieres usarla, el backend la envía como Instant, que se serializa a string ISO
}

@Injectable({
  providedIn: 'root'
})
export class MarketAdminService {
  private apiUrl = 'http://localhost:8080/api/admin/articulos-tienda';
  private isBrowser: boolean;

  constructor(
    private http: HttpClient,
    private authService: AuthService, // AuthService sigue siendo útil para otras cosas, como saber si el usuario está logueado
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  private getAuthHeaders(): HttpHeaders {
    let token = null;
    if (this.isBrowser) { // Solo acceder a localStorage si estamos en el navegador
      token = localStorage.getItem('authToken');
    }

    if (token) {
      return new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      });
    } else {
      // Manejar el caso donde no hay token. Podrías lanzar un error,
      // o devolver cabeceras sin Authorization, dependiendo de tu API.
      // Por ahora, devolvemos cabeceras sin token, pero esto podría causar errores 401/403.
      console.warn('No se encontró token de autenticación para las cabeceras.');
      return new HttpHeaders({
        'Content-Type': 'application/json'
      });
    }
  }

  // Método para crear un artículo
  createMarketItem(itemData: CreateMarketItemDto): Observable<MarketItemAdmin> {
    const headers = this.getAuthHeaders();
    return this.http.post<BackendArticuloTienda>(this.apiUrl, itemData, { headers }).pipe(
      map(backendItem => this.mapBackendToFrontend(backendItem)),
      filter(item => item !== null) as (source: Observable<MarketItemAdmin | null>) => Observable<MarketItemAdmin>, // Ajuste de tipo
      catchError(this.handleError)
    );
  }

  // Método para obtener todos los artículos
  getMarketItems(): Observable<MarketItemAdmin[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<BackendArticuloTienda[]>(this.apiUrl, { headers }).pipe(
      map(backendItems => backendItems.map(item => this.mapBackendToFrontend(item)).filter(item => item !== null) as MarketItemAdmin[]),
      catchError(this.handleError)
    );
  }

  // Método para actualizar un artículo
  updateMarketItem(id: number, itemData: Partial<CreateMarketItemDto>): Observable<MarketItemAdmin> {
    const headers = this.getAuthHeaders();
    // Convertimos el ID a string para la URL si el backend lo espera así
    return this.http.put<BackendArticuloTienda>(`${this.apiUrl}/${id.toString()}`, itemData, { headers }).pipe(
      map(backendItem => this.mapBackendToFrontend(backendItem)),
      filter(item => item !== null) as (source: Observable<MarketItemAdmin | null>) => Observable<MarketItemAdmin>, // Ajuste de tipo
      catchError(this.handleError)
    );
  }

  // Método para eliminar un artículo
  deleteMarketItem(id: number): Observable<void> {
    const headers = this.getAuthHeaders();
    // Convertimos el ID a string para la URL
    return this.http.delete<void>(`${this.apiUrl}/${id.toString()}`, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  // Método para activar/desactivar un artículo
  toggleActivoMarketItem(id: number, activo: boolean): Observable<MarketItemAdmin> {
    const headers = this.getAuthHeaders();
    // Convertimos el ID a string para la URL
    return this.http.patch<BackendArticuloTienda>(`${this.apiUrl}/${id.toString()}/toggle-activo`, { activo }, { headers }).pipe(
      map(backendItem => this.mapBackendToFrontend(backendItem)),
      filter(item => item !== null) as (source: Observable<MarketItemAdmin | null>) => Observable<MarketItemAdmin>, // Ajuste de tipo
      catchError(this.handleError)
    );
  }

  private mapBackendToFrontend(backendItem: BackendArticuloTienda): MarketItemAdmin | null {
    if (!backendItem) {
      console.warn('mapBackendToFrontend: Se recibió un backendItem nulo o undefined.');
      return null;
    }

    // Ya no es necesario Number() si el backendItem.id ya es un número
    // y tampoco es necesario comprobar isNaN si el tipo es correcto.
    if (typeof backendItem.id !== 'number') { // Una comprobación extra por si acaso
        console.error(
            `mapBackendToFrontend: El id "${backendItem.id}" no es un número. El artículo completo es:`,
            JSON.stringify(backendItem)
        );
        return null;
    }

    return {
      id: backendItem.id, // <<--- CAMBIO: Usa directamente backendItem.id
      nombre: backendItem.nombre,
      descripcion: backendItem.descripcion,
      precio: backendItem.costoPuntos,
      tipoArticulo: backendItem.tipoArticulo === 'MEDALLA' || backendItem.tipoArticulo === 'AVATAR_PERFIL' ? backendItem.tipoArticulo : 'AVATAR_PERFIL',
      valorArticulo: backendItem.valorArticulo,
      urlImagenPreview: backendItem.imagenPreviewUrl,
      activo: backendItem.activo
    };
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('API Error:', error);
    let errorMessage = 'Error desconocido del servidor.';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error del cliente: ${error.error.message}`;
    } else if (error.status) {
      errorMessage = `Error del servidor: ${error.status} - ${error.error?.message || error.statusText}`;
    }
    return throwError(() => new Error(errorMessage));
  }
}