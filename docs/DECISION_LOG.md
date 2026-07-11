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

# ADR-019 - Patient-Centered Clinical Reports And PDF-First Output

## Decision

Clinical reporting in `Reports` remains patient-centered.

Current rules:

- the clinical report entry point requires a selected patient
- the current delivered clinical report is `Clinical Summary`
- the report reuses clinical workspace data instead of introducing a dedicated backend report endpoint
- `PDF` is the primary output for clinical report reading and sharing
- `CSV` is not prioritized for `Clinical Summary`

## Rationale

Clinical summaries are read primarily as narrative and documentary outputs rather than spreadsheet datasets.

Using the patient as the anchor entity keeps the report aligned with the broader clinical workflow already established by the frontend and backend.

Reusing the aggregated workspace contract also avoids duplicating orchestration logic or inventing frontend-owned clinical rules.

## Implications

- Clinical reports should prefer `PatientsService` and `CaseFilesService.getWorkspace(...)` before requesting new contracts.
- Preview surfaces for clinical reports may use a dedicated `previewMode: clinical` when the output behaves more like a document than a table.
- Timeline labels, summarized notes and related documents may be normalized in the frontend as presentation concerns only.
- If a future clinical report needs spreadsheet semantics, that export decision should be evaluated separately instead of assuming `CSV` by default.

---

# ADR-020 - Clinical Record As Structured Clinical Document And Descriptive PDF Filenames

## Decision

`Reports` now supports a second clinical document beyond `Clinical Summary`: `Clinical Record`.

Current rules:

- `Clinical Summary` remains a brief, executive and synthetic document
- `Clinical Record` is a complete, structured and printable clinical document
- both reports remain patient-centered and reuse existing clinical services
- both clinical reports stay `PDF`-first and do not prioritize `CSV`
- `ReportResult` now exposes `pdfFileName` so each report can provide a descriptive filename for print-based `PDF` export

## Rationale

The product needs two distinct clinical reading surfaces:

- one optimized for quick professional review
- one optimized for formal recordkeeping and printable clinical context

At the same time, generic filenames such as `Expediente Clinico.pdf` create friction when several reports are generated in the same session.

Adding a descriptive `pdfFileName` at the report-result level keeps filename ownership close to the report orchestration flow without changing the backend contract or the shared print-based export strategy.

## Implications

- `Clinical Record` should remain a separate report and not a mode flag of `Clinical Summary`
- clinical report filenames should include report type, patient when applicable and date range when available
- when the browser does not fully honor the filename during `window.print()`, the document title and print window title should still use the same descriptive name
- descriptive filenames are a presentation concern and must not require new backend metadata or new endpoints

---

# ADR-021 - Reports Stabilization Before Dashboard Analytics

## Decision

Antes de iniciar una nueva fase funcional orientada a `Dashboard Analytics`, el modulo `Reports` se considera estabilizado mediante una pasada especifica de hardening y cierre tecnico.

El alcance de esta estabilizacion incluye:

- correccion de copy y mojibake visible
- consolidacion de una unica superficie de error en preview
- feedback explicito cuando el popup de `PDF` es bloqueado
- consistencia de nomenclatura visible en espanol
- pequena utilidad compartida para labels legibles de MIME types

## Rationale

`Reports` ya actua como infraestructura reutilizable para multiples documentos y vistas profesionales.

Dejar inconsistencias de copy, errores duplicados o fallas silenciosas en exportacion antes de abrir una nueva fase de producto aumentaria deuda tecnica en una superficie transversal.

La estabilizacion previa reduce riesgo y deja una base mas segura para futuras capacidades analiticas.

## Operational Notes

- La QA navegada completa siguio condicionada por la disponibilidad de una sesion autenticada local reutilizable.
- Aun con esa limitacion, la QA tecnica por codigo y `npm.cmd run build` si pudo completarse satisfactoriamente durante Sprint 12.6.
- La falta de sesion local no invalida el cierre tecnico del sprint, pero si queda registrada como restriccion operativa para validacion UI end-to-end futura.

---

# ADR-022 - Global HTTP Error Policy Through Functional Interceptor

## Decision

