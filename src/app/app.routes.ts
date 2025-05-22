import { Routes } from '@angular/router';
import { RegisterComponent } from './register/register.component';
import { HomeComponent } from './home/home.component';
import { LoginComponent } from './login/login.component';
import { WelcomeComponent } from './welcome/welcome.component';
import { AuthGuard } from './auth.guard';
import { AdminDashboardComponent } from './admin/admin-dashboard/admin-dashboard.component';
import { adminGuard } from './admin/admin.guard';
import { UserManagementComponent } from './admin/user-management/user-management.component';
import { UserProfileDetailsComponent } from './user-profile-details/user-profile-details.component'; // <-- IMPORTA EL NUEVO COMPONENTE

// Importar rutas de admin para desafíos
import { adminChallengeRoutes } from './challenges/challenges-routing.module';
// Importar componentes de desafío directamente si son standalone y se usan con loadComponent
import { ChallengeListComponent } from './challenges/challenge-list/challenge-list.component';
import { MyChallengesListComponent } from './challenges/my-challenges-list/my-challenges-list.component'; // CAMBIO AQUÍ

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
    path: 'challenges', // Ruta para que los usuarios vean la lista general de desafíos
    component: ChallengeListComponent,
    canActivate: [AuthGuard],
    data: { isAdminContext: false } // <--- Para diferenciar del contexto de admin
  },
  { // NUEVA RUTA PARA "MIS DESAFÍOS"
    path: 'my-challenges',
    component: MyChallengesListComponent,
    canActivate: [AuthGuard]
  },
  { path: 'welcome', component: WelcomeComponent, canActivate: [AuthGuard] },
  { // NUEVA RUTA PARA EL PERFIL DETALLADO DEL USUARIO
    path: 'user-profile', // Esta es la ruta que ya usas en welcome.component.html
    component: UserProfileDetailsComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'admin',
    canActivate: [AuthGuard, adminGuard],
    children: [
      { path: 'dashboard', component: AdminDashboardComponent },
      { path: 'users', component: UserManagementComponent },
      // Integrar las rutas de administración de desafíos aquí
      ...adminChallengeRoutes, // Estas rutas ya tienen sus componentes definidos
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  // { path: '**', component: PageNotFoundComponent } // Considera añadir una página 404
];