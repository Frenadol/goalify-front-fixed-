import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ChallengeListComponent } from './challenge-list/challenge-list.component';
import { ChallengeFormComponent } from './challenge-form/challenge-form.component';
import { AuthGuard } from '../auth.guard';
import { adminGuard } from '../admin/admin.guard';

// Rutas para la sección de desafíos accesibles por usuarios logueados
// Estas rutas se usarían con `loadChildren` si tuvieras un módulo dedicado
// o si quisieras agrupar varias rutas de usuario bajo '/challenges'.
// Dado que en app.routes.ts estás cargando ChallengeListComponent directamente,
// este array `challengeUserRoutes` es más para referencia o futuro uso.
const challengeUserRoutes: Routes = [
  {
    path: '', // Corresponderá a '/challenges' si se usa con loadChildren
    component: ChallengeListComponent,
    canActivate: [AuthGuard]
  },
  // Ejemplo de una ruta de detalle para el usuario:
  // {
  //   path: ':id', // Se accedería como '/challenges/:id'
  //   component: ChallengeDetailUserViewComponent, // Necesitarías crear este componente
  //   canActivate: [AuthGuard]
  // }
];

// Rutas específicas para la administración de desafíos (se anidarán bajo '/admin' en app.routes.ts)
export const adminChallengeRoutes: Routes = [
  {
    path: 'challenges', // Se accederá como '/admin/challenges'
    component: ChallengeListComponent,
    canActivate: [AuthGuard, adminGuard],
    data: { isAdminContext: true } // <--- ASEGÚRATE DE QUE ESTO ESTÉ PRESENTE
  },
  {
    path: 'challenges/new',
    component: ChallengeFormComponent,
    canActivate: [AuthGuard, adminGuard]
  },
  {
    path: 'challenges/edit/:id',
    component: ChallengeFormComponent,
    canActivate: [AuthGuard, adminGuard]
  },
  // Podrías añadir una lista de desafíos para admin aquí si es diferente a la de usuario
  // y si quieres que tenga su propia ruta, por ejemplo:
  // {
  //   path: 'challenges', // Se accedería como '/admin/challenges'
  //   component: AdminChallengeManagementListComponent, // Necesitarías crear este componente
  //   canActivate: [AuthGuard, adminGuard]
  // }
];

@NgModule({
  // No se necesita `imports: [RouterModule.forChild(...)]` aquí si los componentes
  // son standalone y las rutas se definen directamente en `app.routes.ts` o
  // se importan como arrays (como `adminChallengeRoutes`).
  // Este módulo es principalmente un contenedor para exportar las definiciones de rutas.
  exports: [RouterModule] // Exportar RouterModule es una buena práctica, aunque no se use `forChild` aquí.
})
export class ChallengesRoutingModule { }

// Exportar también las rutas de usuario para que puedan ser importadas en app.routes.ts si es necesario.
export { challengeUserRoutes };