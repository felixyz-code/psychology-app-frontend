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

## URL base de la API

La URL base del backend proviene de `environment.apiUrl`, permitiendo centralizar la configuracion por entorno sin dispersar rutas base dentro del codigo.
