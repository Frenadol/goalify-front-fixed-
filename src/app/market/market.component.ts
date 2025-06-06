// filepath: c:\Users\Fernando\Desktop\proyecto defi\Goalify-frontend-main\src\app\market\market.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { MarketService } from './market.service';
import { MarketItem } from './market-item.model'; // Asumiendo que esta es la importación original
import { AuthService, User } from '../auth.service';
import { Subscription } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MarketItemDetailDialogComponent } from './market-item-detail-dialog/market-item-detail-dialog.component';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-market',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule
    // Si MarketItemDetailDialogComponent es standalone, también debe estar aquí.
    // Si no, asegúrate de que el módulo que lo declara esté importado donde sea necesario.
  ],
  templateUrl: './market.component.html',
  styleUrls: ['./market.component.css']
})
export class MarketComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  marketItems: MarketItem[] = []; // Usando MarketItem con id: string
  isLoadingItems = true;
  isPurchasing: { [itemId: string]: boolean } = {}; // itemId es string
  errorMessage: string | null = null;

  private userSubscription: Subscription | undefined;
  private itemsSubscription: Subscription | undefined;

  constructor(
    private authService: AuthService,
    private marketService: MarketService,
    private snackBar: MatSnackBar,
    public dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.userSubscription = this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
      this.loadMarketItems(); // Cargar items cuando el usuario cambie o se inicialice
    });

    // Si no hay usuario al inicio (ej. carga inicial antes de que currentUser emita)
    if (!this.authService.currentUserValue) {
      this.loadMarketItems();
    }
  }

  loadMarketItems(): void {
    this.isLoadingItems = true;
    this.errorMessage = null;
    
    if (this.itemsSubscription) {
      this.itemsSubscription.unsubscribe();
    }
    
    // getMarketItems() del servicio ahora debería devolver Observable<MarketItem[]>
    // donde MarketItem tiene id: string y no necesariamente 'descripcion'
    this.itemsSubscription = this.marketService.getMarketItems().subscribe({
      next: (items) => {
        this.marketItems = items; // Asignación directa si los tipos coinciden
        this.isLoadingItems = false;
      },
      error: (err) => {
        this.errorMessage = err.message || 'Error al cargar los artículos.';
        this.isLoadingItems = false;
        console.error('Error cargando artículos:', err);
      }
    });
  }

  isItemUnlocked(itemId: string): boolean { // itemId es string
    if (!this.currentUser || !this.currentUser.preferences?.unlockedItems) {
      return false;
    }
    // Asumiendo que unlockedItems almacena strings
    return this.currentUser.preferences.unlockedItems.includes(itemId);
  }

  canAfford(cost: number): boolean {
    // Usando puntosRecord como en tu versión. Asegúrate que este campo existe y es correcto.
    return (this.currentUser?.puntosRecord ?? 0) >= cost;
  }

  openItemDetailsDialog(item: MarketItem): void { // item es MarketItem
    const dialogRef = this.dialog.open(MarketItemDetailDialogComponent, {
      width: '450px',
      data: { item: item, currentUser: this.currentUser }, 
      panelClass: 'market-item-dialog-container'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) { // Asumiendo que 'true' significa compra exitosa
        this.loadMarketItems(); // Recargar para reflejar cambios (ej. item comprado)
        if (this.authService.refreshCurrentUserData) { // Si existe el método para refrescar datos del usuario
            this.authService.refreshCurrentUserData().subscribe();
        }
      }
    });
  }

  purchaseItem(item: MarketItem): void { // item es MarketItem
    if (!this.currentUser || !this.currentUser.id) {
      this.snackBar.open('Debes iniciar sesión para comprar.', 'Cerrar', { duration: 3000 });
      return;
    }

    if (!this.canAfford(item.costoPuntos)) {
      this.snackBar.open('No tienes suficientes puntos para comprar este artículo.', 'Cerrar', { duration: 3000 });
      return;
    }

    if (this.isItemUnlocked(item.id)) { // item.id es string
      this.snackBar.open('Ya has adquirido este artículo.', 'Cerrar', { duration: 3000 });
      return;
    }

    if (this.isPurchasing[item.id]) { // item.id es string
      return; 
    }

    this.isPurchasing[item.id] = true; // item.id es string
    // marketService.purchaseItem espera un string ID
    this.marketService.purchaseItem(item.id).pipe(
      finalize(() => {
        this.isPurchasing[item.id] = false; // item.id es string
      })
    ).subscribe({
      next: (response) => {
        this.snackBar.open(`¡Has comprado "${item.nombre}"!`, 'OK', { duration: 3000, panelClass: ['snackbar-success'] });
        this.loadMarketItems(); 
        if (this.authService.refreshCurrentUserData) {
            this.authService.refreshCurrentUserData().subscribe();
        }
      },
      error: (err) => {
        console.error('Error al comprar:', err);
        this.snackBar.open(err.message || 'Error al comprar el artículo.', 'Cerrar', { duration: 5000, panelClass: ['snackbar-error'] });
      }
    });
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
    if (this.itemsSubscription) {
      this.itemsSubscription.unsubscribe();
    }
  }
}