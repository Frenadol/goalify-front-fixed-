import { Component, OnInit } from '@angular/core';
import { UserPurchasesService } from '../user-purchases.service';
import { MarketItem } from '../market-item.model';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MarketItemDetailDialogComponent } from '../market-item-detail-dialog/market-item-detail-dialog.component';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-user-purchases',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule, 
    MatProgressSpinnerModule,
    MatTableModule,
    RouterModule
  ],
  templateUrl: './user-purchases.component.html',
  styleUrls: ['./user-purchases.component.css']
})
export class UserPurchasesComponent implements OnInit {
  purchases: MarketItem[] = [];
  isLoading = true;
  error: string | null = null;

  constructor(
    private userPurchasesService: UserPurchasesService,
    private dialog: MatDialog,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.loadPurchases();
  }

  loadPurchases(): void {
    this.isLoading = true;
    this.error = null;
    
    this.userPurchasesService.getUserPurchases().subscribe({
      next: (items) => {
        this.purchases = items;
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar tus compras. Por favor, inténtalo de nuevo más tarde.';
        this.isLoading = false;
        console.error('Error cargando compras:', err);
      }
    });
  }

  viewItemDetails(item: MarketItem): void {
    this.dialog.open(MarketItemDetailDialogComponent, {
      width: '450px',
      data: { 
        item: item,
        currentUser: this.authService.currentUserValue
      },
      panelClass: 'market-item-dialog-container'
    });
  }
}