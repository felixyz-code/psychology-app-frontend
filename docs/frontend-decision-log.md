# Frontend Decision Log

## Decisiones iniciales

- Angular 21 como framework principal del frontend.
- Angular Material como base del sistema visual y de componentes.
- Angular Signals en lugar de NgRx para el manejo de estado inicial.
- Enfoque backend first para respetar la API existente como contrato principal.
- JWT Authentication como estrategia de autenticacion.
- Responsive Design desde la base de la aplicacion.
- Dockerizado en backend unicamente por ahora; el frontend no incorpora dockerizacion en esta etapa.
- Se crea `AuthStore` con Angular Signals para manejar sesion sin NgRx ni RxJS.
- `AuthService` se limita a comunicacion HTTP de autenticacion y delega estado en `AuthStore`.
- `HttpClient` se registra globalmente mediante `provideHttpClient` en `app.config.ts`.
- Se usa `HttpInterceptorFn` moderno en lugar de interceptor basado en clase.
- Se usa `CanActivateFn` funcional para guards en lugar de clases legacy.
- Las rutas iniciales usan lazy loading con `loadComponent` y componentes standalone.
- Login usa Reactive Forms y Angular Material; `AuthService` se encarga de la sesion.
- Logout validado antes de construir el layout definitivo.
