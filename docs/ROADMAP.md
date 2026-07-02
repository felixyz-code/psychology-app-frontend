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
Sprint 11.8 - Final UX Micro Polish & Accessibility Basics
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
* The module now provides a stable foundation for future additions such as working hours, availability, drag & drop, reminders and notification integration without requiring major refactors

### Dashboard

* SaaS-style home screen delivered
* Shared metrics, sections and quick actions foundation in production
* Sprint 11.2 completed - Metric rhythm and lower content spacing aligned with the shared page baseline
* Sprint 11.3 completed - Quick appointment action iconography aligned with the shared action language

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
* Financial Transactions mantiene formularios basados en pagina; no participaron en Sprint 11.6A al no existir aun un dialog equivalente dentro del flujo actual

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
To be defined after Sprint 10 manual browser validation and backlog reprioritization
```

---

# Current Focus

Current development efforts include:

* UI polish
* Reusable components
* Data table improvements
* User experience refinement
* Frontend architecture stabilization
* Case Files clinical workspace foundation
* Clinical Workspace documentation consolidation
* Cross-module visual consistency baseline
* Cross-module action language consistency
* Shared dialog framework consolidation
* Shared form layout consolidation through `app-form` and `app-dialog` patterns
* Final UX micro polish and basic accessibility consistency pass
* Final manual validation of the Clinical Workspace checklist in a browser-capable environment
* Incremental consolidation of shared table/list visual primitives

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
* Error handling improvements

---

# Medium-Term Roadmap

Potential additions after MVP completion:

* Dashboard improvements
* Search and filtering
* Reports
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

* Secondary UI consistency refinements after the new shared page baseline
* Remaining dialog/form layout inconsistencies inside embedded document forms and some workspace sections after the dialog framework baseline
* Remaining fine-grained cross-device validation for modal form heights, especially in dense CRUD dialogs such as Appointments and Case Files
* Shared component extraction
* Design system consolidation
* Automated frontend testing
* Minor visual flicker when closing the child `Editar paciente` dialog from Clinical Workspace
* SCSS budget warnings in `patient-detail-dialog.component.scss`, `dashboard.page.scss` and `appointments-calendar.component.scss`
* Potential future consolidation of duplicated page titles between `PageHeaderComponent` and some `SectionCardComponent` list shells
* Remaining dashboard-specific hero personality versus the more neutral baseline used by the other operational modules
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
