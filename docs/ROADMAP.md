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
Sprint 10.7 - Documents Modal Forms UX
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

### Case Files

* Detail
* Create
* Edit

### Session Notes

* List
* Create
* Edit
* Detail
* Delete
* Sprint 7.4 completed - Data table pattern applied to the Session Notes block inside patient detail dialog

### Documents

* List
* Upload
* Preview
* Download
* Delete
* Metadata edit
* Sprint 7.5 completed - Data table pattern applied to the Documents block inside patient detail dialog

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
* The module now provides a stable foundation for future additions such as working hours, availability, drag & drop, reminders and notification integration without requiring major refactors

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
Sprint 10.0 - Financial Transactions Continuation
```

---

# Current Focus

Current development efforts include:

* UI polish
* Reusable components
* Data table improvements
* User experience refinement
* Frontend architecture stabilization

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

* UI consistency refinements
* Shared component extraction
* Design system consolidation
* Automated frontend testing

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
* API_INTEGRATION.md
* DECISION_LOG.md

End of document.
