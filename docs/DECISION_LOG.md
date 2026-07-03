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

# ADR-012 - Responsive Filter Toolbar Layout

## Decision

Dense filter toolbars use a shared responsive layout pattern.

Desktop:

- Primary filters align in a first row with comfortable control widths.
- Secondary filters and action buttons align in a second row.
- Action buttons remain naturally aligned at the end of the toolbar.

Mobile:

- Each control occupies its own row using the full available width.

## Rationale

This rule improves consistency across data-heavy experiences and avoids compressed controls, truncated labels and poor readability.

It establishes a reusable UX baseline for future views such as Patients, Appointments, Finance, Documents, Recruitment and Reports.

---

# ADR-013 - Clinical Timeline Scope

## Decision

The Clinical Workspace timeline represents clinical history and does not include appointments in `SCHEDULED` status.

Scheduled appointments remain visible through:

- summary and next appointment indicators
- the workspace appointments section
- calendar and agenda views

## Rationale

The timeline is intended to highlight completed or clinically meaningful records instead of duplicating scheduling views.

This keeps the workspace easier to scan and avoids mixing future agenda items with historical events.

## Pending Evaluation

Future product review should decide:

- whether `CANCELLED` appointments belong in the timeline
- whether `NO_SHOW` appointments belong in the timeline
- whether a full appointment status-history timeline is needed

---

# ADR-014 - Shared Dialog And Form Layout Pattern

## Decision

Dialogs and dense CRUD forms use a shared visual layout pattern based on reusable CSS classes such as:

- `app-dialog`
- `app-dialog__header`
- `app-dialog__actions`
- `app-form`
- `app-form-grid`
- `app-form-section`

When a dialog can become vertically dense, the preferred structure is:

- header visually anchored at the top
- scrollable form body when needed
- footer actions kept outside the scrollable region whenever possible

## Rationale

This rule reduces repeated one-off spacing fixes across Patients, Appointments, Case Files, Session Notes, Documents and Finance.

It also creates a safer baseline for modal usability on constrained heights by keeping primary actions visible or predictably reachable.

## Implications

- New CRUD dialogs should start from the shared `app-dialog` and `app-form` vocabulary before introducing local layout rules.
- Local overrides remain acceptable for especially dense dialogs such as Appointments and Case Files, but should preserve the shared action hierarchy and visual rhythm.
- Cross-device dialog validation remains important because compact desktop dialogs and short mobile viewports can still require component-level height tuning.

---

# ADR-015 - Reports Module As Orchestration Layer

## Decision

The new `reports` feature is implemented as a lazy-loaded orchestration module.

It owns:

- report catalog
- report filters
- preview surfaces
- export actions

It does not own:

- financial business logic
- report-specific backend rules
- direct HTTP contracts outside the owning feature service

## Rationale

This keeps the application aligned with the feature-based and backend-first architecture.

It also allows the product to introduce professional reporting UX without creating a parallel business layer or moving logic away from the modules that already own it.

## Initial Scope

The first delivered pilot was `Financial Report`.

Current orchestration:

- `ReportsRunnerService` calls `FinancialTransactionsService.findSummary(...)`
- `ReportsRunnerService` calls `FinancialTransactionsService.findAll(...)`
- `ReportsExportService` centralizes conservative export strategies using controlled print for `PDF` and `CSV` download for spreadsheet workflows

## Implications

- New reports should prefer consuming existing feature-owned services before requesting new backend contracts.
- If a future report becomes too expensive or too fragmented to compose in the frontend, a dedicated backend aggregate contract should be evaluated.
- Export UX can remain centralized in `reports` even when the data source belongs to another feature.

## Operational Notes After Sprint 12.2

- The Financial Report pilot completed technical validation and was approved with partial visual QA still blocked in local environments that require authentication and do not expose a ready browser session.
- The current `PDF` export strategy remains intentionally conservative: if the browser blocks the popup used for controlled print, the app fails safely without crashing, but it does not yet surface explicit user feedback for that condition.

## Operational Notes After Sprint 12.3

- `Reports` now proves its reusable scope beyond the initial pilot by delivering a second professional surface: `Agenda Report`.
- The frontend continues to avoid dedicated report endpoints; the agenda report is composed from `AppointmentsService` and `PatientsService` without moving business ownership away from `appointments`.

## Operational Notes After Sprint 12.3.1

- `Reports` is now treated as reusable multi-report infrastructure with stable internal layers for catalog, runner, preview and export.
- `ReportKey` now formally supports `Financial` and `Agenda`.
- The report preview shell now supports tabular and grouped surfaces without introducing report-owned business rules.

---

# ADR-016 - Inclusive Local Date Semantics For Reports

## Decision

Report date ranges use inclusive semantics from the user perspective.

Current rule:

- `from` means start of the selected local day
- `to` means the end of the selected day through an exclusive comparison against the start of the next local day
- `date-only` values must be parsed locally and never through `new Date('YYYY-MM-DD')`

## Rationale

This avoids timezone drift, keeps the visible range aligned with the filter inputs and ensures that preview, `PDF` and `CSV` operate over the same effective dataset.

## Implications

- Reports must prefer local date parsing helpers for `date-only` values.
- Inclusive range behavior should remain centralized in report orchestration utilities instead of being reimplemented ad hoc in each report.

---

# ADR-017 - Full-Month Default Range For Reports

## Decision

The default reporting range covers the full current month:

- first day of the current month
- last day of the current month

## Rationale

This better matches the expected behavior of professional monthly reporting and creates a more representative default preview when the user first opens a report.

## Implications

- The default visible inputs, preview context and exported dataset should all reflect the same complete monthly window.
- Future reports should preserve this monthly default unless a report-specific reason requires a different baseline.

---

# ADR-018 - Shared Inclusive Date Range Helper

## Decision

The logic for interpreting `date-only` values and building inclusive local date ranges is centralized in:

```text
shared/utils/local-date-range.ts
```

All modules that filter by dates should reuse this helper instead of implementing local parsing or relying on:

```ts
new Date('YYYY-MM-DD')
```

## Rationale

This guarantees consistent behavior across modules that filter by dates and avoids timezone-related issues caused by UTC parsing of `date-only` strings.

It also reduces duplicated logic and lowers the risk of regressions when date range semantics evolve.

## Implications

- Reports and Financial Transactions now share the same local inclusive range construction.
- Future modules with date filters should depend on the shared helper to preserve functional consistency.
- The frontend should continue treating `from` as the local start of the selected day and `to` as the exclusive start of the next local day.

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
