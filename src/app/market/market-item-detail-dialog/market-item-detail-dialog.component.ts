import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MarketItem } from '../market-item.model';
import { MarketService } from '../market.service';
import { AuthService, User } from '../../auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

export interface MarketItemDetailDialogData {
  item: MarketItem;
  currentUser: User | null;
}

@Component({
  selector: 'app-market-item-detail-dialog',
  templateUrl: './market-item-detail-dialog.component.html',
  styleUrls: ['./market-item-detail-dialog.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ]
})
export class MarketItemDetailDialogComponent implements OnInit {
  public item: MarketItem; 
  public currentUser: User | null; 
  isPurchasing = false;

  constructor(
    public dialogRef: MatDialogRef<MarketItemDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MarketItemDetailDialogData,
    private marketService: MarketService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {
    this.item = data.item;    
    this.currentUser = data.currentUser;  
  }

  ngOnInit(): void {
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  isItemUnlocked(): boolean {
    if (!this.currentUser || !this.item || !this.currentUser.preferences?.unlockedItems) {
      return false; 
    }
    return this.currentUser.preferences.unlockedItems.includes(this.item.id);
  }

  canAfford(): boolean {
    if (!this.currentUser || !this.item) {
      return false; 
    }
    return (this.currentUser.puntosRecord ?? 0) >= this.item.costoPuntos;
  }

  onPurchase(): void {
    if (!this.currentUser || !this.currentUser.id) {
      this.snackBar.open('Debes iniciar sesión para comprar.', 'Cerrar', { duration: 3000 });
      return;
    }
    if (!this.canAfford()) {
      this.snackBar.open('No tienes suficientes puntos.', 'Cerrar', { duration: 3000 });
      return;
    }
    if (this.isPurchasing) { return; }

    this.isPurchasing = true;
    this.marketService.purchaseItem(this.item.id).pipe(
      finalize(() => this.isPurchasing = false)
    ).subscribe({
      next: (response) => {
        this.snackBar.open(`¡Has comprado "${this.item.nombre}"!`, 'OK', { duration: 3000, panelClass: ['snackbar-success'] });
        this.authService.refreshCurrentUserData().subscribe({
            next: () => {
              this.dialogRef.close(true);
            },
            error: (err) => {
              console.error('Error refreshing user data:', err);
              this.dialogRef.close(true); // Close anyway
            }
        });
      },
      error: (err) => {
        console.error('Error en la compra:', err);
        this.snackBar.open(err.message || 'Error al comprar el artículo. Inténtalo de nuevo.', 'Cerrar', { duration: 5000, panelClass: ['snackbar-error'] });
      }
    });
  }
}