# Decision Log

> Architectural Decision Record (ADR) for the Psychology Management System Frontend.

---

# Purpose

This document records the major architectural decisions made during frontend development.

Each decision explains:

- What was decided.
- Why it was chosen.
- What alternatives were considered.
- Future implications.

Minor implementation details should not be documented here.

---

# ADR-001 — Angular as Frontend Framework

## Decision

The frontend uses Angular as its primary framework.

## Rationale

Angular provides:

- Strong architecture
- Excellent TypeScript support
- Standalone Components
- Dependency Injection
- Long-term maintainability

## Alternatives

- React
- Vue

Angular was selected because it better fits an enterprise clinical application.

---

# ADR-002 — Standalone Components

## Decision

The application uses Standalone Components.

## Rationale

Benefits include:

- Reduced module complexity
- Simpler routing
- Better scalability
- Official Angular direction

NgModules are avoided unless strictly required.

---

# ADR-003 — Feature-Based Architecture

## Decision

Business functionality is organized by features.

Current domains include:

- Dashboard
- Patients
- Case Files
- Session Notes
- Documents
- Appointments

## Rationale

Feature isolation improves scalability and maintainability.

---

# ADR-004 — Angular Signals

## Decision

Application state uses Angular Signals.

NgRx is intentionally not used.

## Rationale

Signals provide:

- Simpler state management
- Less boilerplate
- Better readability
- Native Angular solution

---

# ADR-005 — Backend-First Architecture

## Decision

The frontend never owns business rules.

## Rationale

The backend remains responsible for:

- Authentication
- Authorization
- Ownership
- Validation
- Business logic

The frontend focuses on:

- Presentation
- Navigation
- User interaction

---

# ADR-006 — AuthStore

## Decision

Authentication state is centralized in AuthStore.

## Responsibilities

- Current user
- Access token
- Session state

AuthService only performs HTTP communication.

---

# ADR-007 — Functional APIs

## Decision

Modern Angular functional APIs are preferred.

Current examples:

- inject()
- HttpInterceptorFn
- CanActivateFn

Legacy class-based implementations are avoided.

---

# ADR-008 — Reusable Dialog Pattern

## Decision

CRUD forms use reusable dialogs.

Examples:

- PatientFormDialog
- SessionNoteFormDialog
- AppointmentFormDialog

## Rationale

Dialogs preserve navigation context and maximize component reuse.

---

# ADR-009 — Backend Ownership

## Decision

Ownership is always enforced by the backend.

The frontend may temporarily send IDs required by DTOs, but never assumes ownership validation.

---

# ADR-010 — Document Upload Strategy

## Decision

Documents are uploaded exclusively through:

```text
POST /documents/upload
```

Metadata-only creation is intentionally unused.

Uploads use FormData and Blob responses for preview/download.

---

# ADR-011 — Clinical Navigation

## Decision

The patient is the central navigation entity.

Current navigation:

```text
Patient

↓

Case File

↓

Session Notes

↓

Documents

↓

Appointments
```

The UI follows the same clinical workflow implemented by the backend.

---

# Future Decisions

Future ADRs may document decisions regarding:

- Theme system
- Design System
- Internationalization
- PWA
- Offline mode
- Performance optimization
- State management evolution

---

# References

Related documentation:

- PROJECT.md
- ARCHITECTURE.md
- STANDARDS.md
- API_INTEGRATION.md
- ROADMAP.md

End of document.