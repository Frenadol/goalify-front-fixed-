import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { MarketItem } from './market-item.model';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth.service';

/**
 * Estructura de la respuesta del backend para un UsuarioCompraDTO
 */
interface UsuarioCompraDTO {
  id: number;
  idUsuarioId: number;
  nombreUsuario: string;
  idArticuloId: number;
  nombreArticulo: string;
  descripcionArticulo: string;
  tipoArticulo: string;
  costoPuntos: number;
  imagenPreviewUrl?: string;
  activoArticulo: boolean;
  fechaAdquisicion: string; // ISO date string
}

@Injectable({
  providedIn: 'root'
})
export class UserPurchasesService {
  // Usa la URL del entorno para consistencia
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  /**
   * Obtiene los artículos adquiridos por el usuario actual desde el backend.
   */
  getUserPurchases(): Observable<MarketItem[]> {
    console.log('Intentando cargar Mis Compras desde el backend...');
    
    // Verificamos si el usuario está autenticado
    if (!this.authService.isAuthenticated()) {
      console.warn('Usuario no autenticado, no se cargarán compras');
      return of([]);
    }

    // IMPORTANTE: Corregir la URL a /api/usuarios/articulos-tienda/mis-compras
    return this.http.get<UsuarioCompraDTO[]>(
      `${this.apiUrl}/api/usuarios/articulos-tienda/mis-compras`
    ).pipe(
      tap(response => console.log('Respuesta de Mis Compras:', response)),
      map(response => {
        if (!Array.isArray(response)) {
          console.error('Error: La respuesta no es un array:', response);
          return [];
        }
        
        return response.map(item => ({
          id: item.idArticuloId.toString(),
          nombre: item.nombreArticulo,
          description: item.descripcionArticulo,
          tipoArticulo: item.tipoArticulo,
          costoPuntos: item.costoPuntos,
          imagenPreviewUrl: item.imagenPreviewUrl,
          fechaAdquisicion: item.fechaAdquisicion,
          activo: item.activoArticulo
        } as MarketItem));
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Maneja los errores HTTP de forma apropiada
   */
  private handleError(error: HttpErrorResponse): Observable<MarketItem[]> {
    let errorMessage = 'Error al cargar compras del usuario.';
    
    if (error.status === 401 || error.status === 403) {
      console.warn('Error de autenticación al cargar compras:', error);
      return of([]);
    }
    
    console.error('Error al cargar las compras del usuario:', error);
    return of([]); // Siempre devolvemos array vacío en vez de un error
  }
}