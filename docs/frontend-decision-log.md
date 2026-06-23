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
- El logout definitivo vive en `Navbar` dentro de `MainLayout`.
- El Shell se compone de `Navbar` + `Sidebar` + `RouterOutlet`.
- `PatientsService` encapsula el consumo HTTP de pacientes y deja ownership al backend.
- `PatientsListPage` usa tabla Angular Material como primera representacion profesional del modulo Patients.
- El formulario de creacion de paciente no solicita `psychologistId`; el ownership se delega al backend mediante JWT.
- Los formularios simples de CRUD se abriran en modales para mantener contexto del listado.
- `PatientFormDialog` se reutiliza para creacion y edicion mediante `MAT_DIALOG_DATA`.
- `CaseFile` mantiene una relacion `1:1` con `Patient`; no tiene `DELETE`, depende de backend para ownership y es prerequisito para `Session Notes` y `Documents`.
- El detalle inicial de paciente se implementa como modal para mantener contexto del listado.
- `CaseFile` se gestiona desde el detalle del paciente porque la relacion es `1:1`.
- `Session Notes` se integran primero como infraestructura de frontend sin UI para desacoplar el consumo HTTP de la futura experiencia dentro del detalle del paciente.
- `Session Notes` dependen de `CaseFile` y se gestionaran desde el detalle del paciente y su expediente, no como modulo aislado.
- `Session Notes` se muestran dentro del detalle del paciente porque dependen de `CaseFile`.
- Las notas de sesion se crean desde el detalle del paciente usando el `CaseFile` actual.
- El frontend puede enviar `authorId` desde `AuthStore` en el MVP, pero el ownership final y la resolucion para `PSYCHOLOGIST` permanecen en backend.
