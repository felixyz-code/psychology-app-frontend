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
* Reactive Forms
* Angular Material
* Angular CDK
* RxJS

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
├── tenant-context/
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
organization-administration/
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

## Organization Administration Module

`organization-administration` is a lazy feature for the currently confirmed
tenant. It owns organization detail, editable identity fields and the
`ACTIVE`/`SUSPENDED` lifecycle UX. Its form and request state remain page-local;
`TenantContextStore` remains the only global tenant authority.

All organization requests capture the selected organization through
`TENANT_REQUIRED` request metadata. Successful mutations adopt the canonical
backend response and force a fresh V1 tenant-context synchronization for the
same organization and switch generation. Canonical detail responses also
trigger synchronization when their lifecycle status differs from the current
V1 snapshot. While that mismatch is unresolved, operational navigation and
actions fail closed, without synthesizing capabilities or lifecycle state in
the frontend. The feature does not own membership, invitation,
ownership-transfer, signup or organization-creation workflows.

## Reports Module

The frontend now includes a lazy-loaded `reports` feature.

Current characteristics:

* `reports` now works as a reusable reporting engine for the frontend
* current internal layers are `Catalog`, `Runner`, `Preview` and `Export`
* `reports` owns report navigation, catalog, filters, preview and export UX
* individual business features remain owners of their own data services
* `reports` does not own financial business logic, appointments business logic or dedicated backend reporting rules
* report execution is orchestrated through feature-owned services instead of direct `HttpClient` calls
* current delivered reports are `Financial Report`, `Agenda Report`, `Clinical Summary` and `Clinical Record`
* `ReportPreviewShell` supports tabular, grouped and `clinical` preview strategies
* `previewMode: clinical` is used for patient-centered clinical documents with narrative sections, timeline, summarized notes, complete notes and related documents
* export infrastructure is centralized in the `reports` feature while data ownership remains in the source feature
* CSV exports prepend a UTF-8 BOM for Excel compatibility while keeping the `text/csv;charset=utf-8` MIME type and existing formula protection
* `ReportResult` now includes `pdfFileName` so each report can provide a descriptive export filename without changing the shared print-based `PDF` flow
* a small `report-formatters` utility now centralizes presentational helpers such as readable MIME labels for report-owned clinical document surfaces
* recent hardening keeps error presentation centralized in `ReportPreviewShell` and preserves explicit frontend feedback when `PDF` popup opening is blocked by the browser

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

Operational children additionally require `activeTenantGuard`. A confirmed
`ADMIN_SUSPENDED_CONTEXT` is redirected to `/organization-administration`,
whose route requires the server-projected `organization.read` capability.
Operational children are also redirected there while a canonical lifecycle
mismatch is awaiting V1 synchronization. `organization.manage` controls
identity and lifecycle actions, while the backend remains authoritative for
every request.

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

## Cross-Tenant State Invalidation

`TenantContextStore` remains the single owner of `switchGeneration` and emits an explicit invalidation event whenever confirmed tenant state is abandoned.

Current isolation responsibilities are:

* `TenantContextStore` clears the confirmed organization, context snapshot, capabilities, errors and persisted session hint before resolving a replacement tenant
* `TenantStateInvalidationCoordinator` closes Angular Material dialogs and leaves tenant-aware routes during switch or unsafe context recovery; confirmed suspension redirects operational routes to the suspended-safe organization administration surface
* `tenantStateInterceptor` captures the request generation, organization and context version for every `TENANT_REQUIRED` request, then cancels or discards work after the tenant identity becomes stale
* an operational `403` triggers one coalesced V1 context refresh for the captured tenant; only the canonical refresh result can confirm access loss
* organization lifecycle reconciliation starts a distinct forced V1 refresh, superseding any pre-commit refresh for the same tenant; a lifecycle mismatch keeps operational routes and navigation fail-closed until synchronization succeeds or the tenant changes
* the main layout removes its routed tenant surface whenever no confirmed context is ready

Feature services remain stateless HTTP adapters. Tenant data, filters, forms and selections are route- or dialog-scoped and are discarded when the coordinator leaves the invalid route or closes overlays.

Organization Administration applies the same rule: a switch closes its
lifecycle dialog, destroys the old form route and prevents late detail or
mutation responses from publishing into the replacement tenant.

Settings and Branding drafts are additionally owned by the selected
organization and switch generation. A scope change immediately resets their
reactive forms to a neutral state, and only canonical responses tagged with the
current scope may populate them. The affected form is disabled while its PATCH
is pending. A successful PATCH or 409 reconciliation GET replaces the form with
the exact canonical response; a failed reconciliation hides the stale draft and
requires a successful reload before another save is allowed.

Protected organization logo presentation follows the same tenant-generation
ownership rule through `OrganizationLogoStore`. The store owns canonical
`ABSENT`/`PRESENT` metadata, selected-file and mutation state, and the only
runtime object URL used by the UI. Metadata and protected bytes are loaded
through tenant-required HTTP requests. A tenant change immediately revokes the
current object URL and clears all logo state; request-version plus
`switchGeneration` checks prevent late metadata, content, upload, delete, or
conflict-reconciliation responses from publishing under another tenant. Logo
bytes and object URLs are never persisted.

This mechanism does not add a second generation system, a tenant data cache, or browser persistence.

Capability denial remains distinct from tenant loss: the confirmed tenant surface stays mounted while operational revalidation is pending, and when V1 still confirms the active tenant, the original `403` reaches its consumer without erasing route- or dialog-scoped data. Transient refresh failures also remain distinct from confirmed loss; the store retains the last confirmed snapshot without granting any new capability.

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

## Why Angular Material?

To provide a maintained Angular UI foundation while allowing customization through SCSS and shared application styles.

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
