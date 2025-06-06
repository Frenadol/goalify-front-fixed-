import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { provideServerRouting, RenderMode, ServerRoute } from '@angular/ssr';
import { appConfig } from './app.config';

// Define las rutas del servidor directamente aquí
const serverRoutes: ServerRoute[] = [
  // Dynamic routes that need special handling
  {
    path: 'habits/edit/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'admin/challenges/edit/:id',
    renderMode: RenderMode.Client
  },
  // Static routes
  {
    path: 'home',
    renderMode: RenderMode.Client
  },
  {
    path: 'register',
    renderMode: RenderMode.Client
  },
  {
    path: 'login',
    renderMode: RenderMode.Client
  },
  {
    path: '',
    renderMode: RenderMode.Client
  },
  {
    path: 'habits',
    renderMode: RenderMode.Client
  },
  {
    path: 'challenges',
    renderMode: RenderMode.Client
  },
  {
    path: 'my-challenges',
    renderMode: RenderMode.Client
  },
  {
    path: 'welcome',
    renderMode: RenderMode.Client
  },
  {
    path: 'user-profile',
    renderMode: RenderMode.Client
  },
  {
    path: 'user-statistics',
    renderMode: RenderMode.Client
  },
  {
    path: 'profile',
    renderMode: RenderMode.Client
  },
  {
    path: 'medallas',
    renderMode: RenderMode.Client
  },
  {
    path: 'admin',
    renderMode: RenderMode.Client
  },
  {
    path: 'mis-compras',
    renderMode: RenderMode.Client
  },
  {
    path: '**',
    renderMode: RenderMode.Client
  }
];

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),
    provideServerRouting(serverRoutes)
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
