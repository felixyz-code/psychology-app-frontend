# Roadmap

> Development roadmap for the Psychology Management System Frontend.

---

# Purpose

This document describes the current development status of the frontend, upcoming milestones and the long-term product vision.

It is not intended to replace the project backlog.

---

# Current Status

Current phase:

```text
MVP Development
```

Current priorities:

* Frontend stabilization
* UI refinement
* Backend integration
* Reusable components
* Documentation standardization

Latest completed sprint:

```text
Sprint 17.4 - Test Suite Baseline Fix
```

Phase 3 progress:

```text
Completed - Reports foundation generalized for multiple professional reports
```

RC.FE.1 status:

```text
Completed - FE-RC-001 closed with centralized CSV formula injection hardening in ReportsExportService
```

RC.FE.2 status:

```text
Completed - UTF-8/BOM compatibility added to CSV exports for Microsoft Excel without changing PDF, UI or contracts
```

RC.FE.3.1 status:

```text
Completed - Authentication and session regression baseline closed with validated AuthStore restoration hardening
```

RC.FE.3.2 status:

```text
Pending - Clinical core regression
```

RC.FE.3.3 status:

```text
Pending - Operational and reporting regression
```

RC.FE.3.4 status:

```text
Pending - CI gate
```

---

# Completed Milestones

## Core Infrastructure

* Angular application initialized
* Standalone Components
* Angular Signals
* Global routing
* Authentication infrastructure
* Application shell
* Theme configuration

---

## Clinical Modules

### Authentication

* Login
* JWT integration
* AuthStore
* Route guards
* HTTP interceptor

### Patients

* List
* Create
* Edit
* Detail
* Sprint 11.2 completed - Global page baseline aligned with the shared header and spacing rhythm used across the main modules
* Sprint 11.3 completed - Primary CTA moved to the shared page header and table actions remain aligned with the common action language
* Sprint 11.4 completed - Row actions, tooltips, loading states and table density aligned more closely with the shared list system
* Sprint 13.4 completed - Global patients list now feels visually closer to Dashboard with a more executive hero, compact summary strip, refined toolbar, more polished states and a stronger final table presentation without changing CRUD behavior
* Sprint 13.5 completed - Patient dialogs now share a more mature visual baseline, and the Patients module is considered closed at the UI/UX level for the current MVP scope

### Case Files

* Detail
* Create
* Edit
* Global foundation route `/case-files`
* Sprint 10.6 completed - Clinical Workspace closure documented with aggregated workspace endpoint, timeline scope decision and registered technical debt
* Sprint 10.10 completed - Case Files foundation delivered with lazy routing, sidebar navigation, professional base list, patient context access and no new backend contract assumptions
* Sprint 11.2 completed - Header, summary spacing and main content rhythm aligned with the shared page baseline
* Sprint 11.3 completed - Secondary header action and case-file iconography aligned with the common action language
* Sprint 11.4 completed - Table actions, loading/empty states and list density refined to match the shared data-table baseline
* Sprint 11.6B completed - Case file form now follows the shared form rhythm more closely and the create/edit workspace action now reflects case-file availability correctly
* Clinical Workspace documentation delivered - patient-centered cross-feature workflow is now documented as part of the technical source of truth

### Session Notes

* List
* Create
* Edit
* Detail
* Delete
* Sprint 7.4 completed - Data table pattern applied to the Session Notes block inside patient detail dialog
* Sprint 11.6B completed - Session note dialog now aligns more closely with the shared form spacing and long-form reading rhythm

### Documents

