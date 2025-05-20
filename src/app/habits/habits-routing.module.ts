// filepath: src/app/habits/habits-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HabitListComponent } from './habit-list/habit-list.component';
import { HabitFormComponent } from './habit-form/habit-form.component';
// Importa un AuthGuard si quieres proteger estas rutas
// import { AuthGuard } from '../auth/auth.guard';

const routes: Routes = [
  {
    path: '', // Esto corresponderá a la ruta '/habits' (definida en app.routes.ts)
    children: [
      {
        path: '', // Ruta por defecto para '/habits', muestra la lista
        component: HabitListComponent
      },
      {
        path: 'new', // Ruta para '/habits/new', muestra el formulario de creación
        component: HabitFormComponent // <--- ESTA ES LA RUTA PARA CREAR
      },
      {
        path: 'edit/:id', // Ruta para '/habits/edit/:id', muestra el formulario de edición
        component: HabitFormComponent
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HabitsRoutingModule { }