import { Routes } from '@angular/router';
import { RegisterComponent } from './register/register.component';
import { HomeComponent } from './home/home.component';
import { LoginComponent } from './login/login.component';
import { WelcomeComponent } from './welcome/welcome.component';
import { UserProfileDetailsComponent } from './user-profile-details/user-profile-details.component';
import { UserStatisticsComponent } from './user-statistics/user-statistics.component';
import { AuthGuard } from './auth.guard';
import { AdminDashboardComponent } from './admin/admin-dashboard/admin-dashboard.component';
import { ManageMarketComponent } from './admin/manage-market/manage-market.component'; // Para admin
import { MarketComponent } from './market/market.component'; // <--- AÑADE ESTA IMPORTACIÓN
import { ChallengeListComponent } from './challenges/challenge-list/challenge-list.component';
import { MyChallengesListComponent } from './challenges/my-challenges-list/my-challenges-list.component';
import { UserManagementComponent } from './admin/user-management/user-management.component';
import { adminGuard } from './admin/admin.guard';
import { adminChallengeRoutes } from './challenges/challenges-routing.module';
import { UserPurchasesComponent } from './market/user-purchases/user-purchases.component'; // Importa el componente aquí
import { MedallasDialogComponent } from './medallas-dialog/medallas-dialog.component'; // Asegúrate de importar el componente MedallasDialogComponent


export const routes: Routes = [
  { path: 'home', component: HomeComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'login', component: LoginComponent },
  { path: '', redirectTo: '/home', pathMatch: 'full' },

  {
    path: 'habits',
    loadChildren: () => import('./habits/habits.module').then(m => m.HabitsModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'challenges',
    component: ChallengeListComponent,
    canActivate: [AuthGuard],
    data: { isAdminContext: false }
  },
  {
    path: 'my-challenges',
    component: MyChallengesListComponent,
    canActivate: [AuthGuard]
  },
  { path: 'welcome', component: WelcomeComponent, canActivate: [AuthGuard] },
  {
    path: 'user-profile',
    component: UserProfileDetailsComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'user-statistics',
    component: UserStatisticsComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'profile',
    component: UserProfileDetailsComponent, // Redirige profile a user-profile
    canActivate: [AuthGuard]
  },
  {
    path: 'medallas',
    component: MedallasDialogComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'app/progress',
    component: UserStatisticsComponent,
    canActivate: [AuthGuard]
  },
  { // <--- RUTA PARA EL MERCADO DEL USUARIO
    path: 'market',
    component: MarketComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'admin',
    canActivate: [AuthGuard, adminGuard],
    children: [
      { path: 'dashboard', component: AdminDashboardComponent },
      { path: 'users', component: UserManagementComponent },
      ...adminChallengeRoutes,
      { path: 'market', component: ManageMarketComponent }, // Esta es la gestión de admin
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  {
    path: 'mis-compras',
    component: UserPurchasesComponent,
    canActivate: [AuthGuard]
  },
  { path: '**', component: HomeComponent } // Ruta wildcard para manejar rutas desconocidas
];