HTTP errors are observed by a global functional interceptor that delegates their classification and session-related actions to `HttpErrorPolicyService`.

The interceptor preserves the original error propagation. User-facing messages and feature-level recovery remain owned by the existing flows.

## Rationale

Authentication failures and HTTP error classification are cross-cutting concerns. Centralizing them prevents duplicated authentication cleanup and redirect behavior while preserving feature ownership of UX.

## Implications

- `401` responses from authenticated requests clear the local session and redirect to login.
- Login requests and already anonymous sessions do not trigger a redundant redirect.
- New HTTP consumers inherit the policy without modifying contracts or backend behavior.
- The policy does not log response bodies or replace component-level user feedback.

---

# ADR-023 - Development-Only Safe Logging

## Decision

Application diagnostics use a centralized logging utility that emits only in development.

Permitted development fields are a static operation identifier, numeric HTTP status and sanitized stack frames. Request payloads, HTTP response bodies, PII, clinical content, file metadata and error messages are excluded.

## Rationale

Clinical data and personal information must not reach browser logs or future production logging sinks. A narrow logger retains useful debugging context without serializing sensitive data.

## Implications

- Production does not emit application diagnostic logs through this utility.
- New application error logs must use the centralized utility rather than direct `console.*` calls.
- External observability platforms remain outside the current scope and must apply the same data-minimization policy if introduced later.

---

# ADR-024 - Centralized CSV Formula Neutralization For Spreadsheet Exports

## Decision

CSV exports in `Reports` neutralize spreadsheet formulas centrally inside the CSV serialiser before structural CSV escaping.

Current rule:

- text cells that begin with a dangerous formula prefix after leading whitespace or control characters receive a real tab prefix
- the neutralization happens before quote escaping and CSV wrapping
- the preserved tab becomes part of the exported CSV value, but the data model and PDF exports remain unchanged
- this protection applies to human-readable spreadsheet workflows, not to stored data

## Rationale

Spreadsheet applications may interpret exported text as formulas when a cell begins with `=`, `+`, `-`, `@` or a Unicode equivalent.

Centralizing the neutralization in the exporter keeps the protection consistent for every CSV report without duplicating logic in individual report builders.

Using a real tab is a conservative mitigation that keeps the exported value visible as text while avoiding changes to PDF or backend contracts.

## Implications

- new CSV report surfaces should reuse the same central serializer
- formula detection must continue to consider leading spaces, tabs and line breaks before the first effective character
- CSV exports remain suitable for manual spreadsheet review, but the tab prefix is part of the exported file content
- data stored by the application is not altered by this presentation-layer protection

---

# ADR-025 - UTF-8 BOM For Excel Compatibility In CSV Exports

## Decision

CSV exports in `Reports` keep `text/csv;charset=utf-8` as their MIME type and prepend a UTF-8 BOM to the exported file content.

The frontend does not migrate report exports to `XLSX`.

## Rationale

Microsoft Excel on Windows can misinterpret UTF-8 CSV files without a BOM when they are opened directly. Adding the BOM preserves the current CSV workflow while improving compatibility for end users.

Keeping CSV avoids introducing a heavier export format that is unnecessary for the current release candidate scope.

## Implications

- CSV remains the export format for `Financial Report` and `Agenda Report`.
- Formula hardening from `ADR-024` remains in place and is not replaced by the BOM decision.
- The export strategy stays conservative and aligned with the existing reports architecture.

---

# ADR-026 - Development Branch Release Certification

## Decision

The `development` branch must pass the frontend release certification workflow before an integration is considered valid.

The required automated checks are:

- dependency installation with `npm ci`
- complete unit test suite
- production Angular build
- Docker image build

## Rationale

`development` is the integration branch for release-candidate work. Requiring the same cross-cutting validation on pushes and pull requests reduces the risk of accepting regressions that only appear after local testing.

This keeps release infrastructure aligned with the regression hardening completed during RC.FE.3 and makes the CI gate an explicit part of the frontend baseline instead of an optional manual step.

## Implications

- Changes targeting `development` should be treated as invalid when the certification workflow fails.
- The workflow must fail on unit test, Angular build or Docker build errors.
- Deployment, image publication and repository protection changes remain separate operational decisions.

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
