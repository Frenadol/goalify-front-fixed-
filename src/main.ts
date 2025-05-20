import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config'; // <-- IMPORTA TU appConfig

bootstrapApplication(AppComponent, appConfig) // <-- USA appConfig AQUÍ
  .catch(err => console.error(err));
