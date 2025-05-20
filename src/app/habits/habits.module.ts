import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms'; // Asegúrate que esté si no lo está ya

import { HabitsRoutingModule } from './habits-routing.module';
import { HabitListComponent } from './habit-list/habit-list.component'; // Si está declarado aquí
import { HabitFormComponent } from './habit-form/habit-form.component'; // Si está declarado aquí

// Angular Material Modules
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select'; // Para tus otros selectores
import { MatButtonModule } from '@angular/material/button'; // Para botones
import { MatIconModule } from '@angular/material/icon'; // Para iconos

@NgModule({
  declarations: [
    // HabitListComponent, // Descomenta si están declarados aquí y no son standalone
    // HabitFormComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule, // Necesario para FormGroup
    HabitsRoutingModule,
    // Angular Material
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule
  ]
})
export class HabitsModule { }
