# Frontend API Integration

## Backend como fuente de verdad

El backend en NestJS es la fuente de verdad para autenticacion, reglas de negocio, validaciones y estructura de datos. El frontend debe consumir unicamente endpoints existentes y no debe asumir contratos no confirmados por la API real.

## Estrategia JWT

La autenticacion se integrara mediante JWT emitido por el backend. El frontend sera responsable de:

- enviar credenciales al endpoint disponible de autenticacion cuando se implemente esa pantalla;
- almacenar y recuperar el token segun la estrategia definida para la aplicacion;
- adjuntar el token en solicitudes protegidas mediante interceptor;
- reaccionar ante expiracion o rechazo del token segun la respuesta del backend.

## Contrato de autenticacion

Endpoint:

`POST /auth/login`

Request:

```json
{
  "email": "string",
  "password": "string"
}
```

Response:

```json
{
  "accessToken": "jwt",
  "user": {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "role": "ADMIN | PSYCHOLOGIST"
  }
}
```

## Roles actuales

- ADMIN
- PSYCHOLOGIST

## Estado de autenticacion en frontend

- `AuthStore` usa Angular Signals para centralizar el estado de autenticacion.
- El token y el usuario autenticado se guardan en `localStorage`.
- El interceptor futuro leera el token desde `AuthStore`.
- El guard futuro usara `isAuthenticated`.

## AuthService

- Consume `POST /auth/login`.
- Usa `environment.apiUrl`.
- Delega la persistencia de sesion a `AuthStore`.
- No redirige rutas directamente.

## HttpClient

- `HttpClient` se registra globalmente en `app.config.ts`.
- Los servicios de API lo usaran mediante `inject(HttpClient)`.
- Los interceptores se registran globalmente mediante `withInterceptors(...)`.

## JWT Interceptor

- Adjunta `Authorization Bearer` automaticamente.
- Lee el token desde `AuthStore`.
- Excluye `/auth/login`.
- No maneja expiracion todavia.

## Auth Guard

- Protege rutas privadas.
- Usa `AuthStore.isAuthenticated()`.
- Redirige a `/login` usando `UrlTree`.
- Todavia no valida roles por ruta.

## Patients API

- `GET /patients`
- `POST /patients`
- `GET /patients/:id`
- `PATCH /patients/:id`
- `DELETE /patients/:id`

## Case Files API

- Relacion `1:1` entre `Patient` y `CaseFile`.
- `CaseFile` es requisito para `Session Notes`.
- `CaseFile` es requisito para `Documents`.
- Ownership lo resuelve el backend.
- No existe endpoint `DELETE` para `Case Files`.
- `GET /case-files`
- `GET /case-files/:id`
- `GET /case-files/patient/:patientId`
- `POST /case-files`
- `PATCH /case-files/:id`

## Session Notes API

- `Session Notes` dependen de `CaseFile`.
- Se gestionaran desde el detalle del paciente y su expediente clinico.
- Ownership lo resuelve el backend.
- En el MVP frontend se puede enviar `authorId` desde `AuthStore`, igual que se hizo con `psychologistId`.
- Para `PSYCHOLOGIST`, el backend fuerza `authorId` a partir del JWT.
- `content` es requerido.
- `sessionDate` es requerido.
- `title` es opcional.
- `GET /session-notes`
- `GET /session-notes/case-file/:caseFileId`
- `GET /session-notes/:id`
- `POST /session-notes`
- `PATCH /session-notes/:id`
- `DELETE /session-notes/:id`

## Documents API

- `Documents` dependen de `CaseFile`.
- `Documents` no dependen de `Session Notes` por ahora.
- Se gestionan desde el detalle del paciente usando el `CaseFile` actual.
- Ownership lo resuelve el backend.
- Para subir documentos se usa exclusivamente `POST /documents/upload`.
- No se usa `POST /documents` metadata-only desde el frontend en esta etapa.
- El upload usa `multipart/form-data` con los campos `file`, `caseFileId` y `uploadedById`.
- Angular no debe setear manualmente `Content-Type` al enviar `FormData`.
- `uploadedById` se envia temporalmente desde `AuthStore` porque el DTO del backend lo requiere.
- El backend puede reemplazar `uploadedById` para `PSYCHOLOGIST` usando el JWT.
- El frontend valida localmente PDF, JPG, JPEG y PNG con maximo 10 MB.
- `filePath` no se muestra en UI y no se usa para ver o descargar documentos.
- Ver y descargar usan endpoints dedicados con `responseType: 'blob'`.
- `GET /documents`
- `GET /documents/case-file/:caseFileId`
- `GET /documents/:id`
- `POST /documents/upload`
- `GET /documents/:id/view`
- `GET /documents/:id/download`
- `DELETE /documents/:id`

## Appointments API

- `Appointments` dependen directamente de `Patient`.
- `Appointments` no dependen de `CaseFile`, `Session Notes` ni `Documents`.
- Se gestionan primero desde el detalle del paciente.
- Ownership lo resuelve el backend.
- ADMIN puede listar todas las citas.
- PSYCHOLOGIST solo ve citas propias.
- Para crear/editar, el frontend envia temporalmente `psychologistId` desde `AuthStore.user()?.id`.
- No existe selector de psicologos en frontend por ahora.
- No existe endpoint dedicado para cancelar citas.
- Cancelar cita se implementa con `PATCH /appointments/:id` enviando `status: 'CANCELLED'`.
- Eliminar cita se mantiene como accion separada con `DELETE /appointments/:id`.
- No se implementan validaciones de choque de horario en frontend.
- `GET /appointments`
- `GET /appointments/patient/:patientId`
- `GET /appointments/:id`
- `POST /appointments`
- `PATCH /appointments/:id`
- `DELETE /appointments/:id`

### Appointment model

```ts
type AppointmentStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

interface Appointment {
  id: string;
  patientId: string;
  psychologistId: string;
  scheduledAt: string;
  durationMinutes: number;
  status: AppointmentStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}
```

## URL base de la API

La URL base del backend proviene de `environment.apiUrl`, permitiendo centralizar la configuracion por entorno sin dispersar rutas base dentro del codigo.
