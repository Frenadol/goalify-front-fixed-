import { Component, OnInit } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MarketAdminService } from './market-admin.service';
import { MarketItemAdmin, CreateMarketItemDto } from './market-item-admin.model';
import { MarketItemDialogComponent, MarketItemDialogData } from './market-item-dialog/market-item-dialog.component';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component'; // Corrected path
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table'; // Added for potential table usage
import { MatTooltipModule } from '@angular/material/tooltip'; // Added for potential tooltip usage
import { MatSlideToggleModule } from '@angular/material/slide-toggle'; // Added for active toggle if needed via UI
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-manage-market',
  templateUrl: './manage-market.component.html',
  styleUrls: ['./manage-market.component.css'],
  standalone: true,
  imports: [
    CommonModule, // Necesario para directivas como *ngIf, *ngFor y pipes como titlecase
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatDialogModule, // MatDialog is used programmatically, but its module might be needed if dialog components are used in template
    MatSnackBarModule, // MatSnackBar is used programmatically
    MatProgressSpinnerModule,
    MatTooltipModule,
    // ConfirmDialogComponent and MarketItemDialogComponent are opened programmatically,
    // so they don't need to be in imports here if they are standalone.
  ]
})
export class ManageMarketComponent implements OnInit {
  marketItems: MarketItemAdmin[] = [];
  displayedColumns: string[] = ['urlImagenPreview', 'nombre', 'tipoArticulo', 'precio', 'activo', 'acciones'];
  isLoading = false;
  errorMessage: string | null = null;

  constructor(
    private marketAdminService: MarketAdminService,
    public dialog: MatDialog,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.loadMarketItems();
  }

  loadMarketItems(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.marketAdminService.getMarketItems().subscribe({
      next: (items) => {
        // Asegúrate de que items es un array y filtra cualquier posible nulo si mapBackendToFrontend puede devolver null
        this.marketItems = items ? items.filter(item => item !== null) as MarketItemAdmin[] : [];
        
        // ¡¡IMPORTANTE!! Revisa este console.log en la consola de tu navegador
        console.log('Artículos del mercado RECIBIDOS (manage-market.component.ts):', JSON.stringify(this.marketItems, null, 2));
        
        this.marketItems.forEach(item => {
          console.log(`Para el artículo "${item.nombre}", la urlImagenPreview es: ${item.urlImagenPreview}`);
        });

        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = `Error al cargar artículos: ${err.message || 'Error desconocido'}`;
        console.error('Error en loadMarketItems:', err);
        this.isLoading = false;
      }
    });
  }

  openCreateItemDialog(): void {
    const dialogRef = this.dialog.open<MarketItemDialogComponent, MarketItemDialogData, MarketItemAdmin | boolean>( // Ajustar el tipo de resultado esperado
      MarketItemDialogComponent,
      {
        width: '700px',
        disableClose: true,
        data: {} 
      }
    );

    dialogRef.afterClosed().subscribe(result => {
      // Si 'result' es un objeto, significa que el artículo se creó con éxito en el diálogo
      // y 'result' es el artículo creado (MarketItemAdmin).
      // Si 'result' es 'false', el diálogo fue cancelado.
      if (result && typeof result === 'object') { 
        this.snackBar.open('Artículo creado con éxito', 'Cerrar', { duration: 3000, panelClass: ['snackbar-success'] });
        this.loadMarketItems(); // Simplemente recarga la lista, la creación ya se hizo.
      } else if (result === false) {
        // El usuario canceló el diálogo
        console.log('Creación de artículo cancelada.');
      }
      // No es necesario manejar 'isLoading' o 'errorMessage' aquí para la creación,
      // ya que la creación y su manejo de errores/carga ocurren dentro del diálogo.
      // loadMarketItems() manejará su propio estado de carga para la lista.
    });
  }

  openEditItemDialog(itemToEdit: MarketItemAdmin): void {
    const dialogRef = this.dialog.open(MarketItemDialogComponent, {
      width: '500px', // O el ancho que prefieras
      data: { item: itemToEdit } // <<--- PASA EL ITEM COMPLETO AQUÍ
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Si el diálogo devuelve 'true' o el artículo actualizado, recarga la lista
        this.loadMarketItems();
        this.snackBar.open('Artículo actualizado correctamente', 'Cerrar', { duration: 3000 });
      }
    });
  }

  onToggleActivo(item: MarketItemAdmin): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.marketAdminService.toggleActivoMarketItem(item.id, !item.activo).subscribe({
      next: (updatedItem) => {
        this.isLoading = false;
        const index = this.marketItems.findIndex(i => i.id === updatedItem.id);
        if (index > -1) {
          this.marketItems[index] = updatedItem;
          this.marketItems = [...this.marketItems]; 
        }
        this.snackBar.open(`Artículo ${updatedItem.activo ? 'activado' : 'desactivado'}`, 'Cerrar', { duration: 3000, panelClass: [updatedItem.activo ? 'snackbar-success' : 'snackbar-info'] });
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.message || 'Error al cambiar el estado del artículo.';
        this.snackBar.open(this.errorMessage ?? 'Error desconocido', 'Cerrar', { duration: 5000, panelClass: ['snackbar-error'] });
      }
    });
  }

  onDeleteItem(itemToDelete: MarketItemAdmin): void {
     // Validación más estricta del ID
    if (typeof itemToDelete.id !== 'number' || isNaN(itemToDelete.id)) {
      console.error('ID de artículo inválido o no numérico:', itemToDelete.id);
      this.snackBar.open('Error: El ID del artículo es inválido. No se puede eliminar.', 'Cerrar', { duration: 5000, panelClass: ['error-snackbar'] });
      return;
    }

    // Opcional: Añadir un diálogo de confirmación antes de borrar
    // const confirmDialog = this.dialog.open(ConfirmDialogComponent, {
    //   data: { title: 'Confirmar Borrado', message: `¿Estás seguro de que quieres eliminar el artículo "${itemToDelete.nombre}"?` }
    // });
    // confirmDialog.afterClosed().subscribe(confirmed => {
    //   if (confirmed) {
        this.isLoading = true; // Indicar que la operación está en curso
        this.marketAdminService.deleteMarketItem(itemToDelete.id).subscribe({ // Ya no necesitas '!' si validaste arriba
          next: () => {
            this.isLoading = false;
            this.snackBar.open('Artículo eliminado correctamente', 'Cerrar', { duration: 3000, panelClass: ['success-snackbar'] });
            this.loadMarketItems(); // Recarga la lista después de borrar
          },
          error: (err) => {
            this.isLoading = false;
            console.error('Error al eliminar el artículo:', err);
            // El mensaje de error del servicio ya es bastante descriptivo
            this.snackBar.open(err.message || 'Error al eliminar el artículo.', 'Cerrar', { duration: 7000, panelClass: ['error-snackbar'] });
          }
        });
    //   }
    // });
  }
}
