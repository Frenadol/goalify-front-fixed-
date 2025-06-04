import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { MarketItem } from './market-item.model';

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
  private apiUrl = 'http://localhost:8080/api';

  constructor(private http: HttpClient) {}

  /**
   * Obtiene los artículos adquiridos por el usuario actual desde el backend.
   */
  getUserPurchases(): Observable<MarketItem[]> {
    console.log('Intentando cargar Mis Compras desde el backend...');
    
    // Agregamos explícitamente el token de autorización
    const token = localStorage.getItem('auth_token');
    
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return this.http.get<UsuarioCompraDTO[]>(
      `${this.apiUrl}/usuarios/articulos-tienda/mis-compras`,
      { headers: headers }
    ).pipe(
      map(response => {
        console.log('Respuesta de Mis Compras:', response);
        
        if (!Array.isArray(response)) {
          console.error('Error: La respuesta de "mis-compras" no es un array:', response);
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
      catchError(error => {
        console.error('Error al cargar las compras del usuario:', error);
        console.error('Estado HTTP:', error.status);
        console.error('Mensaje:', error.error || error.message);
        return of([]);
      })
    );
  }
}