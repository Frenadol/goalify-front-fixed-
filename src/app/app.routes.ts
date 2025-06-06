import { Routes } from '@angular/router';
import { RegisterComponent } from './register/register.component';
import { HomeComponent } from './home/home.component';
import { LoginComponent } from './login/login.component';
import { WelcomeComponent } from './welcome/welcome.component';
import { UserProfileDetailsComponent } from './user-profile-details/user-profile-details.component';
import { UserStatisticsComponent } from './user-statistics/user-statistics.component';
import { AuthGuard } from './auth.guard';
import { AdminDashboardComponent } from './admin/admin-dashboard/admin-dashboard.component';
import { ManageMarketComponent } from './admin/manage-market/manage-market.component';
import { MarketComponent } from './market/market.component';
import { ChallengeListComponent } from './challenges/challenge-list/challenge-list.component';
import { MyChallengesListComponent } from './challenges/my-challenges-list/my-challenges-list.component';
import { UserManagementComponent } from './admin/user-management/user-management.component';
import { adminGuard } from './admin/admin.guard';
import { adminChallengeRoutes } from './challenges/challenges-routing.module';
import { UserPurchasesComponent } from './market/user-purchases/user-purchases.component';
import { MedallasDialogComponent } from './medallas-dialog/medallas-dialog.component';

export const routes: Routes = [
  { path: 'home', component: HomeComponent, data: { renderMode: 'clientSide' } },
  { path: 'register', component: RegisterComponent, data: { renderMode: 'clientSide' } },
  { path: 'login', component: LoginComponent, data: { renderMode: 'clientSide' } },
  { path: '', redirectTo: '/home', pathMatch: 'full', data: { renderMode: 'clientSide' } },

  {
    path: 'habits',
    loadChildren: () => import('./habits/habits.module').then(m => m.HabitsModule),
    canActivate: [AuthGuard],
    data: { 
      renderMode: 'clientSide' // Ya está en clientSide
    }
  },
  {
    path: 'challenges',
    component: ChallengeListComponent,
    canActivate: [AuthGuard],
    data: { isAdminContext: false, renderMode: 'clientSide' } // Cambiado a clientSide
  },
  {
    path: 'my-challenges',
    component: MyChallengesListComponent,
    canActivate: [AuthGuard],
    data: { renderMode: 'clientSide' } // Cambiado a clientSide
  },
  { path: 'welcome', component: WelcomeComponent, canActivate: [AuthGuard], data: { renderMode: 'clientSide' } }, // Añadido data
  {
    path: 'user-profile',
    component: UserProfileDetailsComponent,
    canActivate: [AuthGuard],
    data: { renderMode: 'clientSide' } // Cambiado a clientSide
  },
  {
    path: 'user-statistics',
    component: UserStatisticsComponent,
    canActivate: [AuthGuard],
    data: { renderMode: 'clientSide' } // Cambiado a clientSide
  },
  {
    path: 'profile',
    component: UserProfileDetailsComponent,
    canActivate: [AuthGuard],
    data: { renderMode: 'clientSide' } // Cambiado a clientSide
  },
  {
    path: 'medallas',
    component: MedallasDialogComponent,
    canActivate: [AuthGuard],
    data: { renderMode: 'clientSide' } // Cambiado a clientSide
  },
  {
    path: 'app/progress',
    component: UserStatisticsComponent,
    canActivate: [AuthGuard],
    data: { renderMode: 'clientSide' } // Cambiado a clientSide
  },
  {
    path: 'market',
    component: MarketComponent,
    canActivate: [AuthGuard],
    data: { renderMode: 'clientSide' } // Cambiado a clientSide
  },
  {
    path: 'admin',
    canActivate: [AuthGuard, adminGuard],
    data: { renderMode: 'clientSide' }, // Ya está en clientSide
    children: [
      { path: 'dashboard', component: AdminDashboardComponent, data: { renderMode: 'clientSide' } }, // Añadido data
      { path: 'users', component: UserManagementComponent, data: { renderMode: 'clientSide' } }, // Añadido data
      // Ya estaba configurado correctamente para adminChallengeRoutes
      ...adminChallengeRoutes.map(route => ({
        ...route,
        data: { 
          ...(route.data || {}), 
          renderMode: 'clientSide' 
        }
      })),
      { path: 'market', component: ManageMarketComponent, data: { renderMode: 'clientSide' } }, // Añadido data
      { path: '', redirectTo: 'dashboard', pathMatch: 'full', data: { renderMode: 'clientSide' } } // Añadido data
    ]
  },
  {
    path: 'mis-compras',
    component: UserPurchasesComponent,
    canActivate: [AuthGuard],
    data: { renderMode: 'clientSide' } // Cambiado a clientSide
  },
  { path: '**', component: HomeComponent, data: { renderMode: 'clientSide' } } // Añadido data
];