* List
* Upload
* Preview
* Download
* Delete
* Metadata edit
* Sprint 7.5 completed - Data table pattern applied to the Documents block inside patient detail dialog
* Sprint 10.9 completed - Documents table simplified for end users and technical metadata moved to a reusable detail modal
* Sprint 11.2 completed - Global documents page and list spacing aligned with the shared page baseline
* Sprint 11.3 completed - Global upload CTA moved to the page header and document row actions now follow a clearer action order and icon semantics
* Sprint 11.4 completed - Document row actions, tooltips and table states now follow the same action hierarchy and visual density as the other operational lists
* Sprint 11.6A completed - Document modal wrappers now align more closely with the shared dialog header/footer baseline without changing embedded form internals
* Sprint 11.6B completed - Embedded upload and metadata forms now share a more consistent internal form spacing baseline with the rest of the product
* Sprint 12.3A completed - Global documents list now surfaces the owner patient between `Archivo` and `Tipo` by reusing existing document relations when available and resolving `caseFileId -> patientId -> patient` with existing services otherwise

### Appointments

* List by patient
* Global appointments list
* Calendar view
* Daily agenda view
* Create
* Edit
* Cancel
* Delete
* Three fully functional views: Table, Calendar and Daily Agenda
* Search
* Sorting
* Filters
* Date range
* Sprint 7.3 completed - Data table pattern applied to global appointments list
* Sprint 8.1.1 completed - Global appointments list now includes client-side date range filtering with current-month default range
* Sprint 8.2 completed - Global appointments list now includes a monthly calendar view sharing the same client-side state and CRUD flows
* Sprint 8.3 completed - Global appointments list now includes a daily agenda view sharing the same search, filters, state and CRUD flows
* Sprint 11.2 completed - Global header, toolbar spacing, calendar spacing and agenda spacing aligned with the shared page baseline
* Sprint 11.3 completed - Primary CTA moved to the page header and the toolbar action hierarchy was normalized without changing the manual multi-view workflow
* Sprint 11.4 completed - Table and agenda actions now follow the shared action order, icon-button tooltips and more homogeneous loading and empty states
* Sprint 11.6A completed - Appointment dialog structure now follows the shared dialog header/footer and action hierarchy baseline
* Sprint 11.6B completed - Appointment form layout now follows the shared form spacing baseline and its dialog now uses a scrollable body with a persistently visible footer
* Sprint 13.6 completed - Global appointments list now shares the same level of visual polish as Dashboard and Patients, while appointment dialogs align more clearly with the shared Design System baseline
* The module now provides a stable foundation for future additions such as working hours, availability, drag & drop, reminders and notification integration without requiring major refactors

### Dashboard

* SaaS-style home screen delivered
* Shared metrics, sections and quick actions foundation in production
* Sprint 11.2 completed - Metric rhythm and lower content spacing aligned with the shared page baseline
* Sprint 11.3 completed - Quick appointment action iconography aligned with the shared action language
* Sprint 11.9 completed - Dashboard stabilized as part of the cross-module release candidate closure
* Sprint 13.1 completed - Dashboard ahora funciona como un Executive Overview con snapshot analitico local, view model por widgets, resumen financiero mensual, proximas citas, actividad clinica reciente y alertas operativas minimas sin invadir Reports
* Sprint 13.6 completed - Dashboard refinado como referencia visual del producto para consolidar el cierre del Product Polish cross-module

### Sprint 13

* Sprint 13.1 completed - Dashboard analytics delivered as an Executive Overview with local orchestration and widget-based view model
* Sprint 13.4 completed - Patients List modernized and aligned more closely with the polished Dashboard baseline
* Sprint 13.5 completed - Patients Dialogs aligned with the shared Design System and mature CRUD dialog language
* Sprint 13.6 completed - Appointments List modernized, Appointment Dialogs aligned with the Design System, shared toolbar patterns consolidated and cross-module empty/error/loading states made more consistent
* Sprint 13 closure - Responsive spacing, shared visual language and global UI consistency improved across Dashboard, Patients and Appointments

### Sprint 15

### Completed

- ✓ Sprint 15.2
- ✓ Sprint 15.3
- ✓ Sprint 15.4
- ✓ Sprint 15.5
- ✓ Sprint 15.6
- ✓ Sprint 15.7
- ✓ Sprint 15.8

### Sprint 17

### Completed

