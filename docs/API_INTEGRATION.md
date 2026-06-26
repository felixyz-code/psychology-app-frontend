# API Integration

> Frontend integration strategy for the Psychology Management System.

---

# Purpose

This document describes how the Angular frontend communicates with the backend.

It documents:

- Authentication
- HTTP communication
- JWT strategy
- Services
- Interceptors
- Route guards
- File upload and download
- Integration conventions

The backend API contract is documented in the backend repository.

---

# Overview

The frontend follows a backend-first architecture.

Business rules remain on the backend.

The frontend is responsible for:

- User interaction
- Forms
- Navigation
- Client-side validation
- HTTP communication

The frontend never duplicates backend business logic.

---

# Backend as Source of Truth

The NestJS backend is responsible for:

- Authentication
- Authorization
- Ownership
- Validation
- Business rules
- Database persistence

The Angular frontend should only consume existing endpoints.

The frontend must never assume contracts that do not exist.

---

# Environment Configuration

The backend base URL is provided through:

```ts
environment.apiUrl
```

Services must never hardcode API URLs.

---

# HttpClient

HTTP communication uses Angular HttpClient.

Current conventions:

- `inject(HttpClient)`
- Standalone providers
- Global registration in `app.config.ts`

All API communication should go through dedicated services.

---

# Authentication

Authentication uses JWT.

Login endpoint:

```text
POST /auth/login
```

The frontend is responsible for:

- Sending credentials
- Persisting the session
- Attaching JWT
- Clearing the session on logout

Authentication rules remain on the backend.

---

# AuthStore

Authentication state is centralized in `AuthStore`.

Current responsibilities:

- Current user
- Access token
- Authentication state
- Session persistence

Implementation uses Angular Signals.

---

# JWT Interceptor

The JWT interceptor:

- Reads the token from `AuthStore`
- Adds Authorization header
- Excludes `/auth/login`
- Does not refresh tokens

Refresh Tokens are outside the current MVP.

---

# Route Guards

Protected routes use Angular Guards.

Current responsibilities:

- Validate authentication
- Redirect anonymous users
- Return `UrlTree`

Role-based routing is not implemented.

Authorization remains enforced by the backend.

---

# Feature Services

Each business feature owns its own service.

Current services include:

- AuthService
- PatientsService
- CaseFilesService
- SessionNotesService
- DocumentsService
- AppointmentsService

Services encapsulate HTTP communication.

Components should never call HttpClient directly.

---

# File Upload Strategy

Documents are uploaded using:

```text
POST /documents/upload
```

Current implementation:

- multipart/form-data
- FormData
- Blob downloads
- Blob previews

Angular must never manually set:

```http
Content-Type
```

when sending FormData.

---

# Error Handling

Current strategy:

- Backend returns HTTP errors.
- Services expose HTTP responses.
- Components display user feedback.

Global HTTP error handling is implemented through interceptors when appropriate.

---

# Integration Principles

The frontend should:

- Consume existing endpoints.
- Never duplicate business rules.
- Never bypass backend validation.
- Never infer ownership.
- Keep API communication inside services.

---

# Future Evolution

Future improvements may include:

- Refresh Tokens
- Automatic token renewal
- Global error mapping
- Request retry strategy
- Offline support
- API caching

These features should extend the current integration strategy.

---

# References

Related documentation:

- PROJECT.md
- ARCHITECTURE.md
- STANDARDS.md
- DECISION_LOG.md

Backend documentation:

- Backend API.md

End of document.