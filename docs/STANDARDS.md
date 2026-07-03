# Standards

> Development standards for the Psychology Management System Frontend.

---

# Purpose

This document defines the coding standards and architectural conventions used throughout the Angular frontend.

All new code should follow these standards unless there is a documented architectural reason not to.

---

# General Principles

The frontend should be:

* Simple
* Consistent
* Reusable
* Maintainable
* Scalable

Whenever possible:

* Prefer composition over duplication.
* Prefer reusable components.
* Keep business logic out of UI components.
* Keep the backend as the source of truth.

---

# Angular Standards

## Standalone Components

Standalone Components are the default architecture.

NgModules should not be introduced unless technically required.

---

## Dependency Injection

Prefer the functional API:

```ts
inject(Service)
```

instead of constructor injection when appropriate.

---

## Routing

Routing should be centralized.

Guidelines:

* Use lazy loading whenever appropriate.
* Protect private routes with guards.
* Keep feature routes isolated.

---

# State Management

Angular Signals are the official state management solution.

Current responsibilities include:

* Authentication state
* Current user
* Loading indicators
* UI state

NgRx is intentionally not used.

---

# Feature Organization

Business functionality belongs inside:

```text
features/
```

Each feature should own:

* Pages
* Components
* Services
* Models
* Dialogs

Features should remain independent whenever possible.

---

# Shared Components

Reusable components belong in:

```text
shared/components/
```

Shared components:

* Must be reusable.
* Must not depend on business domains.
* Must avoid feature-specific logic.

---

# Layout Components

Application structure belongs in:

```text
core/layout/
```

Examples:

* Navbar
* Sidebar
* Shell
* Header

Layout components should never contain business logic.

---

# Services

Every feature owns its own HTTP service.

Components should never communicate directly with HttpClient.

Responsibilities:

* API communication
* Data transformation
* HTTP error propagation

Business rules remain on the backend.

---

# Forms

Reactive Forms are the project standard.

Guidelines:

* Strong typing
* Validation
* Reusable form components
* No duplicated validation logic

Client validation improves UX but never replaces backend validation.

---

# Dialog Pattern

CRUD operations should use reusable dialogs whenever appropriate.

Examples:

* Create
* Edit
* Detail
* Confirmation

Dialogs should preserve navigation context.

Cross-feature detail workspaces may use dialogs when they consolidate an existing workflow without requiring a dedicated route.

The current reference example is documented in `CLINICAL_WORKSPACE.md`.

---

# Clinical Workspace Pattern

When a feature contributes to the Clinical Workspace:

* Keep the patient context as the top-level anchor
* Load related data through the owning feature service
* Treat missing optional data as an empty state when the backend contract allows it
* Reuse shared cards, badges, timelines and empty states before creating new primitives
* Reuse existing create, edit and delete dialogs instead of embedding full forms into the workspace shell

The Clinical Workspace should remain an orchestration layer.

It must not become a place for frontend-owned business logic.

---

# Styling

SCSS is the standard styling language.

Guidelines:

* Feature-specific styles remain inside the feature.
* Global styles belong in the theme.
* Avoid duplicated CSS.
* Prefer reusable utility classes.

---

# Naming Conventions

Files:

* kebab-case

Classes:

* PascalCase

Interfaces:

* PascalCase

Enums:

* PascalCase

Variables:

* camelCase

Methods:

* camelCase

Constants:

* UPPER_SNAKE_CASE when appropriate.

---

# Backend Integration

The frontend should:

* Consume existing endpoints.
* Never duplicate business rules.
* Never implement ownership validation.
* Never hardcode API URLs.
* Keep HTTP communication inside services.

---

# Reusable Components

Reusable components should:

* Receive data through Inputs.
* Emit events through Outputs.
* Avoid direct backend communication.
* Avoid domain-specific behavior.

---

# Performance

General guidelines:

* Prefer Signals.
* Lazy load features.
* Avoid unnecessary change detection.
* Reuse components whenever possible.

Optimization should not reduce code readability.

---

# Testing

New code should be written with testability in mind.

Guidelines:

* Small components.
* Pure utility functions.
* Isolated services.
* Predictable state.

---

# References

Related documentation:

* PROJECT.md
* ARCHITECTURE.md
* CLINICAL_WORKSPACE.md
* API_INTEGRATION.md
* DECISION_LOG.md
* ROADMAP.md

End of document.