- Sprint 17.2 - Global HTTP Error Policy
- Sprint 17.3 - Secure Logging And Sensitive Data Protection
- Sprint 17.4 - Test Suite Baseline Fix

### Sprint 14

### Completed

- Sprint 14.1 - Design System Audit
- Sprint 14.2 - Global Styles & Tokens Cleanup
- Sprint 14.3 - Delete Dialog Baseline Consolidation
- Sprint 14.4 - Detail Dialog Baseline Consolidation (Phase 1)

### Pending

- Sprint 14.5 - Lists & Design System Harmonization

### Financial Transactions

* Global list
* Summary cards
* Filters
* Create
* Edit
* Detail
* Delete
* Sprint 11.2 completed - Summary cards, page spacing and primary content rhythm aligned with the shared page baseline
* Sprint 11.3 completed - Primary movement CTA moved to the page header and finance filters now share a stronger visual action hierarchy
* Sprint 11.4 completed - Manual toolbar, row actions and table feedback states aligned more closely with the shared data-table language
* Sprint 11.6B completed - Financial transaction form now shares the same grouped form rhythm and spacing language as the modal CRUD flows while remaining page-based
* Sprint 12.2 completed - Filters now reuse the shared `FilterToolbar` and the module keeps its visual baseline aligned with the polished reporting surface
* Financial Transactions mantiene formularios basados en pagina; no participaron en Sprint 11.6A al no existir aun un dialog equivalente dentro del flujo actual

### Reports

* Lazy route `/reports`
* Reports catalog foundation
* Financial Report pilot
* Agenda Report
* Clinical Summary
* Clinical Record
* Centralized export infrastructure with conservative `PDF` print and `CSV` download strategy
* Sprint 12.1 completed - Reports feature introduced as a lazy orchestration layer without new backend contracts and with a first professional financial reporting surface
* Sprint 12.2 completed - Financial Report polished with a more document-like preview, stronger export presentation, accessibility refinements and final QA technical validation
* Sprint 12.3 completed - Agenda Report delivered with reusable report orchestration, grouped preview by day, KPI summary, inclusive date ranges and frontend-only export flow
* Sprint 12.4 completed - Resumen Clinico delivered with patient-required execution, clinical preview, workspace-based orchestration, summarized notes, related documents and PDF-first export
* Sprint 12.5 completed - Expediente Clinico delivered as a second patient-centered clinical document with full structured content, PDF-only export and descriptive PDF filenames
* Sprint 12.6 completed - Reports QA hardening delivered with mojibake correction, single error surface in preview, blocked-popup PDF feedback, nomenclatura visible en español consistente y helper compartido para MIME labels
* RC.FE.1 completed - CSV Formula Injection mitigated in the centralized export serializer, covering Financial Report and Agenda Report with protected CSV output and manual Excel validation

### Sprint 11

* Sprint 11.1 completed - Baseline visual consistency established across the application shell and shared surfaces
* Sprint 11.2 completed - Layout consistency aligned across the main operational modules
* Sprint 11.3 completed - Toolbars, CTAs and icon language normalized across pages and workflows
* Sprint 11.4 completed - Tables, list actions and feedback states consolidated around a shared interaction model
* Sprint 11.5 completed - Clinical Workspace visual polish refined the patient-centered detail experience
* Sprint 11.6 completed - Dialog framework consolidated with a shared structural baseline for CRUD modals
* Sprint 11.6B completed - Form layout rhythm unified across dialogs, embedded forms and page-based flows
* Sprint 11.7 completed - Responsive QA stabilized the main user journeys across supported breakpoints
* Sprint 11.8 completed - Final UX micro polish and accessibility basics pass completed
* Sprint 11.9 completed - Frontend declared `RC1` with consistent UI, consolidated design system and stable responsive behavior

### Sprint 7

* Sprint 7 completed - Reusable Data Table Pattern applied across Patients, Appointments, Session Notes and Documents
* Sprint 7.6 completed - Hardening & Polish finalized across the shared layout and Data Table Pattern consistency layer
* Sprint 7.6.2 completed - Mobile sidebar UX polish completed as part of the Layout hardening closure

