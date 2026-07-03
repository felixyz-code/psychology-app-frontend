# Architecture

> Frontend architecture for the Psychology Management System.

---

# Purpose

This document describes the frontend architecture and explains how the different application layers interact.

It documents:

* Angular architecture
* Project structure
* Routing strategy
* State management
* Layout organization
* Theme organization
* Design decisions

Business rules are documented in `PROJECT.md`.

Backend integration is documented in `API_INTEGRATION.md`.

Development conventions are documented in `STANDARDS.md`.

---

# Overview

The frontend is built with Angular using Standalone Components and a feature-based architecture.

The application consumes an existing NestJS backend and follows a **backend-first** philosophy, where business rules remain on the server and the frontend is responsible for presentation, interaction and user experience.

Main architectural principles:

* Standalone Components
* Feature-based organization
* Angular Signals
* Lazy-loaded routes
* Reusable UI components
* Backend as source of truth

---

# Technology Stack

Current technologies:

* Angular 21
* TypeScript
* SCSS
* Angular Signals
* Angular Router
* HttpClient
* CoreUI
* Bootstrap
* Angular Material (where appropriate)

---

# High-Level Structure

```text
src/
│
├── app/
│   ├── core/
│   ├── features/
│   ├── shared/
│   ├── app.config.ts
│   └── app.routes.ts
│
├── environments/
└── styles.scss
```

---

# Core Layer

The `core` layer contains application-wide functionality.

Current structure:

```text
core/
├── auth/
├── guards/
├── interceptors/
├── layout/
└── theme/
```

Responsibilities:

* Authentication
* Authorization
* Route protection
* HTTP interception
* Application shell
* Global theme configuration

---

# Shared Layer

The `shared` layer contains reusable building blocks.

Current structure:

```text
shared/
├── components/
├── models/
└── utils/
```

Responsibilities:

* Reusable UI components
* Shared models
* Utility functions
* Generic presentation logic

Shared components should not contain business logic.

---

# Features Layer

Business functionality is organized by domain.

Current modules:

```text
features/

dashboard/
patients/
case-files/
session-notes/
documents/
appointments/
financial-transactions/
reports/
```

Each feature owns:

* Pages
* Components
* Models
* Services
* Dialogs
* Feature-specific logic

Dependencies between features should be minimized.

Cross-feature workflows should be composed from existing feature ownership boundaries instead of creating a parallel domain layer.

## Reports Module

The frontend now includes a lazy-loaded `reports` feature.

Current characteristics:

* `reports` owns report navigation, catalog, filters, preview and export UX
* individual business features remain owners of their own data services
* report execution is orchestrated through feature-owned services instead of direct `HttpClient` calls
* the first delivered pilot is the `Financial Report`
* export infrastructure is centralized in the `reports` feature while data ownership remains in the source feature

This keeps the architecture aligned with the backend-first principle and avoids creating a parallel business domain for reporting.

---

# Clinical Workspace Composition

The current frontend includes a patient-centered `Clinical Workspace`.

This workspace is implemented as a composed detail surface that orchestrates existing features around one patient context.

Current characteristics:

* Implemented through `PatientDetailDialogComponent`
* Reached from both `patients` and `case-files`
* Uses shared presentational components from `shared/components`
* Reuses existing feature dialogs for create, edit and delete flows
* Loads feature data through feature-owned services only

This is intentionally an orchestration pattern and not a new business module.

Detailed behavior is documented in `CLINICAL_WORKSPACE.md`.

---

# Routing Strategy

Routing is centralized in `app.routes.ts`.

Main principles:

* Standalone Components
* Lazy loading where appropriate
* Guards for protected routes
* Feature isolation

Authentication is required before accessing protected areas.

---

# State Management

The application uses Angular Signals for local and application state.

Current state responsibilities include:

* Authentication state
* Current user
* Loading indicators
* UI state

Business data continues to be provided by the backend.

NgRx is intentionally not used.

---

# Layout Architecture

The application layout is composed of reusable structural components.

Current layout includes:

* Application shell
* Navbar
* Sidebar
* Header
* Content area

The layout is independent from business features.

---

# Theme Architecture

Global styling is centralized through the `theme` layer.

Responsibilities include:

* Global variables
* Typography
* Colors
* Layout spacing
* Shared styles

Feature-specific styling remains inside each feature.

---

# Backend Integration

The frontend never duplicates backend business rules.

Responsibilities:

Frontend

* UI
* Navigation
* Forms
* Client-side validation
* User interaction

Backend

* Authentication
* Authorization
* Ownership
* Business rules
* Data persistence

---

# Design Decisions

## Why Standalone Components?

To reduce module complexity and improve scalability.

---

## Why Feature-Based Organization?

To keep business domains isolated and maintainable.

---

## Why Angular Signals?

To simplify state management without introducing NgRx.

---

## Why Backend-First?

To keep business rules centralized and avoid duplicated logic.

---

## Why CoreUI?

To accelerate development with a professional UI foundation while allowing customization through SCSS.

---

# Future Evolution

Future architecture may include:

* Feature libraries
* Shared design system
* Theme switching
* Internationalization
* Offline support
* Progressive Web App
* Performance optimizations

These features should extend the existing architecture without changing its foundations.

---

# References

Related documentation:

* PROJECT.md
* STANDARDS.md
* CLINICAL_WORKSPACE.md
* API_INTEGRATION.md
* DECISION_LOG.md
* ROADMAP.md

End of document.
