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
- FinancialTransactionsService

Services encapsulate HTTP communication.

Components should never call HttpClient directly.

## Reports Integration

The `reports` feature does not introduce dedicated backend report endpoints.

Current integration rules:

- reports consume existing feature-owned services only
- `ReportsRunnerService` orchestrates report loading without bypassing feature ownership
- the financial report uses `FinancialTransactionsService.findSummary(...)` and `FinancialTransactionsService.findAll(...)`
- the agenda report uses `AppointmentsService.getAppointments()` and `PatientsService.getPatients()` with client-side orchestration only
- the clinical summary report uses `PatientsService.getPatientById(...)` and `CaseFilesService.getWorkspace(caseFileId)` with a patient-centered orchestration flow
- the clinical record report uses `PatientsService.getPatientById(...)`, `CaseFilesService.getCaseFileByPatientId(...)` and `CaseFilesService.getWorkspace(caseFileId)` with a patient-centered orchestration flow
- the current reports engine supports `Financial Report`, `Agenda Report`, `Clinical Summary` and `Clinical Record`
- date-only filters are parsed locally and applied with inclusive user semantics when the report flow requires client-side range orchestration
- export generation is currently client-side for `PDF` print output and `CSV` download output

This allows the frontend to deliver a first reporting layer without creating new contracts or duplicating backend rules.

## Clinical Summary Report Integration

The `Clinical Summary` report reuses existing clinical services and does not introduce a report-specific backend contract.

Current integration rules:

- the report requires a selected patient as its primary entry context
- `PatientsService.getPatientById(patientId)` resolves the anchor patient shown in the report
- `CaseFilesService.getCaseFileByPatientId(patientId)` resolves the related case file when available
- `CaseFilesService.getWorkspace(caseFileId)` provides the aggregated clinical source for summary, appointments, session notes, documents and timeline
- frontend mapping remains presentational only for KPI copy, timeline labels, summarized notes and document display labels
- `PDF` is the primary export surface for this clinical document flow

This keeps the report aligned with the patient-centered clinical workspace and avoids duplicating backend clinical logic.

## Clinical Record Report Integration

The `Clinical Record` report reuses existing clinical services and does not introduce a report-specific backend contract.

Current integration rules:

- the report requires a selected patient as its primary entry context
- `PatientsService.getPatientById(patientId)` resolves the anchor patient shown in the report
- `CaseFilesService.getCaseFileByPatientId(patientId)` resolves the related case file when available
- `CaseFilesService.getWorkspace(caseFileId)` provides the aggregated clinical source for case file, appointments, session notes, documents and timeline
- frontend mapping remains presentational only for status labels, timeline labels, readable document types and export filename composition
- `PDF` is the primary export surface for this clinical document flow and `CSV` is intentionally not exposed

This keeps the report aligned with the patient-centered clinical workspace and avoids duplicating backend clinical logic while differentiating it from the more executive `Clinical Summary`.

## Clinical Workspace Aggregated Endpoint

The Clinical Workspace now prefers a single aggregated backend contract whenever a `caseFileId` is available.

Primary endpoint:

```text
GET /case-files/:id/workspace
```

This endpoint replaces the previous frontend-first manual composition of:

- appointments
- sessionNotes
- documents
- caseFile
- patient
- timeline

Current integration rules:

- `CaseFilesService.getWorkspace(caseFileId)` is the primary entry point for the workspace
- backend-provided `summary` is consumed directly when available
- backend-provided `timeline` is consumed directly when available
- manual orchestration remains only as a fallback when the UI still starts from patient context without a resolved `caseFileId`

This keeps the frontend aligned with the backend-first architecture and avoids reconstructing clinical state in the client.

## Documents Global List Patient Resolution

The global `/documents` list keeps `DocumentsService.getAll()` as its primary source.

Current integration rules:

- the frontend does not require a new backend endpoint to show the document owner patient in the global list
- when the document payload already includes `patient`, `caseFile.patient` or `patientId`, the UI reuses that data directly
- when the global list only includes `caseFileId`, the UI resolves the patient name by combining existing `CaseFilesService.getCaseFiles()` and `PatientsService.getPatients()` data
- this resolution is presentational only and does not introduce ownership rules, new persistence logic or backend contract changes
- documents without a resolvable patient relation must show a clear fallback label in the UI

This keeps the Documents module aligned with the backend-first architecture while still surfacing the patient context needed by the global operational list.

---

# File Upload Strategy

Documents are uploaded using:

```text
POST /documents/upload
```

Current implementation:

- multipart/form-data
- `file`
- `caseFileId`
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