### Sprint 8

* Sprint 8 started - Productivity improvements on the reusable Data Table Pattern
* Sprint 8.1 completed - Table productivity enhancements delivered across Patients and Appointments
* Sprint 8.1.1 completed - Appointments date range filter and responsive toolbar polish delivered on the global appointments list
* Sprint 8.2 completed - Calendar View delivered for Appointments with shared state, month navigation and monthly visualization
* Sprint 8.3 completed - Daily Agenda delivered for Appointments with shared state, daily navigation and polished responsive agenda cards
* Sprint 8.4 completed - Dashboard delivered as a SaaS-style home screen with primary metrics, upcoming appointments, quick actions, recent activity, responsive behavior and final grid/spacing polish
* Sprint 8.5 completed - Design System foundation extracted from the SaaS Dashboard into reusable shared UI components

Next planned sprint:

```text
To be prioritized after Sprint 17.4
```

---

# Current Focus

Current development efforts include:

* Post-polish QA validation after Sprint 13.6
* Final backend integration verification
* Manual browser validation of dense clinical workflows
* Incremental technical debt reduction after release-candidate closure
* Shared component consolidation where it meaningfully reduces maintenance cost
* Patients remains closed at the UI/UX level after Sprint 13.5, so future work should only reopen it for defects or clearly scoped product changes
* Appointments list and dialogs now share the current visual baseline, so future work should prioritize defects or scoped product additions rather than new polish passes

---

# Short-Term Roadmap

## User Interface

* Professional visual polish
* Responsive improvements
* Loading states
* Empty states
* Better validation feedback

---

## Reusable Components

* Generic Data Table
* Confirmation dialogs
* Form components
* Shared utilities

---

## Quality

* Component testing
* Service testing
* Form validation improvements
* Continued validation of global error handling and secure logging

---

# Medium-Term Roadmap

Potential additions after MVP completion:

* Dashboard improvements
* Search and filtering
* User profile
* Accessibility improvements

---

# Long-Term Vision

The frontend should evolve into a SaaS-ready application.

Potential future features include:

* Organization support
* Multi-specialist interface
* Theme switching
* Internationalization (i18n)
* Progressive Web App (PWA)
* Offline capabilities
* Notification center
* AI-assisted workflows

These features are intentionally outside the current MVP.

---

# Known Technical Debt

Current technical debt includes:

* Shared component extraction
* Design system consolidation
* Automated frontend testing
* Minor visual flicker when closing the child `Editar paciente` dialog from Clinical Workspace
* SCSS budget warnings in `patient-detail-dialog.component.scss`, `dashboard.page.scss`, `appointments-calendar.component.scss`, `patients-list.page.scss`, `appointments-list.page.scss` and `appointments-daily-agenda.component.scss`
* UTF-8/BOM compatibility in CSV exports with Excel resolved in RC.FE.2
* Potential future consolidation of duplicated page titles between `PageHeaderComponent` and some `SectionCardComponent` list shells
* Potential future timeline/backend event coverage for `APPOINTMENT_CANCELLED`, `APPOINTMENT_NO_SHOW` and `CASE_FILE_UPDATED`
* Potential evolution of `SessionNote` toward a more structured clinical schema including motivo, objetivos, intervenciones, observaciones, tareas and plan de siguiente sesion

Technical debt should be addressed incrementally.

---

# Success Criteria

The frontend MVP will be considered complete when:

* All clinical workflows are fully operational.
* Backend integration is complete.
* The UI is consistent and responsive.
* Reusable components are consolidated.
* Documentation is complete.
* The application is ready for production use by an independent psychologist.

---

# References

Related documentation:

* PROJECT.md
* ARCHITECTURE.md
* STANDARDS.md
* CLINICAL_WORKSPACE.md
* API_INTEGRATION.md
* DECISION_LOG.md

End of document.




