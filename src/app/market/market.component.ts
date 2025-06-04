// filepath: c:\Users\Fernando\Desktop\proyecto defi\Goalify-frontend-main\src\app\market\market.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { MarketService } from './market.service';
import { MarketItem } from './market-item.model';
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
import { finalize } from 'rxjs/operators'; // Añade esta importación

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
  ],
  templateUrl: './market.component.html',
  styleUrls: ['./market.component.css']
})
export class MarketComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  marketItems: MarketItem[] = [];
  isLoadingItems = true;
  isPurchasing: { [itemId: string]: boolean } = {};
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
      this.loadMarketItems();
    });

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
    
    this.itemsSubscription = this.marketService.getMarketItems().subscribe({
      next: (items) => {
        this.marketItems = items;
        this.isLoadingItems = false;
      },
      error: (err) => {
        this.errorMessage = err.message || 'Error al cargar los artículos.';
        this.isLoadingItems = false;
        console.error('Error cargando artículos:', err);
      }
    });
  }

  isItemUnlocked(itemId: string): boolean {
    if (!this.currentUser || !this.currentUser.preferences?.unlockedItems) {
      return false;
    }
    return this.currentUser.preferences.unlockedItems.includes(itemId);
  }

  canAfford(cost: number): boolean {
    return (this.currentUser?.puntosRecord ?? 0) >= cost;
  }

  openItemDetailsDialog(item: MarketItem): void {
    const dialogRef = this.dialog.open(MarketItemDetailDialogComponent, {
      width: '450px',
      data: { item: item, currentUser: this.currentUser }, 
      panelClass: 'market-item-dialog-container'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        // La compra fue exitosa, recargar la lista de artículos
        this.loadMarketItems();
      }
    });
  }

  purchaseItem(item: MarketItem): void {
    if (!this.currentUser || !this.currentUser.id) {
      this.snackBar.open('Debes iniciar sesión para comprar.', 'Cerrar', { duration: 3000 });
      return;
    }

    if (!this.canAfford(item.costoPuntos)) {
      this.snackBar.open('No tienes suficientes puntos para comprar este artículo.', 'Cerrar', { duration: 3000 });
      return;
    }

    if (this.isItemUnlocked(item.id)) {
      this.snackBar.open('Ya has adquirido este artículo.', 'Cerrar', { duration: 3000 });
      return;
    }

    if (this.isPurchasing[item.id]) {
      return; // Ya hay una compra en curso para este item
    }

    this.isPurchasing[item.id] = true;
    this.marketService.purchaseItem(item.id).pipe(
      // finalize viene de rxjs/operators
      finalize(() => {
        this.isPurchasing[item.id] = false;
      })
    ).subscribe({
      next: (response) => {
        // Actualizar currentUser para reflejar los puntos gastados y el item adquirido
        this.snackBar.open(`¡Has comprado "${item.nombre}"!`, 'OK', { duration: 3000, panelClass: ['snackbar-success'] });
        this.loadMarketItems(); // Refrescar los ítems para reflejar el cambio
        this.authService.refreshCurrentUserData().subscribe(); // Actualizar datos del usuario
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